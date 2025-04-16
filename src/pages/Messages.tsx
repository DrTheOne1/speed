import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { logger } from '../utils/logger';
import { Search, Filter, Download, MessageSquare, Copy, Send, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const handleExport = async (messagesToExport = messages) => {
    if (!messagesToExport?.length) return;
    
    try {
      setIsExporting(true);
      
      // Add BOM for UTF-8
      const BOM = '\uFEFF';
      
      // Process data with proper encoding for Arabic
      const csvData = messagesToExport.map(message => ({
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
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export messages');
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

  const { data: messages, isLoading, error } = useQuery<Message[]>({
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading messages</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>There was a problem loading your messages. Please try again later.</p>
            </div>
          </div>
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
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Your Messages</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all messages you've sent, including their status and details.
          </p>
        </div>
        <div className="sm:flex sm:items-center sm:justify-end">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      {selectedRows.size > 0 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {selectedRows.size} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(messages?.filter(m => selectedRows.has(m.id)))}
                disabled={isExporting}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="relative px-6 sm:w-16 sm:px-8">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600"
                  checked={messages?.length > 0 && messages?.length === selectedRows.size}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(messages?.map(m => m.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              {visibleColumns.has('message') && (
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Message
                </th>
              )}
              {visibleColumns.has('recipient') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Recipient
                </th>
              )}
              {visibleColumns.has('gateway_name') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Gateway
                </th>
              )}
              {visibleColumns.has('status') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              )}
              {visibleColumns.has('created_at') && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
              )}
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {(messages ?? [])
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="relative px-6 sm:w-16 sm:px-8">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600"
                      checked={selectedRows.has(message.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRows);
                        if (e.target.checked) {
                          newSelected.add(message.id);
                        } else {
                          newSelected.delete(message.id);
                        }
                        setSelectedRows(newSelected);
                      }}
                    />
                  </td>
                  {visibleColumns.has('message') && (
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      <div className="flex items-center group relative">
                        <MessageSquare className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />
                        <div className="truncate max-w-[200px] hover:text-indigo-600">
                          {message.message}
                          {/* Tooltip */}
                          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-gray-900 text-white text-xs rounded-lg 
                            -translate-y-full top-0 left-0 mt-[-10px] 
                            after:content-[''] after:absolute after:left-1/2 after:top-[100%] after:-translate-x-1/2 
                            after:border-8 after:border-x-transparent after:border-b-transparent after:border-t-gray-900">
                            {message.message}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has('recipient') && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="group relative">
                        <div className="truncate max-w-[150px] hover:text-indigo-600">
                          {message.recipient}
                          <div className="invisible group-hover:visible absolute z-50 p-2 bg-gray-900 text-white text-xs rounded-lg 
                            -translate-y-full top-0 left-0 mt-[-10px] whitespace-normal
                            after:content-[''] after:absolute after:left-1/2 after:top-[100%] after:-translate-x-1/2 
                            after:border-8 after:border-x-transparent after:border-b-transparent after:border-t-gray-900">
                            {message.recipient}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has('gateway_name') && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {message.gateway_name || 'N/A'}
                    </td>
                  )}
                  {visibleColumns.has('status') && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
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
                          mr-1 h-1.5 w-1.5 rounded-full
                          ${message.status === 'delivered' ? 'bg-green-600' :
                            message.status === 'failed' ? 'bg-red-600' :
                            message.status === 'pending' ? 'bg-yellow-600' :
                            'bg-gray-600'}
                        `} />
                        {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('created_at') && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {format(new Date(message.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  )}
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(message.message);
                          toast.success('Message copied to clipboard');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy message"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm('Are you sure you want to resend this message?')) {
                            // Add resend mutation here
                            toast.success('Message queued for resend');
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Resend message"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
