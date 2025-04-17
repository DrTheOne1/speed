import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';

type Language = 'en' | 'ar' | 'sv';
type Translations = Record<string, any>;

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useI18nTranslation();
  
  // Get initial language from localStorage or default to 'en'
  const [language, setLanguage] = useState<Language>(() => 
    (localStorage.getItem('language') as Language) || 'en'
  );
  const [translations, setTranslations] = useState<Translations>({});

  // Update localStorage and i18n when language changes
  useEffect(() => {
    // Update localStorage
    localStorage.setItem('language', language);
    
    // Update i18n language
    i18n.changeLanguage(language);
    
    // Update document properties
    document.documentElement.lang = language;
    
    const loadTranslations = async () => {
      try {
        const langFile = await import(`../../languages/${language}.json`);
        setTranslations(langFile.default);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };
    
    loadTranslations();
  }, [language, i18n]);

  const t = (key: string, params?: Record<string, any>): string => {
    let value = key.split('.').reduce((obj, part) => obj?.[part], translations) || key;
    
    // Handle interpolation if params are provided
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      });
    }
    
    return String(value);
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
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
