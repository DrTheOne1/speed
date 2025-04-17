import React, { createContext, useContext, useState } from 'react';

// Import your language files
import enTranslations from '../languages/en.json';
import svTranslations from '../languages/sv.json';
import arTranslations from '../languages/ar.json';

type Language = 'en' | 'sv' | 'ar';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: Record<string, any>) => string;
  direction: 'ltr' | 'rtl';
}

const translations = {
  en: enTranslations,
  sv: svTranslations,
  ar: arTranslations
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, options?: Record<string, any>): string => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    
    // Get the translation or fallback to English
    let translation = keys.reduce(
      (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
      translations[language] as any
    ) || keys.reduce(
      (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
      translations.en as any
    );
    
    // If no translation found, return the key
    if (translation === undefined) {
      return key;
    }
    
    // Replace variables in the translation
    if (options) {
      Object.keys(options).forEach(option => {
        translation = translation.replace(
          new RegExp(`{{${option}}}`, 'g'),
          options[option]
        );
      });
    }
    
    return translation;
  };

  // Get text direction based on language
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  // Context value
  const value = {
    language,
    setLanguage,
    t,
    direction
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
