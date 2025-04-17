import { useState, useCallback } from 'react';

type SupportedLanguage = 'en' | 'sv' | 'ar';

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

export function useClientTranslation() {
  const [cache, setCache] = useState<TranslationCache>({});

  const translateText = useCallback(async (
    text: string, 
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage = 'en'
  ) => {
    // Check cache first
    if (cache[text]?.[targetLang]) {
      return cache[text][targetLang];
    }

    try {
      const response = await fetch(
        `https://microsoft-translator-text.p.rapidapi.com/translate?api-version=3.0&to=${targetLang}&from=${sourceLang}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-rapidapi-host': 'microsoft-translator-text.p.rapidapi.com',
            'x-rapidapi-key': process.env.feb24f75ecmshde81bf35c64f0f5p1ef602jsnbf660c4d51d9 as string
          },
          body: JSON.stringify([{ Text: text }])
        }
      );

      const data = await response.json();
      
      if (!data[0]?.translations?.[0]?.text) {
        throw new Error('Translation failed');
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
      return text; // Fallback to original text
    }
  }, [cache]);

  return { translateText };
}