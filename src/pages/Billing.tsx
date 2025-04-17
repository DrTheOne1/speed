import { useState, useEffect } from 'react';
import { CreditCard, Package, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../contexts/TranslationContext';
import { useClientTranslation } from '../hooks/useClientTranslation';

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

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  billing_cycle: string;
  features: string[];
  is_active: boolean;
  translations: {
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
  };
}

export default function Billing() {
  const { t, language } = useTranslation();
  const { translateText } = useClientTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});

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

  // Fetch plans
  const { data: plans, isLoading: plansLoading, error: plansError } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    }
  });

  // Translate plan content when language changes
  useEffect(() => {
    if (!plans || language === 'en') {
      setTranslations({});
      return;
    }

    const translatePlans = async () => {
      const newTranslations: Record<string, string> = {};

      for (const plan of plans) {
        try {
          // First check if translations exist in the database
          if (plan.translations?.name?.[language] && plan.translations?.description?.[language]) {
            // Use database translations if available
            newTranslations[`name-${plan.id}`] = plan.translations.name[language];
            newTranslations[`desc-${plan.id}`] = plan.translations.description[language];
          } else {
            // Fall back to client-side translation
            const [translatedName, translatedDesc] = await Promise.all([
              translateText(plan.name, language as 'sv' | 'ar'),
              translateText(plan.description, language as 'sv' | 'ar')
            ]);

            newTranslations[`name-${plan.id}`] = translatedName;
            newTranslations[`desc-${plan.id}`] = translatedDesc;
          }

          // Also translate any other database fields that need translation
          // For example, if plan has custom fields:
          if (plan.custom_text) {
            newTranslations[`custom-${plan.id}`] = await translateText(
              plan.custom_text, 
              language as 'sv' | 'ar'
            );
          }
        } catch (error) {
          console.error('Translation error for plan:', plan.id, error);
          // Use the original text as fallback
          newTranslations[`name-${plan.id}`] = plan.name;
          newTranslations[`desc-${plan.id}`] = plan.description;
        }
      }

      setTranslations(newTranslations);
    };

    translatePlans();
  }, [plans, language, translateText]);

  // Billing cycle translations
  const getBillingCycle = (cycle: string) => {
    const translations = {
      monthly: {
        en: 'Monthly',
        sv: 'Månadsvis',
        ar: 'شهريا'
      },
      yearly: {
        en: 'Yearly',
        sv: 'Årligen',
        ar: 'سنويا'
      },
      quarterly: {
        en: 'Quarterly',
        sv: 'Kvartalsvis',
        ar: 'ربع سنوي'
      }
    };
    
    const cycleKey = cycle.toLowerCase() as keyof typeof translations;
    return translations[cycleKey]?.[language] || cycle;
  };

  const handlePurchase = async (planName: string) => {
    try {
      // Implement Stripe integration here
      alert(t('billing.payment.redirecting'));
    } catch (error) {
      console.error('Error:', error);
      alert(t('billing.payment.failed'));
    }
  };

  // Show error state
  if (plansError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          {t('billing.errors.loadingFailed')}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('billing.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('billing.description')}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {plansLoading ? (
            <div className="col-span-full text-center text-gray-500">
              {t('billing.loadingPlans')}
            </div>
          ) : plans?.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">
              {t('billing.noPlansAvailable')}
            </div>
          ) : (
            plans?.map((plan) => (
              <div 
                key={plan.id}
                className="relative p-6 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-[400px]"
              >
                {/* Plan Details */}
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {language === 'en' ? plan.name : 
                       (plan.translations?.name?.[language] || 
                        translations[`name-${plan.id}`] || 
                        plan.name)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === 'en' ? plan.description : 
                       (plan.translations?.description?.[language] || 
                        translations[`desc-${plan.id}`] || 
                        plan.description)}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(plan.price, language)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getBillingCycle(plan.billing_cycle)}
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600">
                          {t(`billing.features.${feature}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Subscribe Button */}
                <div className="mt-6">
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    {t('billing.subscribe')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
