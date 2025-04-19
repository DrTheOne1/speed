import { useState, useEffect } from 'react';
import { CreditCard, Package, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useDynamicTranslation } from '../utils/translation';
import { useTranslation } from '../contexts/TranslationContext';

// Add formatCurrency helper function
const formatCurrency = (amount: number, language: string) => {
  const locales = {
    en: 'en-US',
    sv: 'sv-SE',
    ar: 'ar-SA'
  };
  
  return new Intl.NumberFormat(locales[language as keyof typeof locales], {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Make sure this function handles translation correctly
const translateDynamicContent = (content, translations) => {
  // Add debugging
  console.log('Translating content:', { content, translations, currentLanguage: language });
  
  // Handle null/undefined content
  if (!content) return '';
  
  // If it's a simple string with no translations
  if (!translations) return content;
  
  // If translations exist in the expected format
  if (translations[language]) {
    return translations[language];
  }
  
  // Fallback to English or original content
  return translations.en || content;
};

// Add translation helper function
const getTranslatedContent = (content: any, field: string, language: string) => {
  if (!content?.translations?.[field]) {
    return content[field];
  }
  return content.translations[field][language] || 
         content.translations[field]['en'] || 
         content[field];
};

interface User {
  id: string;
  credits: number;
}

interface Feature {
  text: string;
  translations?: {
    en: string;
    sv: string;
    ar: string;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  billing_cycle: string;
  features: Feature[];
  is_active: boolean;
  translations?: {
    name: {
      en: string;
      sv: string;
      ar: string;
    };
    description: {
      en: string;
      sv: string;
      ar: string;
    };
    features?: {
      [key: string]: {
        en: string;
        sv: string;
        ar: string;
      };
    };
  };
}

const Billing = () => {
  const { t, language } = useTranslation();
  const { translateDynamicContent } = useDynamicTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'quarterly'>('monthly');

  const { data: user } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No user found');

      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      return { id: authUser.id, credits: data.credits };
    }
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price', { ascending: true });

        if (error) throw error;
        
        // Log raw data for debugging
        console.log('Raw plans structure:', data);

        const translatedPlans = data.map(plan => {
          // Debug each plan structure
          console.log(`Processing plan: ${plan.id}`, plan);
          
          // Check features structure
          console.log('Features structure:', plan.features);
          
          return {
            ...plan,
            name: plan.name || 'Plan',
            description: plan.description || '',
            features: Array.isArray(plan.features) 
              ? plan.features.map((feature, index) => {
                  // Feature could be a string or an object
                  if (typeof feature === 'string') {
                    return { text: feature };
                  }
                  
                  // Handle feature object with translations
                  if (typeof feature === 'object') {
                    // Check if feature.translations exists
                    if (feature.translations) {
                      // Try to get translated version based on current language
                      const translatedText = feature.translations[language] || 
                                            feature.translations.en || 
                                            feature.text || 
                                            `Feature ${index+1}`;
                      return { ...feature, text: translatedText };
                    }
                    
                    // If no translations, use text or default
                    return { ...feature, text: feature.text || `Feature ${index+1}` };
                  }
                  
                  // Fallback for any other format
                  return { text: `Feature ${index+1}` };
                })
              : []
          };
        });

        console.log('Translated plans:', translatedPlans);
        setPlans(translatedPlans);
      } catch (err) {
        console.error('Error loading plans:', err);
        setError(t('billing.error.loading'));
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [language, t]);

  // Billing cycle translations
  const getBillingCycle = (cycle: string, lang: string) => {
    const translations: Record<string, Record<string, string>> = {
      monthly: {
        en: 'month',
        sv: 'månad',
        ar: 'شهر'
      },
      yearly: {
        en: 'year',
        sv: 'år',
        ar: 'سنة'
      },
      quarterly: {
        en: 'quarter',
        sv: 'kvartal',
        ar: 'ربع سنة'
      }
    };
    return translations[cycle]?.[lang] || translations[cycle]?.en || cycle;
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      const translatedPlan = {
        ...plan,
        name: translateDynamicContent(plan.translations?.name || plan.name),
        description: translateDynamicContent(plan.translations?.description || plan.description),
        features: plan.features.map((feature: Feature) => ({
          ...feature,
          text: translateDynamicContent(feature.translations || feature.text)
        }))
      };
      setSelectedPlan(translatedPlan);
      // Implement Stripe integration here
      alert(t('billing.payment.redirecting'));
    } catch (error) {
      console.error('Error preparing subscription:', error);
      setError(t('billing.error.payment'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('billing.title')}</h1>
      <p className="text-gray-600 mb-8">{t('billing.description')}</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full ${
                selectedPlan?.id === plan.id 
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                  : 'border-gray-200'
              }`}
            >
              {/* Plan header */}
              <div className="mb-4">
                {selectedPlan?.id === plan.id && (
                  <span className="inline-block px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full mb-2">
                    {t('billing.selected')}
                  </span>
                )}
                <h2 className="text-xl font-bold mb-2">{plan.name || 'Plan'}</h2>
                <p className="text-gray-600 text-sm min-h-[40px]">{plan.description || 'No description available'}</p>
              </div>
              
              {/* Plan pricing */}
              <div className="mb-4 pb-2 border-b">
                <span className="text-3xl font-bold">
                  {formatCurrency(plan.price || 0, language)}
                </span>
                <span className="text-gray-600">/{getBillingCycle(plan.billing_cycle || 'monthly', language)}</span>
              </div>
              
              {/* Plan features */}
              <div className="flex-grow">
                <ul className="mb-6">
                  {Array.isArray(plan.features) && plan.features.length > 0 ? (
                    plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start mb-2">
                        <svg
                          className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${
                            selectedPlan?.id === plan.id ? 'text-blue-500' : 'text-green-500'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm">
                          {/* More robust display of feature text */}
                          {typeof feature === 'string' ? feature : 
                           feature?.text || `Feature ${index+1}`}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">No features available</li>
                  )}
                </ul>
              </div>
              
              {/* Button - always at the bottom */}
              <div className="mt-auto pt-2">
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-2 px-4 rounded transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {selectedPlan?.id === plan.id ? t('billing.current') : t('billing.subscribe')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Billing;
