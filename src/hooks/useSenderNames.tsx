import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSenderNames() {
  const [senderNames, setSenderNames] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSenderNames = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData?.session?.user) {
          setError('No authenticated user');
          return;
        }

        // Get sender names from user profile
        const { data, error } = await supabase
          .from('users')
          .select('sender_names')
          .eq('id', sessionData.session.user.id)
          .single();

        if (error) {
          console.error('Error fetching sender names:', error);
          setError(error.message);
          return;
        }

        // Process sender names
        if (data && Array.isArray(data.sender_names) && data.sender_names.length > 0) {
          setSenderNames(data.sender_names);
          
          // Try to get previously selected sender from localStorage
          const savedSender = localStorage.getItem('lastSelectedSender');
          const initialSender = savedSender && data.sender_names.includes(savedSender) 
            ? savedSender 
            : data.sender_names[0];
            
          setSelectedSender(initialSender);
        } else {
          setSenderNames([]);
        }
      } catch (err) {
        console.error('Error in fetchSenderNames:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSenderNames();
  }, []);

  // Function to update selected sender and save to localStorage
  const updateSelectedSender = (senderId: string) => {
    setSelectedSender(senderId);
    localStorage.setItem('lastSelectedSender', senderId);
  };

  return {
    senderNames,
    selectedSender,
    setSelectedSender: updateSelectedSender,
    isLoading,
    error
  };
}