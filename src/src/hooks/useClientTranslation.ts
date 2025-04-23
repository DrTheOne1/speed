import { useState, useCallback } from 'react';

type SupportedLanguage = 'en' | 'sv' | 'ar';

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

// Local translations fallback for common terms
const fallbackTranslations = {
  'Basic Plan': {
    sv: 'Baspaket',
    ar: 'الباقة الأساسية'
  },
  'Pro Plan': {
    sv: 'Pro-paket',
    ar: 'الباقة الاحترافية'
  },
  'Business Plan': {
    sv: 'Företagspaket',
    ar: 'باقة الأعمال'
  },
  'Enterprise Plan': {
    sv: 'Enterprisepaket',
    ar: 'باقة المؤسسات'
  },
  'Start sending SMS messages': {
    sv: 'Börja skicka SMS-meddelanden',
    ar: 'ابدأ في إرسال الرسائل النصية'
  },
  'Advanced features for professionals': {
    sv: 'Avancerade funktioner för proffs',
    ar: 'ميزات متقدمة للمحترفين'
  },
  'Complete solution for businesses': {
    sv: 'Komplett lösning för företag',
    ar: 'حل متكامل للشركات'
  },
  'Custom solutions for large organizations': {
    sv: 'Anpassade lösningar för stora organisationer',
    ar: 'حلول مخصصة للمؤسسات الكبيرة'
  }
};

export function useClientTranslation() {
  const [cache, setCache] = useState<TranslationCache>({});
  const [translationFailed, setTranslationFailed] = useState(false);

  const translateText = useCallback(async (
    text: string, 
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage = 'en'
  ) => {
    // Don't translate if target language is English or source text is empty
    if (targetLang === 'en' || !text.trim()) {
      return text;
    }

    // Check local fallback translations first
    if (fallbackTranslations[text]?.[targetLang]) {
      return fallbackTranslations[text][targetLang];
    }

    // Check cache next
    if (cache[text]?.[targetLang]) {
      return cache[text][targetLang];
    }

    // If previous calls failed, use original text to avoid repeated API calls
    if (translationFailed) {
      return text;
    }

    try {
      const url = new URL('https://microsoft-translator-text.p.rapidapi.com/translate');
      url.search = new URLSearchParams({
        'api-version': '3.0',
        'to': targetLang,
        'from': sourceLang,
        'textType': 'plain'
      }).toString();

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': 'feb24f75ecmshde81bf35c64f0f5p1ef602jsnbf660c4d51d9',
          'X-RapidAPI-Host': 'microsoft-translator-text.p.rapidapi.com'
        },
        body: JSON.stringify([{
          Text: text
        }]),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data[0]?.translations?.[0]?.text) {
        throw new Error('Invalid translation response');
      }

      const translation = data[0].translations[0].text;

      // Update cache
      setCache(prev => ({
        ...prev,
        [text]: {
          ...prev[text],
          [targetLang]: translation
        }
      }));

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationFailed(true);
      return text; // Return original text if translation fails
    }
  }, [cache, translationFailed]);

  return { translateText };
}