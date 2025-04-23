import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './languages/en.json';
import svTranslations from './languages/sv.json';
import arTranslations from './languages/ar.json';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      sv: {
        translation: svTranslations
      },
      ar: {
        translation: arTranslations
      }
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 