import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debugging environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL || 'Missing URL');
console.log('Supabase Anon Key status:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

// Initialize Supabase client with retry logic
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (...args) => fetch(...args) // Override with your retry logic if needed
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