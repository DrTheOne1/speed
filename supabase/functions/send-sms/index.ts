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
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the auth token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const { gateway_id, recipient, message, sender_id, message_id, scheduled_for } = await req.json() as RequestBody;

    // Validate required fields
    if (!gateway_id || !recipient || !message || !sender_id || !message_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the gateway configuration
    const { data: gateway, error: gatewayError } = await supabaseClient
      .from('gateways')
      .select('*')
      .eq('id', gateway_id)
      .single();

    if (gatewayError || !gateway) {
      return new Response(
        JSON.stringify({ error: 'Gateway not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user has access to this gateway
    const { data: userGateway, error: userGatewayError } = await supabaseClient
      .from('user_gateways')
      .select('*')
      .eq('user_id', user.id)
      .eq('gateway_id', gateway_id)
      .single();

    if (userGatewayError || !userGateway) {
      return new Response(
        JSON.stringify({ error: 'User does not have access to this gateway' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the sender_id is allowed for this gateway
    const { data: senderNames, error: senderNamesError } = await supabaseClient
      .from('users')
      .select('sender_names')
      .eq('id', user.id)
      .single();

    if (senderNamesError || !senderNames?.sender_names?.includes(sender_id)) {
      return new Response(
        JSON.stringify({ error: 'Sender ID not allowed for this user' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If the message is scheduled, update the message status
    if (scheduled_for) {
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({ status: 'scheduled' })
        .eq('id', message_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update message status' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Message scheduled successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send the message using the gateway's API
    const response = await fetch(gateway.api_url, {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send message');
    }

    // Update the message status to sent
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({ status: 'sent' })
      .eq('id', message_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update message status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Message sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 