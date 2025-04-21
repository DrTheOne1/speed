import { QueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Update user credits with proper invalidation
 */
export async function updateUserCredits(userId: string, change: number, queryClient: QueryClient) {
  console.log(`Updating credits for user ${userId} with change: ${change}`);
  
  try {
    // Get current credits
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching credits:', error);
      return false;
    }
    
    // Calculate new credits value, prevent going below zero
    const currentCredits = typeof data?.credits === 'number' ? data.credits : 0;
    const newCredit = Math.max(0, currentCredits + change);
    console.log(`Updating credits: ${currentCredits} → ${newCredit} (change: ${change})`);
    
    // Update credits
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: newCredit
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating credits:', updateError);
      return false;
    }
    
    // Invalidate ALL queries that might contain user data
    console.log('Invalidating user queries to refresh data');
    queryClient.invalidateQueries({ queryKey: ['user-data'] });
    queryClient.invalidateQueries({ queryKey: ['user-data', userId] });
    queryClient.invalidateQueries({ queryKey: ['direct-user-credits', userId] });
    
    return true;
  } catch (error) {
    console.error('Exception in updateUserCredits:', error);
    return false;
  }
}