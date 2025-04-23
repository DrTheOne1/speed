import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { calculateMessageSegments, calculateRequiredCredits, getMessageDetails, isGsm7Message } from '../utils/smsUtils';
import { useTranslation } from 'react-i18next';
import SMSCharacterCounter from '../components/SMSCharacterCounter';

const testSMSSchema = z.object({
  sender_id: z.string().min(1, 'Sender ID is required'),
  country_code: z.string().optional(),
  recipient: z.string().min(1, 'Recipient is required'),
  message: z.string().min(1, 'Message is required'),
});

type TestSMSForm = z.infer<typeof testSMSSchema>;

export default function SendSMS() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [messageDetails, setMessageDetails] = useState({
    segments: 0,
    remaining: 160,
    isGsm: true,
    charsPerSegment: 160,
    totalChars: 0,
    maxChars: 160,
    exceedsLimit: false
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const { data: userData } = useQuery({
    queryKey: ['user-data', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('gateway_id, sender_names, credits')
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

  useEffect(() => {
    const message = watch('message') || '';
    const details = getMessageDetails(message, 5);
    setMessageDetails(details);
  }, [watch('message')]);

  const onSubmit = async (data: TestSMSForm) => {
    try {
      if (!userData?.gateway_id) {
        toast.error('No gateway configured for your account');
        return;
      }

      const requiredCredits = calculateRequiredCredits(data.message);
      if (userData.credits < requiredCredits) {
        toast.error(`Insufficient credits. Required: ${requiredCredits}, Available: ${userData.credits || 0}`);
        return;
      }

      setLoading(true);

      let cleanRecipient = data.recipient.replace(/[\s\-\(\)]/g, '');

      if (!cleanRecipient.startsWith('+')) {
        cleanRecipient = `+${data.country_code}${cleanRecipient}`;
      }

      const { data: messageData, error: dbError } = await supabase.from('messages').insert({
        gateway_id: userData.gateway_id,
        recipient: cleanRecipient,
        message: data.message,
        status: 'pending',
        sender_id: data.sender_id,
        user_id: userId
      }).select().single();

      if (dbError) throw dbError;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No access token found');

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
            recipient: cleanRecipient,
            message: data.message,
            sender_id: data.sender_id,
            message_id: messageData.id,
          }),
        }
      );

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

  const sendSMSMutation = useMutation({
    mutationFn: async (data: TestSMSForm) => {
      setLoading(true);
      try {
        console.log('Starting message send process...', {
          recipient: data.recipient,
          sender_id: data.sender_id,
          hasMessage: !!data.message,
          user_id: userData?.id,
          gateway_id: userData?.gateway_id
        });

        // Validate user credits
        if (!userData?.credits || userData.credits <= 0) {
          console.error('Credit validation failed:', {
            currentCredits: userData?.credits,
            userId: userData?.id
          });
          throw new Error('Insufficient credits. Please purchase more credits to send messages.');
        }

        // Save form data to local storage
        savePhoneNumber(data.recipient);
        saveSenderId(data.sender_id);

        // Check if message is scheduled
        const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();
        
        if (isScheduled) {
          // Insert into scheduled_messages table
          const { data: scheduledMessage, error: scheduleError } = await supabase
            .from('scheduled_messages')
            .insert({
              user_id: userData.id,
              gateway_id: userData.gateway_id,
              sender_id: data.sender_id,
              recipient: data.recipient,
              message: data.message,
              scheduled_for: new Date(data.scheduledFor).toISOString(),
              status: 'pending'
            })
            .select()
            .single();

          if (scheduleError) {
            console.error('Failed to schedule message:', scheduleError);
            throw new Error(`Failed to schedule message: ${scheduleError.message}`);
          }

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
        const endpoint = 'send-twilio-sms';
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;
        console.log('Edge Function URL:', edgeFunctionUrl);

        const payload = {
          gateway_id: userData.gateway_id,
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
              credits: (userData.credits - 1) 
            })
            .eq('id', userData.id);

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
      reset();
      setMessageDetails({
        segments: 0,
        remaining: 160,
        isGsm: true,
        charsPerSegment: 160,
        totalChars: 0,
        maxChars: 160,
        exceedsLimit: false
      });
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Send SMS</h1>
          <p className="mt-2 text-sm text-gray-700">
            Send messages using your configured gateway
          </p>
        </div>
        
        <div className="bg-white py-2 px-4 rounded-full shadow border border-gray-200 flex items-center">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <span className="font-medium">
            {userData?.credits !== undefined 
              ? `Available Credits: ${userData.credits}`
              : 'Loading credits...'}
          </span>
          {(userData?.credits || 0) < 50 && (
            <span className="ml-2 text-amber-600">
              (Low Balance)
            </span>
          )}
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
                id="sender_id"
                name="sender_id"
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
                  id="country_code"
                  name="country_code"
                  className="w-20 rounded-l-md border-r-0 bg-gray-50 text-gray-500 sm:text-sm"
                >
                  <option value="46">+46</option>
                  <option value="1">+1</option>
                  <option value="44">+44</option>
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
                  name="recipient"
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
            rules={{ required: 'Message is required' }}
            render={({ field }) => (
              <div>
                <textarea
                  id="message"
                  name="message"
                  {...field}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  maxLength={isGsm7Message(field.value) 
                    ? (160 + (4 * 153)) // 5 pages for GSM-7 
                    : (70 + (4 * 67))   // 5 pages for Unicode/Arabic
                  }
                />
                <SMSCharacterCounter messageDetails={messageDetails} />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                )}
              </div>
            )}
          />
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