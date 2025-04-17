import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';

export default function Settings() {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isRTL = language === 'ar';
  const textDirection = isRTL ? 'rtl' : 'ltr';

  const { data: user, refetch } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Add settings update logic here
      await refetch();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert(t('settings.messages.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${textDirection}`} dir={textDirection}>
      <h1 className="text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>
      
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            {t('settings.accountInfo.title')}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{t('settings.accountInfo.description')}</p>
          </div>
          <form className="mt-5 space-y-6" onSubmit={handleUpdateSettings}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('settings.accountInfo.email')}
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={user?.email}
                disabled
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-gray-50 ${textDirection}`}
                dir={textDirection}
              />
            </div>

            <div>
              <label htmlFor="credits" className="block text-sm font-medium text-gray-700">
                {t('settings.accountInfo.credits')}
              </label>
              <input
                type="number"
                name="credits"
                id="credits"
                value={user?.credits}
                disabled
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-gray-50 ${textDirection}`}
                dir={textDirection}
              />
            </div>

            <div className="pt-5">
              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? t('settings.actions.saving') : t('settings.actions.save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}