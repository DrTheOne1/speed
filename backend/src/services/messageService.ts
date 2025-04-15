import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface Message {
  id: string;
  user_id: string;
  gateway_id: string;
  sender_id: string;
  recipient: string;
  message: string;
  status: string;
  scheduled_for: string | null;
}

export async function sendMessage(message: Message): Promise<void> {
  try {
    // Get gateway details
    const { data: gateway, error: gatewayError } = await supabase
      .from('gateways')
      .select('*')
      .eq('id', message.gateway_id)
      .single();

    if (gatewayError || !gateway) {
      throw new Error(`Gateway not found: ${gatewayError?.message}`);
    }

    // Get user details for credits check
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', message.user_id)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`);
    }

    if (user.credits <= 0) {
      throw new Error('Insufficient credits');
    }

    // Call the appropriate Edge Function based on gateway type
    const endpoint = gateway.provider === 'whatsapp' ? 'send-whatsapp-message' : 'send-twilio-sms';
    
    // Get auth session for Edge Function call
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication error');
    }

    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway_id: message.gateway_id,
          sender_id: message.sender_id,
          recipient: message.recipient,
          message: message.message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    // Deduct credit after successful send
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', message.user_id);

    if (creditError) {
      logger.error('Failed to deduct credit:', creditError);
      // Note: Message was sent but credit deduction failed
      // You might want to handle this case differently
    }

  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
} 