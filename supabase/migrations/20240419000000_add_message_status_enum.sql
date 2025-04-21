-- Create the message_status enum type
CREATE TYPE message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'scheduled',
  'cancelled'
);

-- Update the messages table to use the new enum type
ALTER TABLE messages 
  ALTER COLUMN status TYPE message_status 
  USING status::message_status;

-- Add a check constraint to ensure only valid statuses are used
ALTER TABLE messages
  ADD CONSTRAINT messages_status_check 
  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'scheduled', 'cancelled')); 