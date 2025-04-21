import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, Calendar, Clock, Edit2, Eye, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface Message {
  id: string;
  recipient: string;
  message: string;
  scheduled_for: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
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
          .update({ scheduled_for: scheduledFor })
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
            <option value="scheduled">{t('scheduled.status.scheduled')}</option>
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
                              disabled={message.status !== 'scheduled'}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelMessage(message.id)}
                              className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                              disabled={message.status !== 'scheduled'}
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