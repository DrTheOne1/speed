-- Create scheduled_messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    gateway_id UUID REFERENCES gateways(id) NOT NULL,
    sender_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    next_retry TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX idx_scheduled_messages_user_id ON scheduled_messages(user_id);

-- Add RLS policies
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own scheduled messages
CREATE POLICY "Users can view their own scheduled messages"
    ON scheduled_messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for users to insert their own scheduled messages
CREATE POLICY "Users can insert their own scheduled messages"
    ON scheduled_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own scheduled messages
CREATE POLICY "Users can update their own scheduled messages"
    ON scheduled_messages
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy for users to delete their own scheduled messages
CREATE POLICY "Users can delete their own scheduled messages"
    ON scheduled_messages
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
    BEFORE UPDATE ON scheduled_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 