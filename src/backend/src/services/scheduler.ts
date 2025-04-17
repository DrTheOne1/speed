import { supabase } from '../lib/supabase';
import { sendMessage } from './messageService';
import { logger } from '../utils/logger';

const CHECK_INTERVAL = 60000; // Check every minute
const MAX_RETRIES = 3;

export class MessageScheduler {
  private timer: NodeJS.Timer | null = null;

  async processScheduledMessages() {
    try {
      // Get all messages that are scheduled and due to be sent
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .in('status', ['scheduled', 'retry'])
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) {
        logger.error('Error fetching scheduled messages:', error);
        return;
      }

      if (!messages || messages.length === 0) {
        logger.debug('No scheduled messages to process');
        return;
      }

      logger.info(`Processing ${messages.length} scheduled messages`);

      for (const message of messages) {
        try {
          // Check retry count
          const retryCount = message.retry_count || 0;
          if (retryCount >= MAX_RETRIES) {
            logger.warn(`Message ${message.id} has exceeded maximum retries`);
            await supabase
              .from('messages')
              .update({ 
                status: 'failed',
                error_message: 'Exceeded maximum retry attempts'
              })
              .eq('id', message.id);
            continue;
          }

          // Update status to processing
          logger.info(`Processing message ${message.id} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await supabase
            .from('messages')
            .update({ 
              status: 'processing',
              retry_count: retryCount + 1,
              last_attempt: new Date().toISOString()
            })
            .eq('id', message.id);

          // Attempt to send the message
          await sendMessage(message);

          // Update status to sent
          await supabase
            .from('messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null // Clear any previous error messages
            })
            .eq('id', message.id);

          logger.info(`Successfully sent scheduled message ${message.id}`);
        } catch (error) {
          logger.error(`Failed to send scheduled message ${message.id}:`, error);
          
          const retryCount = message.retry_count || 0;
          const shouldRetry = retryCount < MAX_RETRIES;
          
          // Update status to retry or failed
          await supabase
            .from('messages')
            .update({ 
              status: shouldRetry ? 'retry' : 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              next_retry: shouldRetry ? new Date(Date.now() + 5 * 60000).toISOString() : null // Retry in 5 minutes
            })
            .eq('id', message.id);

          if (shouldRetry) {
            logger.info(`Scheduled retry for message ${message.id} in 5 minutes`);
          }
        }
      }
    } catch (error) {
      logger.error('Error in processScheduledMessages:', error);
    }
  }

  start() {
    if (this.timer) {
      return;
    }

    logger.info('Starting message scheduler');
    this.timer = setInterval(() => this.processScheduledMessages(), CHECK_INTERVAL);
    
    // Run immediately on start
    this.processScheduledMessages();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Stopped message scheduler');
    }
  }
}

export const messageScheduler = new MessageScheduler(); 