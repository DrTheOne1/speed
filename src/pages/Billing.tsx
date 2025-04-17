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

        // Translate the plans content
        const translatedPlans = data.map(plan => ({
          ...plan,
          name: translateDynamicContent(plan.name, plan.translations),
          description: translateDynamicContent(plan.description, plan.translations),
          features: plan.features.map(feature => ({
            ...feature,
            text: translateDynamicContent(feature.text, feature.translations)
          }))
        }));

        setPlans(translatedPlans);
      } catch (err) {
        setError(t('billing.error.loading'));
        console.error('Error loading plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [language, t, translateDynamicContent]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {formatCurrency(plan.price, language)}
                </span>
                <span className="text-gray-600">/{getBillingCycle(plan.billing_cycle, language)}</span>
              </div>
              <ul className="mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
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
                    {feature.text}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                {t('billing.subscribe')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Billing;
