import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  userData: any;
  credits: number;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  getSessionToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<any>;
  signInWithGithub: () => Promise<any>;
  resetPassword: (email: string, captchaToken?: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context for direct access if needed
export { AuthContext };

// Export the provider as a named export
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (id: string) => {
    try {
      // First try to get the user profile
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, credits, created_at, gateway_id, sender_names')
        .eq('id', id)
        .single();

      if (error) {
        // If the error is that no rows were found, create a profile for the user
        if (error.code === 'PGRST116') {
          console.log('No profile found, creating one for user:', id);
          
          // Get the user's email from the current session instead of admin API
          const { data: { session } } = await supabase.auth.getSession();
          const email = session?.user?.email;
          
          if (!email) {
            console.error('Could not get user email from session');
            throw new Error('Could not get user email from session');
          }
          
          // Create a new profile for the user
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id, 
                email, 
                role: 'user', 
                credits: 0,
                created_at: new Date().toISOString()
              }
            ])
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            throw createError;
          }
          
          // Set the user data with the newly created profile
          setUserData(newProfile);
          setCredits(newProfile?.credits || 0);
          return;
        }
        
        // For other errors, throw them
        throw error;
      }
      
      // If we got here, we have a valid profile
      setUserData(data);
      setCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
      setCredits(0);
    }
  };

  const refreshUserData = async () => {
    if (userId) {
      await fetchUserData(userId);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setUserId(currentUser?.id ?? null);
      setSession(session);
      
      if (currentUser?.id) {
        await fetchUserData(currentUser.id);
      } else {
        setUserData(null);
        setCredits(0);
      }
      
      setLoading(false);
    });

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
          setUserId(session.user.id);
          setSession(session);
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Error in initial session check:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error('No session returned');
      }

      setUser(data.user);
      setUserId(data.user.id);
      setSession(data.session);
      await fetchUserData(data.user.id);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserId(null);
      setUserData(null);
      setCredits(0);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const getSessionToken = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Get session error:', error);
        return null;
      }
      return session?.access_token ?? null;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata?.data || {}
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        setUser(data.user);
        setUserId(data.user.id);
        await fetchUserData(data.user.id);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signInWithGithub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string, captchaToken?: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  // Add login as an alias for signIn
  const login = signIn;

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        userData,
        credits,
        session,
        loading,
        signIn,
        login,
        signOut,
        signUp,
        getSessionToken,
        signInWithGoogle,
        signInWithGithub,
        resetPassword,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook as a named export
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}