import { useState } from 'react';
import { CreditCard, Package, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../contexts/TranslationContext';

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
}

export default function Billing() {
  const { t, language } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const handlePurchase = async (planName: string) => {
    try {
      // Implement Stripe integration here
      alert(t('billing.payment.redirecting'));
    } catch (error) {
      console.error('Error:', error);
      alert(t('billing.payment.failed'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('billing.title')}</h1>

      <div className="mt-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-base font-semibold leading-6 text-gray-900">
              {t('billing.usage.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              {t('billing.usage.description')}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-500">{t('billing.currentPlan')}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {t(`billing.plans.professional`)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-500">{t('billing.creditsLeft')}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {user?.credits?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Shield className="h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-500">{t('billing.nextBilling')}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {new Date('2024-03-01').toLocaleDateString(language === 'en' ? 'en-US' : language === 'sv' ? 'sv-SE' : 'ar-SA')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold leading-6 text-gray-900">
          {t('billing.availablePlans')}
        </h2>
        {plansLoading ? (
          <div className="mt-4 text-center text-gray-500">{t('billing.loadingPlans')}</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans?.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-lg border p-6 shadow-sm ${
                  selectedPlan === plan.id
                    ? 'border-indigo-600 ring-2 ring-indigo-600'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-4 flex items-baseline text-gray-900">
                    <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                    <span className="ml-1 text-sm font-semibold">/{plan.billing_cycle}</span>
                  </p>
                  <p className="mt-6 text-sm leading-6 text-gray-500">
                    {plan.credits.toLocaleString()} {t('billing.smsCreditsIncluded')}
                  </p>

                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <svg
                          className="h-6 w-5 flex-none text-indigo-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 ${
                    selectedPlan === plan.id
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {selectedPlan === plan.id ? t('billing.currentPlan') : t('billing.subscribe')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            {t('billing.billingHistory')}
          </h3>
          <div className="mt-4">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      {t('billing.history.date')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('billing.history.description')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('billing.history.amount')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('billing.history.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Add billing history rows here */}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
