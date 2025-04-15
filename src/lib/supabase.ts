import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const SUPABASE_URL = 'https://beprcpsbdanaxmjjleaw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcHJjcHNiZGFuYXhtampsZWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MTcwNjEsImV4cCI6MjA1OTk5MzA2MX0.4ZfsLijnt1Wml3nMcclOrNvvYHF1orjpmAA5Mofp-Tc';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcHJjcHNiZGFuYXhtampsZWF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQxNzA2MSwiZXhwIjoyMDU5OTkzMDYxfQ.f7VmacopyUas45ErJZAzhGcHmdKCL9Pai4fh0EF6VuU';

// Initialize Supabase clients
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test the connection
const testConnection = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

// Test admin connection
const testAdminConnection = async () => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    console.log('Supabase admin connection successful');
    return true;
  } catch (error) {
    console.error('Supabase admin connection test failed:', error);
    return false;
  }
};

// Run connection tests
testConnection();
testAdminConnection();

export { supabase, supabaseAdmin };