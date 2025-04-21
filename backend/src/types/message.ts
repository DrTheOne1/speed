export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'scheduled' | 'cancelled';

export interface Message {
  id: string;
  user_id: string;
  recipient: string;
  message: string;
  status: MessageStatus;
  scheduled_for?: Date;
  created_at: Date;
  updated_at: Date;
} 