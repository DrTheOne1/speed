import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export function useCredits() {
  const { userId } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Fetch credits whenever userId changes
  useEffect(() => {
    if (userId) {
      fetchCredits();
    } else {
      setCredits(0);
      setLoading(false);
    }
  }, [userId]);

  const fetchCredits = async () => {
    if (!userId) {
      console.log('No userId available, skipping credit fetch');
      return;
    }
    
    try {
      console.log('Fetching credits for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Supabase error fetching credits:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }
      
      console.log('Fetched credits data:', data);
      setCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast.error('Failed to load credits');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  const deductCredits = async (amount: number) => {
    if (!userId) {
      toast.error('You must be logged in to use credits');
      throw new Error('User not authenticated');
    }
    
    setLoading(true);
    try {
      // Get current credits
      const { data: currentProfile, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentCredits = currentProfile?.credits || 0;
      if (currentCredits < amount) {
        toast.error('Insufficient credits');
        throw new Error('Insufficient credits');
      }

      // Update credits
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: currentCredits - amount })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setCredits(currentCredits - amount);
      toast.success(`Credits deducted: ${amount} remaining`);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addCredits = async (amount: number) => {
    if (!userId) {
      toast.error('You must be logged in to add credits');
      throw new Error('User not authenticated');
    }
    
    setLoading(true);
    try {
      // Get current credits
      const { data: currentProfile, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentCredits = currentProfile?.credits || 0;
      const newCredits = currentCredits + amount;

      // Update credits
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setCredits(newCredits);
      toast.success(`Credits added: ${amount} total`);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    credits,
    loading,
    deductCredits,
    addCredits,
    refreshCredits: fetchCredits
  };
} 