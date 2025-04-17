import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { logger } from '../utils/logger';
import { Search, Filter, Download, MessageSquare, Copy, Send, Clock, RefreshCw, Eye, X } from 'lucide-react';
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
    <div className={`container mx-auto px-4 py-8 ${textDirection}`} dir={textDirection}>
      <h1 className="text-3xl font-bold mb-4">{t('messages.title')}</h1>
      <p className="text-gray-600 mb-8">{t('messages.description')}</p>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`border rounded-lg p-6 ${
                selectedMessage?.id === message.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <h2 className="text-xl font-bold mb-2">{message.recipient}</h2>
              <p className="text-gray-600 mb-4">{message.message}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {format(new Date(message.created_at), 'PPpp')}
                </span>
              </div>
              <div className="mb-4">
                <span className={`
                  inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${message.status === 'delivered' 
                    ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20' 
                    : message.status === 'failed'
                    ? 'bg-red-100 text-red-800 ring-1 ring-red-600/20'
                    : message.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20'
                    : 'bg-gray-100 text-gray-800 ring-1 ring-gray-600/20'
                  }
                `}>
                  <span className={`
                    ${isRTL ? 'ml-1' : 'mr-1'} h-1.5 w-1.5 rounded-full
                    ${message.status === 'delivered' ? 'bg-green-600' :
                      message.status === 'failed' ? 'bg-red-600' :
                      message.status === 'pending' ? 'bg-yellow-600' :
                      'bg-gray-600'}
                  `} />
                  {t(`messages.status.${message.status}`)}
                </span>
              </div>
              <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                <button
                  onClick={() => handleViewMessage(message)}
                  className={`text-blue-600 hover:text-blue-900 transition-colors duration-200 flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Eye className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  <span className={isRTL ? 'text-right' : 'text-left'}>{t('messages.actions.view')}</span>
                </button>
                {message.status === 'failed' && (
                  <button
                    onClick={() => handleResendMessage(message)}
                    className={`text-green-600 hover:text-green-900 transition-colors duration-200 flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Send className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('messages.actions.resend')}</span>
                  </button>
                )}
                {message.status === 'scheduled' && (
                  <button
                    onClick={() => handleCancelMessage(message.id)}
                    className={`text-red-600 hover:text-red-900 transition-colors duration-200 flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <X className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('messages.actions.cancel')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Message Modal */}
      <Dialog
        open={isViewModalOpen}
        onClose={handleCloseViewModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className={`mx-auto max-w-lg rounded-lg bg-white p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Dialog.Title className={`text-lg font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('messages.messageSection.title')}
            </Dialog.Title>
            
            {selectedMessage && (
              <div className={`mt-4 space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div>
                  <h3 className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('messages.messageSection.recipient')}
                  </h3>
                  <p className={`mt-1 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {selectedMessage.recipient}
                  </p>
                </div>
                
                <div>
                  <h3 className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('messages.messageSection.message')}
                  </h3>
                  <p className={`mt-1 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {selectedMessage.message}
                  </p>
                </div>
                
                <div>
                  <h3 className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('messages.messageSection.sentAt')}
                  </h3>
                  <p className={`mt-1 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {format(new Date(selectedMessage.created_at), 'PPpp')}
                  </p>
                </div>
                
                <div>
                  <h3 className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('messages.messageSection.status')}
                  </h3>
                  <p className={`mt-1 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t(`messages.status.${selectedMessage.status}`)}
                  </p>
                </div>
              </div>
            )}

            <div className={`mt-6 flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
              <button
                type="button"
                className={`rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}
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
