import { resetStuckMessages } from './reset-stuck-messages.ts';
import { processScheduledMessages } from './process-scheduled-messages.ts';

// Cron job configuration
export const cronJobs = [
  {
    name: 'process-scheduled-messages',
    schedule: '*/1 * * * *', // Run every minute
    handler: processScheduledMessages
  },
  {
    name: 'reset-stuck-messages',
    schedule: '*/5 * * * *', // Run every 5 minutes
    handler: resetStuckMessages
  }
]; 