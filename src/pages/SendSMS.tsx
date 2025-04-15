import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Wallet, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from '../components/PhoneInput';
import toast from 'react-hot-toast';
import { Database } from '../types/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';

interface User {
  id: string;
  email: string;
  credits: number;
  gateway_id: string | null;
  sender_names: string[];
  role: string;
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
  const [messageLength, setMessageLength] = useState(0);

  const { data: user } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No user found');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      return { 
        id: authUser.id, 
        email: authUser.email || '',
        credits: Number(data.credits) || 0,
        gateway_id: data.gateway_id,
        sender_names: data.sender_names || [],
        role: data.role
      };
    }
  });

  const { data: gateway } = useQuery({
    queryKey: ['gateway', user?.gateway_id],
    queryFn: async () => {
      if (!user?.gateway_id) return null;

      const { data, error } = await supabase
        .from('gateways')
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

  const form = useForm<SendSMSForm>({
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
      form.reset();
      setMessageLength(0);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send SMS');
    },
  });

  const onSubmit = async (data: SendSMSForm) => {
    await sendSMSMutation.mutateAsync(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Send SMS</h1>
            <p className="mt-2 text-gray-600">Send individual SMS messages to your contacts</p>
          </div>
          
          {/* Credit Balance Card */}
          <Card className="w-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{user?.credits || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* SMS Form */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
            <CardDescription>Fill in the details to send your message</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="sender_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender ID</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sender ID" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border rounded-md shadow-md">
                          {user?.sender_names?.map((name) => (
                            <SelectItem 
                              key={name} 
                              value={name}
                              className="hover:bg-gray-100"
                            >
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          error={form.formState.errors.recipient?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder="Type your message here..."
                            className="min-h-[120px]"
                            onChange={(e) => {
                              field.onChange(e);
                              setMessageLength(e.target.value.length);
                            }}
                          />
                          <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                            {messageLength}/160
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="datetime-local"
                            {...field}
                            className="pl-10"
                          />
                          <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Message will be sent using {gateway?.name || 'default'} gateway</span>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading || !user?.credits || user.credits <= 0}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </Button>
                </div>

                {(!user?.credits || user.credits <= 0) && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Insufficient Credits</h4>
                      <p className="text-sm text-yellow-700">
                        You need to have credits to send messages. Please purchase credits to continue.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}