import fetch from 'node-fetch';

interface TranslationResponse {
  translations: Array<{
    text: string;
    to: string;
  }>;
}

async function testTranslation() {
  try {
    const url = new URL('https://microsoft-translator-text.p.rapidapi.com/translate');
    url.search = new URLSearchParams({
      'api-version': '3.0',
      'to': 'sv',
      'from': 'en',
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
        Text: 'Hello World'
      }])
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json() as TranslationResponse[];
    console.log('Translation Result:', {
      original: 'Hello World',
      translated: data[0].translations[0].text,
      language: data[0].translations[0].to
    });
  } catch (error) {
    console.error('Translation Error:', error);
  }
}

// Execute test
testTranslation();