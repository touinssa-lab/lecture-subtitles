// Translation Service supporting Google Cloud Translate, DeepL API (500k chars/mo free), and High-Availability Free Ensemble

export interface TranslationSettings {
  engine: 'google' | 'deepl' | 'free';
  googleApiKey?: string;
  deeplApiKey?: string;
}

export interface TargetLanguage {
  code: string;
  shortCode: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const TARGET_LANGUAGES: TargetLanguage[] = [
  { code: 'ko', shortCode: 'KR', name: '한국어', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', shortCode: 'US', name: '영어', nativeName: 'English', flag: '🇺🇸' },
  { code: 'vi', shortCode: 'VN', name: '베트남어', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'uz', shortCode: 'UZ', name: '우즈베크어', nativeName: "Oʻzbekcha", flag: '🇺🇿' },
  { code: 'mn', shortCode: 'MN', name: '몽골어', nativeName: 'Монгол', flag: '🇲🇳' },
  { code: 'ne', shortCode: 'NP', name: '네팔어', nativeName: 'नेपाली', flag: '🇳🇵' },
];

const SETTINGS_KEY = 'lecture_translation_settings';
export const DEFAULT_DEEPL_KEY = (import.meta as any).env?.VITE_DEEPL_API_KEY || '';

export function loadSavedTranslationSettings(): TranslationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        engine: parsed.engine || (DEFAULT_DEEPL_KEY ? 'deepl' : 'free'),
        googleApiKey: parsed.googleApiKey || (import.meta as any).env?.VITE_GOOGLE_API_KEY || '',
        deeplApiKey: parsed.deeplApiKey || DEFAULT_DEEPL_KEY,
      };
    }
  } catch (e) {
    console.warn('Failed to load saved translation settings:', e);
  }
  return {
    engine: DEFAULT_DEEPL_KEY ? 'deepl' : 'free',
    googleApiKey: (import.meta as any).env?.VITE_GOOGLE_API_KEY || '',
    deeplApiKey: DEFAULT_DEEPL_KEY,
  };
}

export function saveSavedTranslationSettings(settings: TranslationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save translation settings:', e);
  }
}

// In-memory LRU translation cache to minimize API calls
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

function getCachedTranslation(key: string): string | undefined {
  return translationCache.get(key);
}

function setCachedTranslation(key: string, value: string): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

// DeepL Quota Status tracker to avoid waiting for DeepL 456 once quota is depleted
let isDeepLQuotaExceeded = false;
try {
  isDeepLQuotaExceeded = localStorage.getItem('deepl_quota_exceeded') === 'true';
} catch (e) {}

export function resetDeepLQuotaStatus(): void {
  isDeepLQuotaExceeded = false;
  try {
    localStorage.removeItem('deepl_quota_exceeded');
  } catch (e) {}
}

export function getIsDeepLQuotaExceeded(): boolean {
  return isDeepLQuotaExceeded;
}

export async function translateText(
  text: string,
  settings: TranslationSettings,
  targetLang: string = 'en',
  sourceLang: string = 'ko'
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';
  if (targetLang === sourceLang) return cleanText;

  const cacheKey = `${sourceLang}->${targetLang}:${cleanText}`;
  const cached = getCachedTranslation(cacheKey);
  if (cached) return cached;

  // 1. Google Cloud Translation API (50만자/월 무료 크레딧 티어)
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
        const res = data.data.translations[0].translatedText;
        setCachedTranslation(cacheKey, res);
        return res;
      }
    } catch (e) {
      console.warn('Google Translate Cloud API Error, falling back to free ensemble:', e);
    }
  }

  // 2. DeepL Official API (DeepL Free Plan: 50만자/월 또는 100만자 크레딧 지원)
  if (settings.engine === 'deepl' && settings.deeplApiKey && !isDeepLQuotaExceeded) {
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

      if (response.status === 456) {
        // DeepL Quota Exceeded (100만 자 소진 감지)
        console.warn('[DeepL] 100만 자 무료 쿼터가 모두 소진되었습니다. 이후 요청은 DeepL 대기 없이 즉시 Google/무료 앙상블로 0초 직행합니다.');
        isDeepLQuotaExceeded = true;
        try {
          localStorage.setItem('deepl_quota_exceeded', 'true');
        } catch (e) {}
      } else if (response.ok) {
        const data = await response.json();
        if (data?.translations?.[0]?.text) {
          const res = data.translations[0].text;
          setCachedTranslation(cacheKey, res);
          return res;
        }
      }
    } catch (e) {
      console.warn('DeepL API Error, falling back to free ensemble:', e);
    }
  }

  // 3. High-Availability Free Translation Ensemble (MyMemory + Lingva + Google Client + Fallback)
  const ensembleResult = await translateFreeEnsemble(cleanText, targetLang, sourceLang);
  if (ensembleResult) {
    setCachedTranslation(cacheKey, ensembleResult);
  }
  return ensembleResult;
}

// Client-side Free Translation Ensemble with automatic multi-endpoint failover
async function translateFreeEnsemble(text: string, targetLang: string = 'en', sourceLang: string = 'ko'): Promise<string> {
  // Method A: MyMemory API with expanded email quota parameter
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}&de=lecture_app_subtitles@gmail.com`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText && data?.responseStatus === 200) {
        const result = data.responseData.translatedText.trim();
        const upper = result.toUpperCase();
        if (
          result &&
          !upper.includes('MYMEMORY WARNING') &&
          !upper.includes('QUERY LENGTH LIMIT EXCEEDED') &&
          !upper.includes('NO QUERY SPECIFIED')
        ) {
          return result;
        }
      }
    }
  } catch (e) {
    // Continue to next mirror
  }

  // Method B: Lingva Translate Public Instances (Google Translate mirror with no CORS restriction)
  const lingvaInstances = [
    'https://lingva.ml',
    'https://translate.plausibility.cloud',
    'https://lingva.garudalinux.org',
  ];

  for (const base of lingvaInstances) {
    try {
      const url = `${base}/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        if (data?.translation && typeof data.translation === 'string') {
          const res = data.translation.trim();
          if (res) return res;
        }
      }
    } catch (e) {
      // Try next instance
    }
  }

  // Method C: LibreTranslate Public Endpoints
  const libreEndpoints = [
    'https://translate.terraprint.co/translate',
    'https://libretranslate.de/translate',
  ];

  for (const endpoint of libreEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.translatedText && typeof data.translatedText === 'string') {
          return data.translatedText.trim();
        }
      }
    } catch (e) {
      // Try next endpoint
    }
  }

  // Method D: Fallback to Google GTX through CORS-Friendly Mirrors
  try {
    const rawUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
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
    // Continue
  }

  // Method E: Graceful fallback indicator (Never return plain Korean in English slot)
  return `(${targetLang.toUpperCase()}) ${text}`;
}
