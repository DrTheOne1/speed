import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Search, Filter, Download, MessageSquare, Copy, Send, Clock, RefreshCw, Eye, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../contexts/TranslationContext';
import { Phone } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface Message {
  id: string;
  message: string;
  status: string;
  recipient: string;
  created_at: string;
  user_id: string;
  scheduled_for: string | null;
  sent_at: string | null;
  gateway_name?: string;
}

export default function Messages() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof Message>>(new Set([
    'message', 'recipient', 'status', 'gateway_name', 'created_at'
  ]));
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleExport = async () => {
    if (!messages?.length) return;
    
    try {
      setIsExporting(true);
      
      // Add BOM for UTF-8
      const BOM = '\uFEFF';
      
      // Process data with proper encoding for Arabic
      const csvData = messages.map(message => ({
        Message: `"${(message.message || '').replace(/"/g, '""').replace(/[\n\r]+/g, ' ')}"`,
        Recipient: `"${(message.recipient || '').replace(/"/g, '""')}"`,
        Status: message.status,
        Gateway: message.gateway_name || 'N/A',
        'Created At': format(new Date(message.created_at), 'yyyy-MM-dd HH:mm:ss')
      }));

      const headers = Object.keys(csvData[0]);
      const rows = csvData.map(row => 
        Object.values(row)
          .map(value => String(value))
          .join(',')
      );

      const csvString = BOM + [headers.join(','), ...rows].join('\n');

      // Create blob with UTF-8 encoding
      const blob = new Blob([csvString], { 
        type: 'text/csv;charset=utf-8'
      });

      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(t('messages.export.success'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('messages.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!isAutoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector('[role="menu"]');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: messagesData, isLoading, error: queryError } = useQuery<Message[]>({
    queryKey: ['user-messages', searchQuery, statusFilter, dateRange],
    queryFn: async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user logged in');

        console.log('Starting query with filters:', { searchQuery, statusFilter, dateRange });
        
        // Get messages for current user only
        let query = supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Apply search filter
        if (searchQuery) {
          query = query.or(`recipient.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
        }

        // Apply status filter
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        // Apply date range filter
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);

        console.log('Executing query...');
        const { data: messages, error: messagesError } = await query;

        if (messagesError) {
          console.error('Database error details:', {
            message: messagesError.message,
            code: messagesError.code,
            details: messagesError.details,
            hint: messagesError.hint
          });
          toast.error(`Database error: ${messagesError.message}`);
          throw messagesError;
        }

        // Get unique gateway IDs
        const gatewayIds = [...new Set(messages.map(m => m.gateway_id))];

        // Fetch gateway details
        const { data: gateways, error: gatewaysError } = await supabase
          .from('gateways')
          .select('id, name')
          .in('id', gatewayIds);

        if (gatewaysError) {
          console.error('Error fetching gateways:', gatewaysError);
        }

        // Map gateway details to messages
        const messagesWithDetails = messages.map(message => ({
          ...message,
          gateway_name: gateways?.find(g => g.id === message.gateway_id)?.name
        }));

        console.log('Query successful, data:', messagesWithDetails);
        return messagesWithDetails;
      } catch (error) {
        console.error('Query error:', error);
        toast.error('Failed to fetch messages');
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData);
    }
  }, [messagesData]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedMessage(null);
  };

  const handleResendMessage = (message: Message) => {
    // Implementation for resending message
    console.log('Resending message:', message);
  };

  const handleCancelMessage = (messageId: string) => {
    // Implementation for canceling message
    console.log('Canceling message:', messageId);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      toast.success(t('messages.delete.success'));
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(t('messages.delete.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">{t('messages.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{t('messages.error')}</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">No messages found</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>You haven't sent any messages yet.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container max-w-6xl mx-auto px-4 py-8 ${textDirection}`} dir={textDirection}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('messages.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('messages.description')}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['user-messages'] })}
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('messages.refresh')}
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting || !messages.length}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? t('messages.exporting') : t('messages.export.button')}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('messages.search')}
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="all">{t('messages.filters.all')}</option>
            <option value="delivered">{t('messages.status.delivered')}</option>
            <option value="failed">{t('messages.status.failed')}</option>
            <option value="pending">{t('messages.status.pending')}</option>
            <option value="scheduled">{t('messages.status.scheduled')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('messages.columns.recipient')}
                </th>
                <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('messages.columns.message')}
                </th>
                <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('messages.columns.date')}
                </th>
                <th scope="col" className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('messages.columns.status')}
                </th>
                <th scope="col" className="px-4 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('messages.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((message, idx) => (
                <tr 
                  key={message.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900">
                        {message.recipient}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-600 line-clamp-1 max-w-xs" title={message.message}>
                      {message.message}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {format(new Date(message.created_at), 'MMM d, HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      ${message.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                        message.status === 'failed' ? 'bg-red-100 text-red-800' :
                        message.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        message.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      <span className={`h-1.5 w-1.5 rounded-full mr-1
                        ${message.status === 'delivered' ? 'bg-green-600' :
                          message.status === 'failed' ? 'bg-red-600' :
                          message.status === 'pending' ? 'bg-yellow-600' :
                          message.status === 'scheduled' ? 'bg-blue-600' :
                          'bg-gray-600'}
                        `}
                      />
                      {t(`messages.status.${message.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewMessage(message)}
                        className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                        title={t('messages.actions.view')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {message.status === 'failed' && (
                        <button
                          onClick={() => handleResendMessage(message)}
                          className="text-green-600 hover:text-green-900 transition-colors duration-200"
                          title={t('messages.actions.resend')}
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      
                      {message.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancelMessage(message.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title={t('messages.actions.cancel')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="text-gray-500 hover:text-red-600 transition-colors duration-200"
                        title={t('messages.actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Improved View Message Modal */}
      <Dialog
        open={isViewModalOpen}
        onClose={handleCloseViewModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Panel className="w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              {t('messages.messageSection.title')}
            </Dialog.Title>
            
            {selectedMessage && (
              <div className="space-y-4">
                <div className="rounded-md bg-gray-50 p-3">
                  <h3 className="text-xs font-medium uppercase text-gray-500">
                    {t('messages.messageSection.recipient')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 font-medium">
                    {selectedMessage.recipient}
                  </p>
                </div>
                
                <div className="rounded-md bg-gray-50 p-3">
                  <h3 className="text-xs font-medium uppercase text-gray-500">
                    {t('messages.messageSection.message')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-gray-50 p-3">
                    <h3 className="text-xs font-medium uppercase text-gray-500">
                      {t('messages.messageSection.sentAt')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedMessage.created_at), 'PPpp')}
                    </p>
                  </div>
                  
                  <div className="rounded-md bg-gray-50 p-3">
                    <h3 className="text-xs font-medium uppercase text-gray-500">
                      {t('messages.messageSection.status')}
                    </h3>
                    <div className="mt-1">
                      <span className={`
                        inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                        ${selectedMessage.status === 'delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedMessage.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : selectedMessage.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        <span className={`h-1.5 w-1.5 rounded-full mr-1
                          ${selectedMessage.status === 'delivered' ? 'bg-green-600' :
                            selectedMessage.status === 'failed' ? 'bg-red-600' :
                            selectedMessage.status === 'pending' ? 'bg-yellow-600' :
                            'bg-gray-600'}
                          `}
                        />
                        {t(`messages.status.${selectedMessage.status}`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={handleCloseViewModal}
              >
                {t('messages.messageSection.close')}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
