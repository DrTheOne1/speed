import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';

interface SenderNameDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export const SenderNameDropdown: React.FC<SenderNameDropdownProps> = ({
  value,
  onChange,
  className = '',
  required = true
}) => {
  const { t } = useTranslation();
  const { data: senders, isLoading } = useQuery({
    queryKey: ['senders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('senders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="w-100">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`form-select ${className}`}
        disabled={isLoading}
        required={required}
      >
        <option value="">{t('sendSMS.selectSender') || 'Select sender ID'}</option>
        {senders?.map((sender) => (
          <option key={sender.id} value={sender.id}>
            {sender.name}
          </option>
        ))}
      </select>
      
      {isLoading && (
        <div className="invalid-feedback d-block mt-2">
          {t('common.loading') || 'Loading...'}
        </div>
      )}
      
      {senders?.length === 0 && !isLoading && (
        <div className="invalid-feedback d-block mt-2">
          {t('sendSMS.configureSenderIdsFirst') || 'Please configure sender IDs first'}
        </div>
      )}
    </div>
  );
};