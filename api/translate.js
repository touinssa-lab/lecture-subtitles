// Vercel Serverless Function: /api/translate
// DeepL 및 Google Translation 백엔드 중계 프록시 (브라우저 CORS 제약 100% 해소)

// DeepL 쿼터 소진 상태 메모리 캐싱 (소진 시 DeepL 대기 없이 0초 만에 Google로 즉시 직행)
let isDeepLQuotaExceeded = false;
let lastUsedKey = '';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Only POST is accepted.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const {
      text = '',
      targetLang = 'en',
      sourceLang = 'ko',
      apiKey = '',
      engine = 'deepl',
    } = body || {};

    const cleanText = (text || '').trim();
    if (!cleanText) {
      return res.status(200).json({ translatedText: '', engine: 'noop' });
    }

    // 동일 언어 번역 요청 시 그대로 반환
    if (targetLang.toLowerCase() === sourceLang.toLowerCase()) {
      return res.status(200).json({ translatedText: cleanText, engine: 'identity' });
    }

    // 1. DeepL API 키 결정 (클라이언트 지정키 우선, 없으면 Vercel 환경 변수 사용)
    const activeDeepLKey =
      (apiKey || '').trim() ||
      process.env.VITE_DEEPL_API_KEY ||
      process.env.DEEPL_API_KEY ||
      '';

    // 키가 변경된 경우(새 키 입력 등) 쿼터 초과 플래그 초기화
    if (activeDeepLKey !== lastUsedKey) {
      lastUsedKey = activeDeepLKey;
      isDeepLQuotaExceeded = false;
    }

    // 2. DeepL 엔진 우선 시도 (키가 존재하고 쿼터가 남아있을 때)
    if ((engine === 'deepl' || !engine) && activeDeepLKey && !isDeepLQuotaExceeded) {
      try {
        const isFreeKey = activeDeepLKey.endsWith(':fx');
        const endpoint = isFreeKey
          ? 'https://api-free.deepl.com/v2/translate'
          : 'https://api.deepl.com/v2/translate';

        const deepLRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${activeDeepLKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text: cleanText,
            source_lang: sourceLang.toUpperCase(),
            target_lang: targetLang.toUpperCase(),
          }),
          signal: AbortSignal.timeout(4000),
        });

        if (deepLRes.status === 456) {
          // DeepL Quota Exceeded 감지 -> 이후 요청은 DeepL 대기 없이 0초 만에 Google GTX로 직행
          console.warn('[Proxy] DeepL 100만 자 쿼터가 소진되었습니다 (Status 456). 이후 요청은 대기 없이 Google 번역으로 0초 직행합니다.');
          isDeepLQuotaExceeded = true;
        } else if (deepLRes.ok) {
          const data = await deepLRes.json();
          if (data?.translations?.[0]?.text) {
            return res.status(200).json({
              translatedText: data.translations[0].text,
              engine: 'deepl',
            });
          }
        } else {
          const errStatus = deepLRes.status;
          console.warn(`[Proxy] DeepL responded with status ${errStatus}, falling back to Google GTX.`);
        }
      } catch (deepLErr) {
        console.warn('[Proxy] DeepL request failed:', deepLErr.message);
      }
    }

    // 3. 서버 측 Google GTX 즉시 백업 (CORS 제약 없이 0.1초 내 번역)
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        cleanText
      )}`;
      const gtxRes = await fetch(gtxUrl, { signal: AbortSignal.timeout(3000) });
      if (gtxRes.ok) {
        const gtxData = await gtxRes.json();
        if (Array.isArray(gtxData) && gtxData[0]) {
          const sentences = gtxData[0].map((item) => item[0]).filter(Boolean);
          if (sentences.length > 0) {
            return res.status(200).json({
              translatedText: sentences.join(''),
              engine: 'google-gtx',
            });
          }
        }
      }
    } catch (gtxErr) {
      console.warn('[Proxy] Google GTX failed:', gtxErr.message);
    }

    // 4. 서버 측 MyMemory 백업
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        cleanText
      )}&langpair=${sourceLang}|${targetLang}&de=lecture_app_subtitles@gmail.com`;
      const mmRes = await fetch(mmUrl, { signal: AbortSignal.timeout(3000) });
      if (mmRes.ok) {
        const mmData = await mmRes.json();
        if (mmData?.responseData?.translatedText && mmData?.responseStatus === 200) {
          const result = mmData.responseData.translatedText.trim();
          if (
            result &&
            !result.toUpperCase().includes('MYMEMORY WARNING') &&
            !result.toUpperCase().includes('QUERY LENGTH LIMIT')
          ) {
            return res.status(200).json({
              translatedText: result,
              engine: 'mymemory',
            });
          }
        }
      }
    } catch (mmErr) {
      console.warn('[Proxy] MyMemory failed:', mmErr.message);
    }

    // 5. 모든 외부 엔진 실패 시 안전 폴백
    return res.status(200).json({
      translatedText: cleanText,
      engine: 'fallback',
    });
  } catch (error) {
    console.error('[Proxy] Handler unexpected error:', error);
    return res.status(500).json({ error: error.message || 'Internal Translation Error' });
  }
}
