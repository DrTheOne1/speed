import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function processScheduledMessages() {
  try {
    // Get current time
    const now = new Date();
    
    // Find messages that are scheduled and due to be sent
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString());

    if (error) {
      console.error('Error fetching scheduled messages:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log('No scheduled messages to process');
      return;
    }

    console.log(`Processing ${messages.length} scheduled messages`);

    // Process each message
    for (const message of messages) {
      try {
        // Update status to processing
        await supabase
          .from('messages')
          .update({ status: 'processing' })
          .eq('id', message.id);

        // Call the send-sms function
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            ...corsHeaders,
          },
          body: JSON.stringify({
            messageId: message.id,
            to: message.to,
            body: message.body,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        // Update status to sent
        await supabase
          .from('messages')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        
        // Update status to failed
        await supabase
          .from('messages')
          .update({ 
            status: 'failed',
            error: error.message
          })
          .eq('id', message.id);
      }
    }

    console.log('Finished processing scheduled messages');
  } catch (error) {
    console.error('Error in processScheduledMessages:', error);
  }
} 