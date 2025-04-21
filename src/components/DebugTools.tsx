import React from 'react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export default function DebugTools() {
  const queryClient = useQueryClient();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const checkAndFixCredits = async () => {
    try {
      // Get current user
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        console.error('No user session found');
        return;
      }
      
      const userId = data.session.user.id;
      console.log('Checking credits for user:', userId);
      
      // Check if user has credits in the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, credits')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error checking user credits:', error);
        return;
      }
      
      console.log('User credits in database:', userData);
      
      // If credits are null or undefined, set them to 0
      if (userData.credits === null || userData.credits === undefined) {
        console.log('Credits are null or undefined, setting to 0');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ credits: 0 })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error setting default credits:', updateError);
        } else {
          console.log('Default credits set to 0');
          queryClient.invalidateQueries();
        }
      }
    } catch (err) {
      console.error('Error in checkAndFixCredits:', err);
    }
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-gray-900 text-white p-4 rounded shadow-lg text-xs">
        <h3 className="font-bold mb-2">Debug Tools</h3>
        <div className="space-y-2">
          <button
            onClick={checkAndFixCredits}
            className="block w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Check & Fix Credits
          </button>
          
          <button
            onClick={() => {
              queryClient.invalidateQueries();
              console.log('All queries invalidated');
            }}
            className="block w-full px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
          >
            Refresh All Queries
          </button>
        </div>
      </div>
    </div>
  );
}