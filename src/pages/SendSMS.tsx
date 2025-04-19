import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// 1. Update the schema to accept any input format
const testSMSSchema = z.object({
  sender_id: z.string().min(1, 'Sender ID is required'),
  country_code: z.string().optional(), // Make country code optional
  recipient: z.string().min(1, 'Recipient is required'), // Only check it's not empty
  message: z.string().min(1, 'Message is required'),
});

type TestSMSForm = z.infer<typeof testSMSSchema>;

export default function SendSMS() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Get user data including gateway_id and sender_names
  const { data: userData } = useQuery({
    queryKey: ['user-data', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('gateway_id, sender_names')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const { control, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<TestSMSForm>({
    resolver: zodResolver(testSMSSchema),
    defaultValues: {
      country_code: '46'
    }
  });

  const selectedCountryCode = watch('country_code');

  // Update the onSubmit function to handle phone number formatting
  const onSubmit = async (data: TestSMSForm) => {
    try {
      if (!userData?.gateway_id) {
        toast.error('No gateway configured for your account');
        return;
      }

      setLoading(true);

      // Clean up the recipient number (remove spaces, dashes, parentheses)
      let cleanRecipient = data.recipient.replace(/[\s\-\(\)]/g, '');

      // Add country code if not present
      if (!cleanRecipient.startsWith('+')) {
        cleanRecipient = `+${data.country_code}${cleanRecipient}`;
      }

      // Store the formatted number in the database
      const { data: messageData, error: dbError } = await supabase.from('messages').insert({
        gateway_id: userData.gateway_id,
        recipient: cleanRecipient, // Use cleaned number
        message: data.message,
        status: 'pending',
        sender_id: data.sender_id,
        user_id: userId // Make sure user_id is included
      }).select().single();

      if (dbError) throw dbError;

      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No access token found');

      // Send the properly formatted number to the Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gateway_id: userData.gateway_id,
            recipient: cleanRecipient, // Use the formatted number
            message: data.message,
            sender_id: data.sender_id,
            message_id: messageData.id,
          }),
        }
      );

      // Handle response
      const result = await response.json();
      if (!response.ok) {
        console.error('Server error details:', result);
        throw new Error(result.error || 'Failed to send message');
      }

      reset();
      toast.success('Message sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err: any) {
      console.error('Error details:', err);
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Send SMS</h1>
          <p className="mt-2 text-sm text-gray-700">
            Send messages using your configured gateway
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="sender_id" className="block text-sm font-medium text-gray-700">
            Sender ID
          </label>
          <Controller
            name="sender_id"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a sender ID</option>
                {userData?.sender_names?.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.sender_id && (
            <p className="mt-1 text-sm text-red-600">{errors.sender_id.message}</p>
          )}
        </div>

        {/* Replace PhoneInput with a simple input */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
            Recipient Phone Number
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <Controller
              name="country_code"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-20 rounded-l-md border-r-0 bg-gray-50 text-gray-500 sm:text-sm"
                >
                  <option value="46">+46</option>
                  <option value="1">+1</option>
                  <option value="44">+44</option>
                  {/* Add more country codes as needed */}
                </select>
              )}
            />
            <Controller
              name="recipient"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  id="recipient"
                  className="flex-1 rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter phone number in any format"
                  {...field}
                />
              )}
            />
          </div>
          {errors.recipient && (
            <p className="mt-1 text-sm text-red-600">
              {errors.recipient.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            )}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !userData?.gateway_id}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Sending...' : 'Send Message'}
        </button>
        
        <div className="mt-2 text-xs text-gray-500">
          {watch('recipient') && (
            <p>
              Will be sent as: +{watch('country_code')}{watch('recipient').replace(/[\s\-\(\)]/g, '')}
            </p>
          )}
        </div>

        {!userData?.gateway_id && (
          <p className="text-sm text-red-600 text-center">
            No gateway configured for your account. Please contact your administrator.
          </p>
        )}
      </form>
    </div>
  );
}