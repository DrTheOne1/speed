import React from 'react';
import { useTranslation } from './contexts/TranslationContext';

const TestComponent: React.FC = () => {
  const { t, currentLanguage } = useTranslation();

  // Add sample translations to see if they work
  const commonTranslations = {
    select: t('common.select'),
    confirmation: t('common.confirmation'),
    confirmSendMessages: t('common.confirmSendMessages', { count: 5 }),
    yes: t('common.yes'),
    no: t('common.no')
  };

  const errorTranslations = {
    failedToLoadGroups: t('errors.failedToLoadGroups'),
    failedToLoadContacts: t('errors.failedToLoadContacts'),
    selectGroupAndEnterMessage: t('errors.selectGroupAndEnterMessage'),
    insufficientCredits: t('errors.insufficientCredits'),
    generalError: t('errors.generalError'),
    failedToSendMessages: t('errors.failedToSendMessages')
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-4">Translation Test Component</h1>
        <p className="text-gray-600 mb-4">
          Current language: <span className="font-semibold">{currentLanguage}</span>
        </p>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Common Translations:</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <ul className="space-y-2">
              {Object.entries(commonTranslations).map(([key, value]) => (
                <li key={key} className="flex">
                  <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded mr-2 w-52">
                    common.{key}
                  </span>
                  <span className="text-sm">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Error Translations:</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <ul className="space-y-2">
              {Object.entries(errorTranslations).map(([key, value]) => (
                <li key={key} className="flex">
                  <span className="font-mono text-sm bg-red-100 px-2 py-1 rounded mr-2 w-52">
                    errors.{key}
                  </span>
                  <span className="text-sm">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;