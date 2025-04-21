import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface RequestBody {
  gateway_id: string;
  recipient: string;
  message: string;
  sender_id: string;
  message_id: string;
  scheduled_for?: string | null;
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Check if the request is from the scheduled messages function
    const isScheduledMessage = req.headers.get('Authorization')?.includes(SUPABASE_SERVICE_ROLE_KEY);
    const userId = isScheduledMessage ? req.headers.get('X-User-Id') : null;

    // Create appropriate Supabase client based on the request source
    const supabaseClient = createClient(
      SUPABASE_URL,
      isScheduledMessage ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    let user;
    if (isScheduledMessage && userId) {
      // For scheduled messages, get the user directly using the service role
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }
      user = { id: userId };
    } else {
      // For direct API calls, get the user from the auth token
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authUser) {
        throw new Error('Unauthorized');
      }
      user = authUser;
    }

    // Parse the request body
    const { gateway_id, recipient, message, sender_id, message_id } = await req.json() as RequestBody;

    // Validate required fields
    if (!gateway_id || !recipient || !message || !sender_id || !message_id) {
      throw new Error('Missing required fields');
    }

    // Get the gateway configuration
    const { data: gateway, error: gatewayError } = await supabaseClient
      .from('gateways')
      .select('*')
      .eq('id', gateway_id)
      .single();

    if (gatewayError || !gateway) {
      throw new Error('Gateway not found');
    }

    // Check if the user has access to this gateway
    const { data: userGateway, error: userGatewayError } = await supabaseClient
      .from('user_gateways')
      .select('*')
      .eq('user_id', user.id)
      .eq('gateway_id', gateway_id)
      .single();

    if (userGatewayError || !userGateway) {
      throw new Error('User does not have access to this gateway');
    }

    // Check if the sender_id is allowed for this gateway
    const { data: senderNames, error: senderNamesError } = await supabaseClient
      .from('users')
      .select('sender_names')
      .eq('id', user.id)
      .single();

    if (senderNamesError || !senderNames?.sender_names?.includes(sender_id)) {
      throw new Error('Sender ID not allowed for this user');
    }

    // Send the message using the gateway's API
    const gatewayResponse = await fetch(gateway.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gateway.api_key}`,
      },
      body: JSON.stringify({
        recipient,
        message,
        sender_id,
      }),
    });

    if (!gatewayResponse.ok) {
      let errorData;
      try {
        errorData = await gatewayResponse.json();
      } catch (e) {
        errorData = { message: 'Failed to parse gateway response' };
      }
      throw new Error(errorData.message || `Gateway returned status ${gatewayResponse.status}`);
    }

    // Update the message status to sent
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', message_id);

    if (updateError) {
      throw new Error('Failed to update message status');
    }

    return new Response(
      JSON.stringify({ message: 'Message sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log the error for debugging
    console.error('Error sending message:', error);

    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred',
        details: error.stack
      }),
      { 
        status: error.message?.includes('Unauthorized') ? 401 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}); 