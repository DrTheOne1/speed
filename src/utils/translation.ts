import { useTranslation } from '../contexts/TranslationContext';

type TranslationValue = {
  en: string;
  sv: string;
  ar: string;
};

type TranslationMap = {
  [key: string]: TranslationValue;
};

type NestedTranslationMap = {
  [key: string]: TranslationValue | NestedTranslationMap;
};

type TranslationInput = TranslationValue | NestedTranslationMap;

export const useDynamicTranslation = () => {
  const { t, language } = useTranslation();

  const translateDynamicContent = (content: any, translations?: TranslationInput): any => {
    if (!translations) return content;

    // If content is a string and translations is a direct TranslationValue
    if (typeof content === 'string' && 'en' in translations) {
      const value = translations as TranslationValue;
      return value[language] || value.en || content;
    }

    // If content is a string, try to find its translation in a map
    if (typeof content === 'string' && typeof translations === 'object') {
      const map = translations as NestedTranslationMap;
      const translationKey = Object.keys(map).find(key => {
        const value = map[key];
        return typeof value === 'object' && 'en' in value && value.en === content;
      });
      
      if (translationKey) {
        const value = map[translationKey];
        if (typeof value === 'object' && 'en' in value) {
          return value[language] || value.en || content;
        }
      }
    }

    // If content is an object, recursively translate its values
    if (typeof content === 'object' && content !== null) {
      const translatedContent = { ...content };
      for (const key in content) {
        if (content.hasOwnProperty(key)) {
          translatedContent[key] = translateDynamicContent(content[key], translations);
        }
      }
      return translatedContent;
    }

    // If content is an array, translate each item
    if (Array.isArray(content)) {
      return content.map(item => translateDynamicContent(item, translations));
    }

    return content;
  };

  return {
    translateDynamicContent,
    t,
    language
  };
}; 