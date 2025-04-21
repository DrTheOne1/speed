import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { CreditCard, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SendSMS() {
  const { t, language, direction } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    getCurrentUser();
  }, []);
  
  // Query for user credits
  const { data: userData } = useQuery({
    queryKey: ['user-credits', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Mutation for sending SMS
  const sendSMSMutation = useMutation({
    mutationFn: async (data) => {
      // Your existing implementation
    },
    onSuccess: () => {
      // Your existing success handler
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('sendSMS.title')}
        </h1>
        
        <div className="bg-white py-2 px-4 rounded-full shadow border border-gray-200 flex items-center">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <span className="font-medium">
            {userData?.credits !== undefined 
              ? `${t('dashboard.credits.title')}: ${userData.credits}`
              : t('dashboard.credits.loading')}
          </span>
          {(userData?.credits || 0) < 50 && (
            <span className="ml-2 text-amber-600">
              ({t('dashboard.credits.low')})
            </span>
          )}
        </div>
      </div>
      
      {/* Rest of your form */}
    </div>
  );
}