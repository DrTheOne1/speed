import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get messages that need to be sent
    const now = new Date()
    const { data: messagesToSend, error } = await supabase
      .from('messages')
      .select('id, recipient, message, sender_id, gateway_id, user_id')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
    
    if (error) throw error
    
    const results = []
    for (const message of messagesToSend || []) {
      try {
        // Get the user's auth data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', message.user_id)
          .single()
        
        if (userError) throw new Error(`Failed to get user data: ${userError.message}`)
        
        // Send the message using the send-sms endpoint
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/send-sms`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'X-User-Id': message.user_id, // Pass the user ID for authentication
            },
            body: JSON.stringify({
              gateway_id: message.gateway_id,
              sender_id: message.sender_id,
              recipient: message.recipient,
              message: message.message,
              message_id: message.id
            }),
          }
        )
        
        let responseData
        try {
          responseData = await response.json()
        } catch (e) {
          responseData = { error: 'Failed to parse response' }
        }
        
        // Update message status
        const status = response.ok ? 'sent' : 'failed'
        const errorMessage = !response.ok ? (responseData?.error || 'Unknown error') : null
        
        await supabase
          .from('messages')
          .update({ 
            status,
            sent_at: response.ok ? now.toISOString() : null,
            error_message: errorMessage
          })
          .eq('id', message.id)
          
        results.push({ 
          id: message.id, 
          status, 
          success: response.ok,
          error: errorMessage
        })
      } catch (err) {
        // Handle errors
        const errorMessage = err.message || 'Unknown error occurred'
        await supabase
          .from('messages')
          .update({ 
            status: 'failed', 
            error_message: errorMessage,
            sent_at: null
          })
          .eq('id', message.id)
          
        results.push({ 
          id: message.id, 
          status: 'failed', 
          error: errorMessage 
        })
      }
    }
    
    return new Response(
      JSON.stringify({ processed: messagesToSend?.length || 0, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})