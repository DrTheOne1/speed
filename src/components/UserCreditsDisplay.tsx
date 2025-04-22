import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UserCreditsDisplayProps {
  className?: string;
  fallbackText?: {
    loading?: string;
    credits?: string;
    noCredits?: string;
    noUser?: string;
    refreshError?: string;
    generalError?: string;
  };
}

export function UserCreditsDisplay({ 
  className = '',
  fallbackText = {}
}: UserCreditsDisplayProps) {
  // Apply fallback texts
  const defaultFallbacks = {
    loading: 'Loading...',
    credits: '{credits} credits',
    noCredits: 'No credits available',
    noUser: 'No user logged in',
    refreshError: 'Failed to refresh credits',
    generalError: 'An error occurred during refresh'
  };
  
  const texts = { ...defaultFallbacks, ...fallbackText };
  
  // Get translations with fallbacks
  const { t } = useTranslation();
  const getText = useCallback((key: string, fallback: string, params?: Record<string, any>) => {
    try {
      const translated = t(key, params);
      return (typeof translated === 'string' && translated !== key) ? translated : fallback;
    } catch (e) {
      return fallback;
    }
  }, [t]);

  // Safe auth state access
  const auth = useAuth();
  const user = auth?.user || auth?.userData || null;
  const credits = typeof auth?.credits === 'number' ? auth.credits : 0;
  const isLoading = Boolean(auth?.isLoading || auth?.loading);
  const refreshUserData = typeof auth?.refreshUserData === 'function' 
    ? auth.refreshUserData 
    : async () => {};
  
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(true);
  const queryClient = useQueryClient();
  
  // Check if component is still mounted before setting state
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Auto-dismiss error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (mounted) setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, mounted]);
  
  const handleRefresh = async () => {
    const userId = user?.id;
    if (!userId) {
      setError(getText('userCredits.errors.noUser', texts.noUser));
      return;
    }
    
    if (mounted) {
      setError(null);
      setRefreshing(true);
    }
    
    try {
      console.log('Manually refreshing credits for user:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching credits:', error);
        if (mounted) setError(getText('userCredits.errors.refresh', texts.refreshError));
        return;
      }
      
      console.log('Credits data from direct query:', data);
      
      // Safely invalidate queries
      try {
        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['user-session']);
        queryClient.invalidateQueries(['dashboard-data']);
      } catch (err) {
        console.error('Error invalidating queries:', err);
      }
      
      // Refresh user data with error handling
      try {
        await refreshUserData();
      } catch (refreshErr) {
        console.error('Error in refreshUserData:', refreshErr);
      }
      
    } catch (err) {
      console.error('Exception during refresh:', err);
      if (mounted) setError(getText('userCredits.errors.general', texts.generalError));
    } finally {
      if (mounted) setRefreshing(false);
    }
  };
  
  // Format credits display with translation fallback
  const getCreditsDisplay = useCallback(() => {
    if (isLoading || refreshing) {
      return getText('common.loading', texts.loading);
    }
    
    if (typeof credits === 'number') {
      return getText('common.credits', texts.credits, { credits });
    }
    
    return getText('common.noCredits', texts.noCredits);
  }, [credits, isLoading, refreshing, getText, texts]);

  return (
    <div className={`bg-gray-50 p-4 rounded-md flex flex-col ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
          <span data-testid="credits-display">
            {getCreditsDisplay()}
          </span>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing || isLoading || !user?.id}
          className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-50"
          title={getText('common.refresh', 'Refresh')}
          aria-label={getText('common.refresh', 'Refresh')}
          data-testid="refresh-credits"
        >
          <RefreshCw 
            className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`}
          />
        </button>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center" data-testid="credits-error">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}