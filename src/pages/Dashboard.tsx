import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { Activity, CreditCard, Send, Users, FileText, Bell, Wallet } from 'lucide-react';
import { useCredits } from '../hooks/useCredits';

interface UserStats {
  messagesSent: number;
  deliveryRate: number;
  failedCount: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function Dashboard() {
  const { t, language } = useTranslation();
  const { credits, loading: creditsLoading } = useCredits();
  
  // Get user data
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No user found');

      const { data, error } = await supabase
        .from('users')
        .select('id, name, credits')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Get user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      // Replace with your actual API call or database query
      return {
        messagesSent: 156,
        deliveryRate: 98.2,
        failedCount: 3
      };
    }
  });

  // Get recent activities
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ['user-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className={`container mx-auto px-4 py-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('dashboard.title')}
      </h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.welcome', { name: user?.name || '' })}
        </h2>
      </div>

      {/* Credits Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">{t('dashboard.credits.title')}</h3>
          <div className="flex items-center justify-between">
            {creditsLoading ? (
              <div className="flex items-center">
                <div className="animate-pulse h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded mr-2"></div>
                <div className="animate-pulse h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : (
              <div className="flex items-center">
                <Wallet className={`h-8 w-8 mr-2 ${credits <= 51 ? 'text-red-500' : 'text-green-500'}`} />
                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {credits}
                </span>
              </div>
            )}
          </div>
          {!creditsLoading && credits <= 50 && (
            <p className="text-amber-600 mt-2">{t('dashboard.credits.low')}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">{t('dashboard.stats.title')}</h3>
          <div className="space-y-3">
            <div className="stat">
              <div className="stat-title">{t('dashboard.stats.sent')}</div>
              <div className="stat-value">{stats?.messagesSent || '0'}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('dashboard.stats.delivered')}</span>
              <span className="font-semibold">{stats?.deliveryRate || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('dashboard.stats.failed')}</span>
              <span className="font-semibold">{stats?.failedCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">{t('dashboard.quickActions.title')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <a 
              href="/send" 
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <Send size={18} />
              <span>{t('dashboard.quickActions.send')}</span>
            </a>
            <a 
              href="/contacts" 
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <Users size={18} />
              <span>{t('dashboard.quickActions.contacts')}</span>
            </a>
            <a 
              href="/templates" 
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <FileText size={18} />
              <span>{t('dashboard.quickActions.templates')}</span>
            </a>
            <a 
              href="/billing" 
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <CreditCard size={18} />
              <span>{t('dashboard.quickActions.billing')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{t('dashboard.activity.title')}</h3>
            <a href="/activity" className="text-indigo-600 text-sm">
              {t('dashboard.activity.seeAll')}
            </a>
          </div>
          
          {activities && activities.length > 0 ? (
            <ul className="space-y-4">
              {activities.map(activity => (
                <li key={activity.id} className="flex items-start gap-3">
                  <Activity size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString(
                        language === 'en' ? 'en-US' : 
                        language === 'sv' ? 'sv-SE' : 'ar-SA'
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">{t('dashboard.activity.empty')}</p>
          )}
        </div>

        {/* Alerts/Notifications */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{t('dashboard.alerts.title')}</h3>
            <Bell size={18} className="text-gray-400" />
          </div>
          
          <p className="text-gray-500">{t('dashboard.alerts.empty')}</p>
        </div>
      </div>
    </div>
  );
}