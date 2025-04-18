import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useAdmin() {
  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ['check-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data?.role === 'admin';
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  });

  return { isAdmin, isLoading, error };
} 