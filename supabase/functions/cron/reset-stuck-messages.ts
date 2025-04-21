import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// This function will be called by the cron job
export async function resetStuckMessages() {
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
      console.error(`Failed to fetch stuck messages: ${fetchError.message}`);
      return;
    }

    if (!stuckMessages || stuckMessages.length === 0) {
      console.log('No stuck messages found');
      return;
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
      console.error(`Failed to reset stuck messages: ${updateError.message}`);
      return;
    }

    console.log(`Reset ${stuckMessages.length} stuck messages`);
  } catch (error) {
    console.error('Error in resetStuckMessages:', error);
  }
} 