import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { logger } from '../../utils/logger';
import { Search, Filter, Download, MessageSquare, RefreshCw, X, Trash2, Copy, Send, Clock } from 'lucide-react';
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
  user_email?: string;
  gateway_name?: string;
}

export default function Messages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);

  // Add filter states
  const [gatewayFilter, setGatewayFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  // Add auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(false);
  const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

  // Add after existing state declarations
  const [isExporting, setIsExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Message;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof Message>>(new Set([
    'message', 'recipient', 'status', 'user_email', 'gateway_name', 'created_at'
  ]));
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  const queryClient = useQueryClient();

  const deleteMessagesMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', messageIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      setSelectedRows(new Set());
      toast.success('Messages deleted successfully');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete messages');
    }
  });

  const resendMessagesMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .rpc('resend_messages', { message_ids: messageIds });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Messages queued for resend');
    }
  });

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleExport = async () => {
    if (!messages?.length) return;
    
    try {
      setIsExporting(true);
      
      // Add BOM for UTF-8
      const BOM = '\uFEFF';
      
      // Properly escape and encode data
      const csvData = messages.map(message => ({
        Message: `"${(message.message || '').replace(/"/g, '""')}"`,
        Recipient: `"${(message.recipient || '').replace(/"/g, '""')}"`,
        Status: message.status,
        User: message.user_email || 'N/A',
        Gateway: message.gateway_name || 'N/A',
        'Created At': format(new Date(message.created_at), 'yyyy-MM-dd HH:mm:ss')
      }));

      const headers = Object.keys(csvData[0]);
      const rows = csvData.map(row => 
        Object.values(row)
          .map(value => String(value).replace(/\n/g, ' ')) // Replace newlines
          .join(',')
      );

      const csvString = BOM + [
        headers.join(','),
        ...rows
      ].join('\n');

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

  // Add bulk action handlers
  const handleBulkDelete = async (ids: string[]) => {
    // Implementation
  };
  const handleBulkExport = (ids: string[]) => {
    // Implementation
  };

  // Add after mutation declarations
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, queryClient]);

  // Check database connection first
  useEffect(() => {
    const checkDatabaseConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('count')
          .limit(1);

        if (error) {
          console.error('Database connection error:', error);
          toast.error(`Database connection error: ${error.message}`);
        } else {
          console.log('Database connection successful');
        }
      } catch (err) {
        console.error('Error checking database connection:', err);
        toast.error('Failed to connect to database');
      }
    };

    checkDatabaseConnection();
  }, []);

  // Add after other useEffect hooks
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
    queryKey: ['admin-messages', searchQuery, statusFilter, dateRange],
    queryFn: async () => {
      try {
        console.log('Starting query with filters:', { searchQuery, statusFilter, dateRange });
        
        // First get all messages
        let query = supabase
          .from('messages')
          .select('*')
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

        // Get unique user IDs and gateway IDs
        const userIds = [...new Set(messages.map(m => m.user_id))];
        const gatewayIds = [...new Set(messages.map(m => m.gateway_id))];

        // Fetch user details
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
        }

        // Fetch gateway details
        const { data: gateways, error: gatewaysError } = await supabase
          .from('gateways')
          .select('id, name')
          .in('id', gatewayIds);

        if (gatewaysError) {
          console.error('Error fetching gateways:', gatewaysError);
        }

        // Map user and gateway details to messages
        const messagesWithDetails = messages.map(message => ({
          ...message,
          user_email: users?.find(u => u.id === message.user_id)?.email,
          gateway_name: gateways?.find(g => g.id === message.gateway_id)?.name
        }));

        console.log('Query successful, data:', messagesWithDetails);
        return messagesWithDetails;
      } catch (error) {
        console.error('Query error details:', error);
        toast.error('Failed to fetch messages');
        throw error;
      }
    }
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
              <p>There was a problem loading the message history. Please try again later.</p>
              <p className="mt-1 text-xs">Error: {(error as Error).message}</p>
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
              <p>There are no messages in the system yet.</p>
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
          <h1 className="text-xl font-semibold text-gray-900">Message History</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all messages in the system including their status and details.
          </p>
        </div>
        <div className="sm:flex-none">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </button>
        </div>
        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Columns
          </button>
          {isColumnDropdownOpen && (
            <div 
              className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
              role="menu"
            >
              <div className="py-1">
                {Object.keys(messages?.[0] || {}).map(key => (
                  <div
                    key={key}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      const newColumns = new Set(visibleColumns);
                      if (newColumns.has(key as keyof Message)) {
                        newColumns.delete(key as keyof Message);
                      } else {
                        newColumns.add(key as keyof Message);
                      }
                      setVisibleColumns(newColumns);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(key as keyof Message)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      readOnly
                    />
                    <span className="ml-3">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Search messages..."
            />
          </div>
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
            toast.success('Refreshing messages...');
          }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
        <button
          onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
          className={`
            inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold
            ${isAutoRefreshEnabled ? 'bg-indigo-100 text-indigo-700' : 'text-gray-900'}
          `}
        >
          <Clock className="h-4 w-4" />
          {isAutoRefreshEnabled ? 'Auto-refresh On' : 'Auto-refresh Off'}
        </button>
      </div>

      {selectedRows.size > 0 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {selectedRows.size} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedRows.size} messages?`)) {
                    deleteMessagesMutation.mutate(Array.from(selectedRows));
                  }
                }}
                disabled={deleteMessagesMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMessagesMutation.isPending ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative px-6 sm:w-16 sm:px-8">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                        checked={messages?.length === selectedRows.size}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(messages?.map(m => m.id)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                      />
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Message
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Recipient
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Gateway
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-sm text-gray-500">
                        Loading messages...
                      </td>
                    </tr>
                  ) : messages?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-sm text-gray-500">
                        No messages found
                      </td>
                    </tr>
                  ) : (
                    messages
                      ?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((message) => (
                        <tr 
                          key={message.id}
                          onClick={() => setSelectedMessage(message)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <td className="relative px-6 sm:w-16 sm:px-8">
                            <input
                              type="checkbox"
                              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
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
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            <div className="flex items-center">
                              <MessageSquare className="h-5 w-5 mr-2 text-gray-400" />
                              <span className="truncate max-w-xs">{message.message}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {message.recipient}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {message.user_email || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {message.gateway_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              message.status === 'failed' ? 'bg-red-100 text-red-800' :
                              message.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(message.created_at), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this message?')) {
                                  deleteMessagesMutation.mutate([message.id]);
                                }
                              }}
                              className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
                              title="Delete message"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete message</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, messages?.length || 0)} of {messages?.length} messages
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {Math.ceil((messages?.length || 0) / itemsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(Math.ceil((messages?.length || 0) / itemsPerPage), p + 1))}
            disabled={currentPage >= Math.ceil((messages?.length || 0) / itemsPerPage)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">Message Details</h3>
              <button onClick={() => setSelectedMessage(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="mt-1 text-sm text-gray-900">{selectedMessage.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipient</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.recipient}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.user_email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gateway</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedMessage.gateway_name || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedMessage.created_at), 'PPpp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}