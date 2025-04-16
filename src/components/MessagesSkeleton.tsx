import React, { useState, useEffect } from 'react';
import { Clock } from 'react-icons/clock';
import { queryClient } from './queryClient';

export const MessagesSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 animate-pulse">
        <div className="flex-1">
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
          <div className="h-10 w-48 bg-gray-200 rounded-md"></div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="mt-8 animate-pulse">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <div className="min-w-full divide-y divide-gray-300">
            {/* Table header */}
            <div className="bg-gray-100 p-4">
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            {/* Table body */}
            <div className="bg-white">
              {[...Array(5)].map((_, rowIndex) => (
                <div 
                  key={rowIndex}
                  className={`
                    p-4 ${rowIndex % 2 === 1 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  <div className="grid grid-cols-6 gap-4">
                    {[...Array(6)].map((_, colIndex) => (
                      <div 
                        key={colIndex}
                        className="h-5 bg-gray-200 rounded"
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="mt-4 flex items-center justify-between animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

const [autoRefresh, setAutoRefresh] = useState(false);
const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

useEffect(() => {
  if (!autoRefresh) return;
  
  const interval = setInterval(() => {
    queryClient.invalidateQueries({
      queryKey: ['admin-messages', searchQuery, statusFilter, dateRange]
    });
  }, AUTO_REFRESH_INTERVAL);

  return () => clearInterval(interval);
}, [autoRefresh, queryClient, searchQuery, statusFilter, dateRange]);

<button
  onClick={() => setAutoRefresh(!autoRefresh)}
  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold ${
    autoRefresh ? 'bg-indigo-100 text-indigo-700' : 'text-gray-900'
  } hover:bg-gray-50`}
>
  <Clock className="h-4 w-4" />
  {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
</button>;

<th scope="col" className="relative px-7 sm:w-12 sm:px-6">
  <input
    type="checkbox"
    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
    checked={messages?.length === selectedMessages.size}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedMessages(new Set(messages?.map(m => m.id)));
      } else {
        setSelectedMessages(new Set());
      }
    }}
  />
</th>

{selectedMessages.size > 0 && (
  <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500">
        {selectedMessages.size} selected
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {/* Handle bulk delete */}}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          Delete Selected
        </button>
        <button
          onClick={() => {/* Handle bulk export */}}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Export Selected
        </button>
      </div>
    </div>
  </div>
)}

// Add these filters to your filter section
<Select
  value={timeFilter}
  onValueChange={setTimeFilter}
  className="w-[180px]"
>
  <SelectTrigger>
    <SelectValue placeholder="Time range" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="today">Today</SelectItem>
    <SelectItem value="yesterday">Yesterday</SelectItem>
    <SelectItem value="last7days">Last 7 days</SelectItem>
    <SelectItem value="last30days">Last 30 days</SelectItem>
    <SelectItem value="custom">Custom range</SelectItem>
  </SelectContent>
</Select>

<Select
  value={gatewayFilter}
  onValueChange={setGatewayFilter}
  className="w-[180px]"
>
  <SelectTrigger>
    <SelectValue placeholder="Gateway" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Gateways</SelectItem>
    {gateways?.map(gateway => (
      <SelectItem key={gateway.id} value={gateway.id}>
        {gateway.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>