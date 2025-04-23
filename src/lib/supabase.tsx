import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!');
}

// Initialize Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
);

export const verifyArabicStorage = async (text: string) => {
  try {
    // Check if text contains Arabic characters
    const containsArabic = /[\u0600-\u06FF]/.test(text);
    
    // If there are Arabic characters, verify storage supports them
    if (containsArabic) {
      // This is just a simple verification - your actual implementation might differ
      const testKey = `arabic_test_${Date.now()}`;
      const { error: insertError } = await supabase
        .from('arabic_test')
        .insert({ id: testKey, text: text })
        .select()
        .single();
      
      if (insertError) {
        return false;
      }
      
      // Clean up the test entry
      await supabase.from('arabic_test').delete().eq('id', testKey);
      
      return true;
    }
    
    // No Arabic characters, no need to verify
    return true;
  } catch (error) {
    return false;
  }
};