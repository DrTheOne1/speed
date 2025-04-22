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
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  getSessionToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<any>;
  signInWithGithub: () => Promise<any>;
  resetPassword: (email: string, captchaToken: string) => Promise<void>;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, credits, created_at, gateway_id, sender_names')
        .eq('id', id)
        .single();

      if (error) throw error;
      
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

    return () => subscription.unsubscribe();
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

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
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

  const resetPassword = async (email: string, captchaToken: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        captchaToken,
        redirectTo: 'https://sms-speed.netlify.app/reset-password'
      });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userId,
      userData,
      credits,
      session, 
      loading, 
      signIn, 
      signOut, 
      signUp, 
      getSessionToken, 
      signInWithGoogle, 
      signInWithGithub, 
      resetPassword,
      refreshUserData
    }}>
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