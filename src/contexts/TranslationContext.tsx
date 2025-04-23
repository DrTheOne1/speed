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

// Debug: Log the imported translations
console.log('Imported translations:', {
  en: enTranslations,
  sv: svTranslations,
  ar: arTranslations
});

const translations = {
  en: enTranslations,
  sv: svTranslations,
  ar: arTranslations
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = (lang: Language) => {
    console.log('Language changed to:', lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
    setLanguageState(lang);
  };

  const t = (key: string, options?: Record<string, any>): string => {
    try {
      // Split the key by dots
      const keys = key.split('.');
      
      // Try to get translation from current language
      let result: any = translations[language];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!result) {
          break;
        }
        result = result[k];
        // If we're at a string value but not at the last key, the path is invalid
        if (typeof result === 'string' && i < keys.length - 1) {
          result = undefined;
          break;
        }
      }
      
      // If not found, try English
      if (result === undefined && language !== 'en') {
        result = translations.en;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (!result) {
            break;
          }
          result = result[k];
          // If we're at a string value but not at the last key, the path is invalid
          if (typeof result === 'string' && i < keys.length - 1) {
            result = undefined;
            break;
          }
        }
      }
      
      // If still not found, log a warning and return the key
      if (result === undefined) {
        console.warn(`Translation not found: ${key}`);
        return key.split('.').pop() || key;
      }
      
      // Replace variables in the translation
      if (options) {
        Object.keys(options).forEach(option => {
          result = result.replace(
            new RegExp(`{{${option}}}`, 'g'),
            options[option]
          );
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error in translation function: ${error}`);
      return key;
    }
  };

  // Get text direction based on language
  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';

  // Context value
  const value: TranslationContextType = {
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
