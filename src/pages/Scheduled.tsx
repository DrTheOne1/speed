import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, Calendar, Clock, Edit2, Eye, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { sendMessage, processScheduledMessages } from '../utils/messageProcessing';

interface Message {
  id: string;
  recipient: string;
  message: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
}

interface RescheduleParams {
  id: string;
  scheduledFor: string;
}

export default function Scheduled() {
  const { t } = useTranslation();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');

  const { data: messages, refetch } = useQuery<Message[]>({
    queryKey: ['scheduled-messages'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .not('scheduled_for', 'is', null)
          .order('scheduled_for', { ascending: true });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching scheduled messages:', error);
        throw new Error('Failed to load scheduled messages');
      }
    },
  });

  const cancelMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error canceling message:', error);
        throw new Error('Failed to cancel message');
      }
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const rescheduleMessageMutation = useMutation({
    mutationFn: async ({ id, scheduledFor }: RescheduleParams) => {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ 
            scheduled_for: scheduledFor,
            status: 'pending'
          })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error rescheduling message:', error);
        throw new Error('Failed to reschedule message');
      }
    },
    onSuccess: () => {
      refetch();
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting message:', error);
        throw new Error('Failed to delete message');
      }
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm(t('scheduled.confirmation.delete.message', 'Are you sure you want to delete this message? This action cannot be undone.'))) {
      try {
        await deleteMessageMutation.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const handleCancelMessage = async (id: string) => {
    if (window.confirm(t('scheduled.confirmation.cancel.message', 'Are you sure you want to cancel this message?'))) {
      try {
        await cancelMessageMutation.mutateAsync(id);
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  };

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewModalOpen(true);
  };

  const handleEditMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsEditModalOpen(true);
  };

  const filteredMessages = messages?.filter(message => {
    const matchesSearch = message.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'upcoming') return matchesSearch && new Date(message.scheduled_for) > new Date();
    if (filter === 'past') return matchesSearch && new Date(message.scheduled_for) <= new Date();
    return matchesSearch && message.status === filter;
  });

  if (!messages) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('scheduled.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('scheduled.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('scheduled.description')}</p>
        </div>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder={t('scheduled.search.placeholder')}
            className="px-4 py-2 border rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-md"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t('scheduled.filters.all')}</option>
            <option value="upcoming">{t('scheduled.filters.upcoming')}</option>
            <option value="past">{t('scheduled.filters.past')}</option>
            <option value="pending">{t('scheduled.status.pending')}</option>
            <option value="sent">{t('scheduled.status.sent')}</option>
            <option value="failed">{t('scheduled.status.failed')}</option>
            <option value="cancelled">{t('scheduled.status.cancelled')}</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              {filteredMessages?.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {t('scheduled.listSection.empty')}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        {t('scheduled.listSection.table.recipient')}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('scheduled.listSection.table.message')}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('scheduled.listSection.table.scheduledFor')}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        {t('scheduled.listSection.table.status')}
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">{t('scheduled.listSection.table.actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredMessages?.map((message) => (
                      <tr key={message.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {message.recipient}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {message.message}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(new Date(message.scheduled_for), 'PPpp')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {t(`scheduled.status.${message.status}`)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleViewMessage(message)}
                              className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditMessage(message)}
                              className="text-yellow-600 hover:text-yellow-900 transition-colors duration-200"
                              disabled={message.status !== 'pending'}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelMessage(message.id)}
                              className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                              disabled={message.status !== 'pending'}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Section */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium">Debug Information</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <p>Server Time: {new Date().toISOString()}</p>
          <p>Browser Time: {new Date().toString()}</p>
          
          <div className="col-span-2 flex flex-wrap gap-2">
            <button 
              onClick={async () => {
                const { data, error } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('status', 'pending')
                  .not('scheduled_for', 'is', null);
                
                console.log('Pending scheduled messages:', data);
                console.log('Error if any:', error);
                alert(`Found ${data?.length || 0} pending scheduled messages`);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              Check Pending Messages
            </button>
            
            <button 
              onClick={async () => {
                const now = new Date().toISOString();
                const { data, error } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('status', 'pending')
                  .not('scheduled_for', 'is', null)
                  .lte('scheduled_for', now);
                
                console.log('Ready to process messages:', data);
                console.log('Error if any:', error);
                alert(`Found ${data?.length || 0} messages ready to process`);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded text-sm"
            >
              Check Ready Messages
            </button>
            
            <button 
              onClick={async () => {
                const { data, error } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('status', 'processing');
                
                console.log('Stuck in processing:', data);
                console.log('Error if any:', error);
                alert(`Found ${data?.length || 0} messages stuck in processing`);
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded text-sm"
            >
              Check Stuck Messages
            </button>

            <button 
              onClick={async () => {
                if (!window.confirm('Reset stuck messages? This will mark processing messages back to pending.')) return;
                
                const { data, error } = await supabase
                  .from('messages')
                  .update({ status: 'pending' })
                  .eq('status', 'processing')
                  .select();
                
                console.log('Reset messages:', data);
                console.log('Error if any:', error);
                alert(`Reset ${data?.length || 0} stuck messages to pending`);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded text-sm"
            >
              Reset Stuck Messages
            </button>

            <button 
              onClick={async () => {
                if (!window.confirm('Force retry stuck messages? This will attempt to send them now.')) return;
                
                // First get authentication token
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                  alert('Authentication required. Please log in again.');
                  return;
                }
                
                // Get messages in processing state
                const { data: processingMessages } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('status', 'processing');
                  
                if (!processingMessages?.length) {
                  alert('No processing messages found to retry');
                  return;
                }
                
                let success = 0;
                let failed = 0;
                
                // Manually retry each stuck message
                for (const message of processingMessages) {
                  try {
                    // Call your edge function directly WITH AUTHENTICATION
                    const response = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
                      {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`, // Add auth token
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          gateway_id: message.gateway_id,
                          sender_id: message.sender_id,
                          recipient: message.recipient,
                          message: message.message,
                          message_id: message.id
                        }),
                      }
                    );
                    
                    // Add better error handling
                    if (response.ok) {
                      // Update status in the database
                      await supabase
                        .from('messages')
                        .update({ 
                          status: 'sent',
                          sent_at: new Date().toISOString() 
                        })
                        .eq('id', message.id);
                      
                      success++;
                    } else {
                      // Get the actual error message from the response
                      const errorData = await response.json().catch(() => ({}));
                      console.error('Edge function error:', errorData);
                      throw new Error(errorData.message || 'API call failed');
                    }
                  } catch (error) {
                    console.error(`Error processing message ${message.id}:`, error);
                    
                    // Mark as failed
                    await supabase
                      .from('messages')
                      .update({ 
                        status: 'failed',
                        error_message: error.message || 'Manual retry failed'
                      })
                      .eq('id', message.id);
                    
                    failed++;
                  }
                }
                
                alert(`Processed ${success + failed} messages: ${success} succeeded, ${failed} failed`);
                refetch();
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded text-sm"
            >
              Force Retry Stuck Messages
            </button>

            <button 
              onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  alert('Not authenticated');
                  return;
                }

                try {
                  // First, get a valid gateway ID from your database
                  const { data: userGateway } = await supabase
                    .from('users')
                    .select('gateway_id')
                    .eq('id', session.user.id)
                    .single();
                    
                  if (!userGateway?.gateway_id) {
                    alert('No gateway configured for your account');
                    return;
                  }
                  
                  console.log("Using gateway ID:", userGateway.gateway_id);
                  
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        gateway_id: userGateway.gateway_id,
                        sender_id: "TEST",
                        recipient: "+1234567890",
                        message: "Test message",
                        message_id: "test-id"
                      }),
                    }
                  );
                  
                  console.log('Status:', response.status);
                  console.log('Status text:', response.statusText);
                  
                  let responseText;
                  try {
                    responseText = await response.text();
                    console.log('Raw response:', responseText);
                    
                    // Try to parse as JSON if possible
                    try {
                      const data = JSON.parse(responseText);
                      console.log('JSON response:', data);
                      alert(`Edge function response: ${JSON.stringify(data)}`);
                    } catch (e) {
                      alert(`Edge function response: ${responseText}`);
                    }
                  } catch (e) {
                    console.error('Could not read response:', e);
                  }
                  
                  alert('Edge function test: ' + (response.ok ? 'Success' : 'Failed'));
                } catch (error) {
                  console.error('Edge function test error:', error);
                  alert('Edge function test error: ' + error.message);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
            >
              Test Edge Function
            </button>

            <button 
              onClick={async () => {
                if (!window.confirm('This will identify and mark messages with invalid phone numbers as failed. Continue?')) return;
                
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  alert('Not authenticated');
                  return;
                }
                
                try {
                  // Get pending messages
                  const { data: pendingMessages } = await supabase
                    .from('messages')
                    .select('id,recipient')
                    .eq('status', 'pending');
                    
                  if (!pendingMessages?.length) {
                    alert('No pending messages found');
                    return;
                  }
                  
                  const invalid = [];
                  
                  for (const msg of pendingMessages) {
                    try {
                      // Very basic check - can be improved
                      const isValid = /^\+[1-9]\d{1,14}$/.test(msg.recipient.replace(/\s+/g, ''));
                      if (!isValid) {
                        invalid.push(msg.id);
                      }
                    } catch (e) {
                      invalid.push(msg.id);
                    }
                  }
                  
                  if (invalid.length === 0) {
                    alert('No invalid phone numbers found');
                    return;
                  }
                  
                  // Mark invalid numbers as failed
                  const { data: updated } = await supabase
                    .from('messages')
                    .update({ 
                      status: 'failed',
                      error_message: 'Invalid phone number format'
                    })
                    .in('id', invalid)
                    .select();
                    
                  alert(`Found and marked ${updated.length} messages with invalid phone numbers as failed`);
                  refetch();
                } catch (error) {
                  console.error('Error checking phone numbers:', error);
                  alert('Error: ' + error.message);
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded text-sm"
            >
              Check Invalid Numbers
            </button>
          </div>
        </div>
      </div>

      {/* View Message Modal */}
      <Dialog
        open={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              {t('scheduled.messageSection.title')}
            </Dialog.Title>
            {selectedMessage && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.messageSection.recipient')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.recipient}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.messageSection.message')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.message}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.messageSection.schedule')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(selectedMessage.scheduled_for), 'PPpp')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.messageSection.status')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {t(`scheduled.status.${selectedMessage.status}`)}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                onClick={() => setIsViewModalOpen(false)}
              >
                {t('scheduled.actions.close')}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Edit Message Modal */}
      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              {t('scheduled.schedule.title')}
            </Dialog.Title>
            {selectedMessage && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.schedule.date')}
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    defaultValue={format(new Date(selectedMessage.scheduled_for), 'yyyy-MM-dd')}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('scheduled.schedule.time')}
                  </label>
                  <input
                    type="time"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    defaultValue={format(new Date(selectedMessage.scheduled_for), 'HH:mm')}
                    onChange={(e) => setTimeInput(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t('scheduled.actions.cancel')}
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => {
                  if (!selectedMessage) return;
                  
                  try {
                    const newDate = dateInput || format(new Date(selectedMessage.scheduled_for), 'yyyy-MM-dd');
                    const newTime = timeInput || format(new Date(selectedMessage.scheduled_for), 'HH:mm');
                    const scheduledFor = `${newDate}T${newTime}:00`;
                    const newDateTime = new Date(scheduledFor);
                    const now = new Date();
                    
                    if (isNaN(newDateTime.getTime())) {
                      alert(t('scheduled.errors.invalidDate', 'Please enter a valid date and time'));
                      return;
                    }
                    
                    if (newDateTime <= now) {
                      alert(t('scheduled.errors.pastDate', 'Scheduled time must be in the future'));
                      return;
                    }
                    
                    rescheduleMessageMutation.mutate({
                      id: selectedMessage.id,
                      scheduledFor: scheduledFor
                    });
                  } catch (error) {
                    console.error('Error rescheduling message:', error);
                    alert(t('scheduled.errors.rescheduleError', 'Failed to reschedule message'));
                  }
                }}
              >
                {t('scheduled.actions.reschedule')}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}