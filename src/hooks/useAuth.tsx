import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

// Create a typed context for auth
interface AuthContextType {
  userId: string | null;
  userData: any;
  credits: number;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  userData: null,
  credits: 0,
  isLoading: true,
  isAuthenticated: false
});

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  // Fetch the session when the component mounts
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUserId(data.session.user.id);
        }
      } catch (error) {
        console.error('Error fetching auth session:', error);
      } finally {
        setSessionLoading(false);
      }
    };
    
    fetchSession();
    
    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setUserId(session?.user?.id || null);
      setSessionLoading(false);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);
  
  // Fetch user data including credits
  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ['user-data', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      console.log('Fetching user data for ID:', userId);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching user data:', error);
          throw error;
        }
        
        console.log('User data fetched:', data);
        return data;
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        throw err;
      }
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const value = {
    userId,
    userData,
    credits: userData?.credits || 0,
    isLoading: sessionLoading || userDataLoading,
    isAuthenticated: !!userId
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}