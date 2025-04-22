import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabase';

export function CreditsDebug() {
  const { userId, user } = useAuth();
  const { credits, loading, refreshCredits } = useCredits();
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(`Error: ${error.message}`);
        return;
      }

      setProfileData(data);
    } catch (err) {
      console.error('Error in fetchProfileData:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-bold mb-4">Credits Debug</h2>
      
      <div className="mb-4">
        <h3 className="font-medium">Authentication:</h3>
        <p>User ID: {userId || 'Not logged in'}</p>
        <p>User Email: {user?.email || 'Not available'}</p>
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium">Credits Hook:</h3>
        <p>Credits: {loading ? 'Loading...' : credits}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium">Profile Data:</h3>
        {profileData ? (
          <pre className="bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        ) : (
          <p>No profile data available</p>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex gap-2">
        <button 
          onClick={refreshCredits}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Credits
        </button>
        <button 
          onClick={fetchProfileData}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Profile
        </button>
      </div>
    </div>
  );
} 