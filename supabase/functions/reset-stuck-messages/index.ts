import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find messages stuck in processing state for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckMessages, error: fetchError } = await supabaseClient
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'processing')
      .lt('last_attempt', fiveMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stuck messages: ${fetchError.message}`);
    }

    if (!stuckMessages || stuckMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No stuck messages found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reset stuck messages to pending state
    const { error: updateError } = await supabaseClient
      .from('scheduled_messages')
      .update({
        status: 'pending',
        error_message: 'Reset due to timeout'
      })
      .in('id', stuckMessages.map(m => m.id));

    if (updateError) {
      throw new Error(`Failed to reset stuck messages: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: `Reset ${stuckMessages.length} stuck messages`,
        resetMessages: stuckMessages.map(m => ({ id: m.id }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 