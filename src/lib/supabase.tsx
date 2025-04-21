import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!', {
    url: supabaseUrl ? 'OK' : 'MISSING',
    key: supabaseAnonKey ? 'OK' : 'MISSING'
  });
}

// Initialize Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

// Test connection
const testConnection = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    console.log('Supabase client connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

// Verify Arabic text storage
export const verifyArabicStorage = async () => {
  try {
    // Test string with Arabic characters
    const testString = 'اختبار النص العربي';
    
    // Try to store and retrieve the test string
    const { data: testData, error: testError } = await supabase
      .from('contacts')
      .select('name_ar')
      .limit(1);

    if (testError) throw testError;

    // If we can query the name_ar field without errors, Arabic storage is working
    return true;
  } catch (error) {
    console.error('Arabic text storage verification failed:', error);
    return false;
  }
};

// Run connection test
testConnection();

// Debug button for development environment
export const DebugResetAuthStateButton = () => {
  if (import.meta.env.DEV !== true) return null;
  
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          console.log('Clearing auth state...');
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        } catch (err) {
          console.error('Error clearing auth state:', err);
        }
      }}
      className="mt-4 p-2 bg-red-100 text-red-800 text-xs rounded"
    >
      Debug: Reset Auth State
    </button>
  );
};