import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from '../components/PhoneInput';
import toast from 'react-hot-toast';
import { Database } from '../types/supabase';

interface User {
  id: string;
  email: string;
  credits: number;
  gateway_id: string | null;
  sender_names: string[];
}

interface GatewayCredits {
  balance: number;
  currency: string;
}

const sendSMSSchema = z.object({
  sender_id: z.string().min(1, 'Sender is required'),
  recipient: z.string().min(1, 'Recipient is required'),
  message: z.string().min(1, 'Message is required').max(160, 'Message must be less than 160 characters'),
  scheduledFor: z.string().optional(),
});

type SendSMSForm = z.infer<typeof sendSMSSchema>;

export default function SendSMS() {
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No user found');

      const { data, error } = await supabase
        .from('users')
        .select('credits, gateway_id')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      // Get sender names from the gateway
      let senderNames: string[] = [];
      if (data.gateway_id) {
        const { data: gatewayData } = await supabase
          .from('gateways')
          .select('credentials')
          .eq('id', data.gateway_id)
          .single();

        if (gatewayData?.credentials) {
          const credentials = gatewayData.credentials as { sender_names?: string[] };
          senderNames = credentials.sender_names || [];
        }
      }

      return { 
        id: authUser.id, 
        email: authUser.email || '',
        credits: Number(data.credits) || 0,
        gateway_id: data.gateway_id,
        sender_names: senderNames
      };
    }
  });

  const { data: gateway } = useQuery({
    queryKey: ['gateway', user?.gateway_id],
    queryFn: async () => {
      if (!user?.gateway_id) return null;

      const { data, error } = await supabase
        .from('admin/gateways')
        .select(`
          id,
          name,
          provider,
          status,
          credentials
        `)
        .eq('id', user.gateway_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.gateway_id
  });

  const { control, handleSubmit, reset } = useForm<SendSMSForm>({
    resolver: zodResolver(sendSMSSchema),
    defaultValues: {
      sender_id: '',
      recipient: '',
      message: '',
      scheduledFor: undefined,
    },
  });

  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendSMSForm) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: data.sender_id,
            recipient: data.recipient,
            message: data.message,
            scheduled_for: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : null,
            user_id: user?.id,
            status: 'pending',
          } as Database['public']['Tables']['messages']['Insert']);

        if (error) throw error;
        return true;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      toast.success('SMS scheduled successfully');
      reset();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send SMS');
    },
  });

  const onSubmit = async (data: SendSMSForm) => {
    await sendSMSMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-500">Your Credits</h3>
            <p className="text-2xl font-bold text-gray-900">{user?.credits || 0}</p>
          </div>
        </div>
      </div>

      {/* SMS Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <Controller
              name="sender_id"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <label htmlFor="sender_id" className="block text-sm font-medium text-gray-700">
                    Sender ID
                  </label>
                  <select
                    {...field}
                    id="sender_id"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Sender ID</option>
                    {user?.sender_names?.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                </div>
              )}
            />

            <Controller
              name="recipient"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                    Recipient
                  </label>
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    error={error?.message}
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                </div>
              )}
            />

            <Controller
              name="message"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    {...field}
                    id="message"
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                </div>
              )}
            />

            <Controller
              name="scheduledFor"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700">
                    Schedule for (optional)
                  </label>
                  <input
                    {...field}
                    type="datetime-local"
                    id="scheduledFor"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
                </div>
              )}
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}