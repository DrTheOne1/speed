import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Set time limit for function execution
const EXECUTION_TIME_LIMIT = 2500;
const startTime = Date.now();
const isTimeRemaining = () => Date.now() - startTime < EXECUTION_TIME_LIMIT;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get all scheduled messages that are due to be sent
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'pending') // ✅ CORRECT
      .not('scheduled_for', 'is', null) // Only get messages that have a scheduled time
      .lte('scheduled_for', new Date().toISOString()); // Due now or in the past

    if (fetchError) throw fetchError;

    // Process each message
    for (const message of messages) {
      if (!isTimeRemaining()) break;
      
      try {
        // Update status to processing
        await supabase
          .from('messages')
          .update({ status: 'processing' })
          .eq('id', message.id);

        // Call the send-sms function for each message
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message_id: message.id,
            recipient: message.recipient,
            message: message.message,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        // Update status to sent
        await supabase
          .from('messages')
          .update({ status: 'sent' })
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

    return new Response(
      JSON.stringify({ success: true, processed: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Keep the provider functions unchanged
async function sendTwilioMessage(credentials, recipient, message, sender_id) {
  const accountSid = credentials.account_sid;
  const authToken = credentials.auth_token;
  const auth = btoa(`${accountSid}:${authToken}`);
  console.log(`Sending Twilio message to ${recipient} from ${sender_id}`);
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: recipient,
        From: sender_id,
        Body: message
      }).toString()
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error('Twilio API error:', responseData);
      throw new Error(responseData.message || 'Failed to send message through Twilio');
    }
    return responseData;
  } catch (error) {
    console.error('Twilio request failed:', error);
    throw error;
  }
}

async function sendMessageBirdMessage(credentials, recipient, message, sender_id) {
  console.log(`Sending MessageBird message to ${recipient} from ${sender_id}`);
  try {
    const response = await fetch('https://rest.messagebird.com/messages', {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${credentials.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipients: [recipient],
        originator: sender_id,
        body: message
      })
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error('MessageBird API error:', responseData);
      throw new Error(responseData.errors?.[0]?.description || 'Failed to send message through MessageBird');
    }
    return responseData;
  } catch (error) {
    console.error('MessageBird request failed:', error);
    throw error;
  }
}
