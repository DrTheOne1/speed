import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';
import { Activity, CreditCard, Send, Users, FileText, Bell } from 'lucide-react';

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
  const { user: authUser, loading: authLoading } = useAuth();
  
  // Fix the queryFn to match your actual database columns
  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['user', authUser?.id],
    queryFn: async () => {
      console.log('Fetching user data for:', authUser?.id);
      if (!authUser) throw new Error('No authenticated user found');

      // First check if the user exists
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, credits, gateway_id, sender_names') // Changed to match your DB columns
        .eq('id', authUser.id)
        .single();
        
      if (error) {
        console.error('Error fetching user data:', error);
        
        // If user doesn't exist in the database yet
        if (error.code === 'PGRST116') {
          // Create new user record
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ 
              id: authUser.id,
              email: authUser.email,
              role: 'user',
              credits: 10 // Give new users some starting credits
            }])
            .select()
            .single();
            
          if (createError) {
            console.error('Failed to create user record:', createError);
            throw createError;
          }
          
          return newUser;
        }
        
        throw error;
      }
      
      return data;
    },
    enabled: !!authUser && !authLoading,
    retry: 1,
    retryDelay: 1000
  });

  // Add loading and error states
  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error('Dashboard error:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-4">
            {error instanceof Error ? error.message : 'Failed to load user data'}
          </p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Make sure to add a check for user data
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">No User Data Found</h2>
          <p className="text-gray-700 mb-4">
            We couldn't find your user information. Please try logging out and in again.
          </p>
        </div>
      </div>
    );
  }

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

  // Modify the activities query
  const { data: activities, isError: isActivitiesError } = useQuery<Activity[]>({
    queryKey: ['user-activities'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5);

        if (error) {
          // If the table doesn't exist, don't throw an error
          if (error.code === '42P01') { // Table doesn't exist
            console.log('Activities table not found, returning empty array');
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error('Error fetching activities:', err);
        return []; // Return empty array on error
      }
    },
    // Don't retry if the table doesn't exist
    retry: false
  });

  return (
    <div className={`container mx-auto px-4 py-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('dashboard.title')}
      </h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.welcome', { name: user?.email?.split('@')[0] || '' })}
        </h2>
      </div>

      {/* Credits Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">{t('dashboard.credits.title')}</h3>
          <p className="text-3xl font-bold">{user?.credits !== undefined ? user.credits : 'Loading...'}</p>
          <p className="text-gray-600">
            {t('dashboard.credits.remaining', { count: user?.credits || 0 })}
          </p>
          {(user?.credits || 0) < 50 && (
            <p className="text-amber-600 mt-2">{t('dashboard.credits.low')}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">{t('dashboard.stats.title')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('dashboard.stats.sent')}</span>
              <span className="font-semibold">{stats?.messagesSent || 0}</span>
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