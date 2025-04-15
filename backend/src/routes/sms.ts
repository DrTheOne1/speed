import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../server';
import { AuthenticatedRequest } from '../types';
import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express';

const router = Router();

type AuthenticatedRequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

const sendSMS: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    const { gateway_id, recipient, message, scheduled_for } = req.body;
    const user = req.user;
    
    // Validate required fields
    if (!gateway_id || !recipient || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get gateway details
    const { data: gateway, error: gatewayError } = await supabase
      .from('gateways')
      .select('*')
      .eq('id', gateway_id)
      .single();

    if (gatewayError || !gateway) {
      res.status(404).json({ error: 'Gateway not found' });
      return;
    }

    // Create message record
    const { data: messageData, error: dbError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        gateway_id,
        recipient,
        message,
        scheduled_for: scheduled_for || null,
        status: 'pending',
        sender_id: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: dbError.message });
      return;
    }

    // Send message based on gateway type
    const endpoint = gateway.provider === 'whatsapp_twilio' ? 'send-whatsapp-message' : 'send-twilio-sms';
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway_id,
          recipient,
          message,
          scheduled_for
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      res.status(response.status).json({ error: error.error || 'Failed to send message' });
      return;
    }

    res.json({ message: 'Message sent successfully', data: messageData });
  } catch (error) {
    next(error);
  }
};

const getMessages: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

router.post('/send', authenticateToken as RequestHandler, sendSMS as RequestHandler);
router.get('/messages', authenticateToken as RequestHandler, getMessages as RequestHandler);

export default router; 