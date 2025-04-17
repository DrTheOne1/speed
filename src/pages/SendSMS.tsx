import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Wallet, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from '../components/PhoneInput';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { useTranslation } from '../contexts/TranslationContext';

interface SendSMSForm {
  sender_id: string;
  recipient: string;
  message: string;
  scheduledFor?: string;
}

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

export default function SendSMS() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [messageLength, setMessageLength] = useState(0);

  // Get the last used phone number from local storage
  const getLastPhoneNumber = () => {
    const savedNumber = localStorage.getItem('lastPhoneNumber');
    return savedNumber || '';
  };

  // Save phone number to local storage
  const savePhoneNumber = (number: string) => {
    localStorage.setItem('lastPhoneNumber', number);
  };

  // Get the last used sender ID from local storage
  const getLastSenderId = () => {
    const savedSenderId = localStorage.getItem('lastSenderId');
    return savedSenderId || '';
  };

  // Save sender ID to local storage
  const saveSenderId = (senderId: string) => {
    localStorage.setItem('lastSenderId', senderId);
  };

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

  const sendSMSSchema = z.object({
    sender_id: z.string().min(1, { message: t('send.form.validation.sender') }),
    recipient: z.string().min(1, { message: t('send.form.validation.recipient') }),
    message: z.string()
      .min(1, { message: t('send.form.validation.message') })
      .max(800, { message: t('send.form.validation.messageTooLong') }),
  });

  const form = useForm<z.infer<typeof sendSMSSchema>>({
    resolver: zodResolver(sendSMSSchema),
    defaultValues: {
      sender_id: '',
      recipient: '',
      message: ''
    }
  });

  const queryClient = useQueryClient();

  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendSMSForm) => {
      setLoading(true);
      try {
        console.log('Starting message send process...', {
          recipient: data.recipient,
          sender_id: data.sender_id,
          hasMessage: !!data.message,
          user_id: user?.id,
          gateway_id: user?.gateway_id
        });

        // Validate user credits
        if (!user?.credits || user.credits <= 0) {
          console.error('Credit validation failed:', {
            currentCredits: user?.credits,
            userId: user?.id
          });
          throw new Error('Insufficient credits. Please purchase more credits to send messages.');
        }

        // Save form data to local storage
        savePhoneNumber(data.recipient);
        saveSenderId(data.sender_id);

        // First create the message record
        console.log('Creating message record...');
        const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();
        
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            gateway_id: user.gateway_id,
            sender_id: data.sender_id,
            recipient: data.recipient,
            message: data.message,
            scheduled_for: data.scheduledFor ? new Date(data.scheduledFor).toISOString() : null,
            status: isScheduled ? 'scheduled' : 'pending'
          })
          .select()
          .single();

        if (messageError) {
          console.error('Database error creating message:', {
            error: messageError,
            code: messageError.code,
            details: messageError.details,
            hint: messageError.hint
          });
          throw new Error(`Failed to create message record: ${messageError.message}`);
        }

        console.log('Message record created:', { 
          messageId: messageData.id,
          isScheduled,
          scheduledFor: data.scheduledFor 
        });

        // If message is scheduled, don't send it immediately
        if (isScheduled) {
          toast.success('Message scheduled successfully!', {
            duration: 3000,
          style: {
              background: '#10B981',
            color: '#fff',
          },
        });
          return true;
        }

        // For immediate messages, proceed with sending
        console.log('Sending immediate message...');

        // Get auth session for Edge Function call
        console.log('Getting auth session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error: Failed to get session');
        }
        
        if (!session?.access_token) {
          console.error('No access token in session');
          throw new Error('Authentication error: No access token found');
        }

        // Send message using Edge Function
        console.log('Calling Edge Function to send message...');
        const endpoint = 'send-twilio-sms'; // Use the same endpoint as TestSMS
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;
        console.log('Edge Function URL:', edgeFunctionUrl);

        const payload = {
        gateway_id: user.gateway_id,
          sender_id: data.sender_id,
        recipient: data.recipient,
          message: data.message
        };
        console.log('Request payload:', payload);

        try {
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          console.log('Edge Function response status:', response.status);
          let responseData;
          const responseText = await response.text();
          try {
            responseData = JSON.parse(responseText);
            console.log('Edge Function response:', responseData);
          } catch (e) {
            console.error('Failed to parse response:', responseText);
            throw new Error('Invalid response from server');
          }

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
          }

          // Deduct credit after successful send
          console.log('Deducting credit...');
          const { error: creditError } = await supabase
            .from('users')
            .update({ 
              credits: (user.credits - 1) 
            })
            .eq('id', user.id);

          if (creditError) {
            console.error('Error updating credits:', {
              error: creditError,
              code: creditError.code,
              details: creditError.details
            });
            throw new Error(`Failed to update credits: ${creditError.message}`);
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['user'] });
          console.log('Message sent successfully!');

          return true;
        } catch (fetchError: any) {
          console.error('Edge Function error:', {
            error: fetchError,
            message: fetchError.message,
            url: edgeFunctionUrl,
            status: fetchError.status,
            statusText: fetchError.statusText
          });
          throw new Error(`Edge Function error: ${fetchError.message}`);
        }
      } catch (err: any) {
        console.error('Send message process failed:', {
          error: err,
          message: err.message,
          stack: err.stack,
          type: err.constructor.name
        });
        throw new Error(err.message || 'Failed to send message');
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      toast.success('Message sent successfully!', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
      form.reset();
      setMessageLength(0);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to send message';
      console.error('Error in mutation:', {
        error,
        message: errorMessage,
        stack: error.stack
      });
      toast.error(errorMessage, {
        duration: 5000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
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
            <h1 className="text-3xl font-bold text-gray-900">
              {t('send.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('send.description')}
            </p>
          </div>
          
          <Card className="w-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {t('send.credits.available')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {/* Keep credits display in English */}
                {`${user?.credits ?? 0}`}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('send.form.title')}</CardTitle>
            <CardDescription>{t('send.form.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="sender_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('send.form.sender.label')}</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('send.form.sender.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {user?.sender_names?.map((name) => (
                            <SelectItem key={name} value={name}>
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
                      <FormLabel>{t('send.form.recipient.label')}</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            savePhoneNumber(value);
                          }}
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
                      <FormLabel>{t('send.form.message.label')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder={t('send.form.message.placeholder')}
                            className="min-h-[120px]"
                            onChange={(e) => {
                              field.onChange(e);
                              setMessageLength(e.target.value.length);
                            }}
                          />
                          <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                            {t('send.form.message.characterCount', { count: messageLength })}
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
                      <FormLabel>{t('send.form.schedule.label')}</FormLabel>
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

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading || !user?.credits || user.credits <= 0}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{t('send.form.sending')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{t('send.form.submit')}</span>
                      </>
                    )}
                  </Button>
                </div>

                {(!user?.credits || user.credits <= 0) && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">
                        {t('send.errors.insufficientCredits')}
                      </h4>
                      <p className="text-sm text-yellow-700">
                        {t('send.errors.purchaseMessage')}
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
