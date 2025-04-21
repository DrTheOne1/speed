import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthDebug() {
  const [sessionInfo, setSessionInfo] = useState<string>('');
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const checkSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    setSessionInfo(
      JSON.stringify({ 
        hasSession: !!data?.session, 
        user: data?.session?.user?.email,
        error: error?.message 
      }, null, 2)
    );
  };
  
  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg z-50 text-xs">
      <h3 className="font-bold text-red-600 mb-2">Auth Debug</h3>
      <div className="space-y-2">
        <button 
          onClick={checkSession}
          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded w-full text-left"
        >
          Check Session
        </button>
        <button 
          onClick={clearStorage}
          className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded w-full text-left"
        >
          Clear Storage & Reload
        </button>
      </div>
      {sessionInfo && (
        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
          {sessionInfo}
        </pre>
      )}
    </div>
  );
}