import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

interface MessageDetails {
  segments: number;
  remaining: number;
  isGsm: boolean;
  charsPerSegment: number;
  totalChars: number;
  maxChars: number;
  exceedsLimit: boolean;
}

interface SMSCharacterCounterProps {
  messageDetails: MessageDetails;
  recipientCount: number;
}

export default function SMSCharacterCounter({ messageDetails, recipientCount }: SMSCharacterCounterProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex justify-between text-sm text-gray-500">
      <div>
        {t('sendGroupMessages.charactersRemaining', { count: messageDetails.remaining })}
      </div>
      <div>
        {messageDetails.segments > 1 && (
          <>
            {t('sendGroupMessages.messageWillBeSplit', { count: messageDetails.segments })}
            <span className="ml-2">
              ({t('sendGroupMessages.messagePoints', { points: messageDetails.segments * recipientCount })})
            </span>
          </>
        )}
      </div>
    </div>
  );
}