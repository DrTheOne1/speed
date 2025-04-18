-- Create test_arabic table
CREATE TABLE IF NOT EXISTS test_arabic (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to ensure test_arabic table exists
CREATE OR REPLACE FUNCTION create_test_arabic_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Table creation is handled by the IF NOT EXISTS clause above
  -- This function is just a placeholder to be called from the application
  RETURN;
END;
$$; 