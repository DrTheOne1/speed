import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const DebugCredits = () => {
  const { userData, credits, isLoading, error, refreshUserData } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-800 text-white rounded shadow-lg z-50 max-w-sm text-xs">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {userData ? userData.id.substring(0, 8) + '...' : 'None'}</p>
        <p><strong>Credits:</strong> {credits}</p>
        <p><strong>Error:</strong> {error ? error.message : 'None'}</p>
      </div>
      <button 
        onClick={async () => {
          console.log('Manual refresh triggered');
          await refreshUserData();
        }}
        className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
      >
        Refresh Data
      </button>
    </div>
  );
};