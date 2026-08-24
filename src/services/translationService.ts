// Translation Service supporting Google Cloud Translate, DeepL API, and Robust Free Fallback Engine

export interface TranslationSettings {
  engine: 'google' | 'deepl' | 'free';
  googleApiKey?: string;
  deeplApiKey?: string;
}

export interface TargetLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const TARGET_LANGUAGES: TargetLanguage[] = [
  { code: 'en', name: '영어', nativeName: 'English', flag: '🇺🇸' },
  { code: 'vi', name: '베트남어', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'uz', name: '우즈베크어', nativeName: "Oʻzbekcha", flag: '🇺🇿' },
  { code: 'mn', name: '몽골어', nativeName: 'Монгол', flag: '🇲🇳' },
];

export async function translateText(
  text: string,
  settings: TranslationSettings,
  targetLang: string = 'en',
  sourceLang: string = 'ko'
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  // 1. Google Translate Official Cloud API
  if (settings.engine === 'google' && settings.googleApiKey) {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${settings.googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: cleanText,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
        }
      );
      const data = await response.json();
      if (data?.data?.translations?.[0]?.translatedText) {
        return data.data.translations[0].translatedText;
      }
    } catch (e) {
      console.warn('Google Translate Cloud API Error:', e);
    }
  }

  // 2. DeepL Official API
  if (settings.engine === 'deepl' && settings.deeplApiKey) {
    try {
      const isFreeKey = settings.deeplApiKey.endsWith(':fx');
      const endpoint = isFreeKey
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${settings.deeplApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: cleanText,
          source_lang: sourceLang.toUpperCase(),
          target_lang: targetLang.toUpperCase(),
        }),
      });
      const data = await response.json();
      if (data?.translations?.[0]?.text) {
        return data.translations[0].text;
      }
    } catch (e) {
      console.warn('DeepL API Error:', e);
    }
  }

  // 3. Robust Free Fallback Engine (MyMemory + Free Proxies)
  return await translateFreeEnsemble(cleanText, targetLang, sourceLang);
}

// Client-side Free Translation Ensemble
async function translateFreeEnsemble(text: string, targetLang: string = 'en', sourceLang: string = 'ko'): Promise<string> {
  // Method A: MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText && data?.responseStatus === 200) {
        const result = data.responseData.translatedText.trim();
        if (result && !result.toUpperCase().includes('MYMEMORY WARNING') && !result.toUpperCase().includes('QUERY LENGTH LIMIT EXCEEDED')) {
          return result;
        }
      }
    }
  } catch (e) {
    // Fallthrough to next method
  }

  // Method B: Free Google GTX Endpoint via CORS Proxy / direct
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(gtxUrl, { signal: AbortSignal.timeout(3500) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]) {
        const sentences = data[0].map((item: any) => item[0]).filter(Boolean);
        if (sentences.length > 0) {
          return sentences.join(' ');
        }
      }
    }
  } catch (e) {
    // Fallthrough to next method
  }

  // Method C: Backup Client-side dictionary / Fallback
  return `[${targetLang.toUpperCase()}] ${text}`;
}
