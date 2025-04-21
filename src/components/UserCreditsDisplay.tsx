import React, { useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UserCreditsDisplayProps {
  className?: string;
}

export function UserCreditsDisplay({ className = '' }: UserCreditsDisplayProps) {
  const { t } = useTranslation();
  const { userData, credits, isLoading, refreshUserData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Function to directly fetch credits from the database
  const handleRefresh = async () => {
    if (!userData?.id) return;
    
    setRefreshing(true);
    try {
      console.log('Manually refreshing credits for user:', userData.id);
      
      // Direct database fetch for debugging
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userData.id)
        .single();
        
      if (error) {
        console.error('Error fetching credits:', error);
      } else {
        console.log('Credits data from direct query:', data);
        
        // Refresh all queries that might contain user data
        queryClient.invalidateQueries(['user-session']);
        queryClient.invalidateQueries(['dashboard-data']);
        
        // Call the refresh function from auth context
        await refreshUserData();
      }
    } finally {
      setRefreshing(false);
    }
  };
  
  return (
    <div className={`bg-gray-50 p-4 rounded-md flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
        <span>
          {isLoading || refreshing
            ? t('common.loading')
            : typeof credits === 'number'
              ? t('common.credits', { credits })
              : t('common.noCredits')}
        </span>
      </div>
      
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="p-1 hover:bg-gray-200 rounded-full"
        title={t('common.refresh')}
      >
        <RefreshCw 
          className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`}
        />
      </button>
    </div>
  );
}