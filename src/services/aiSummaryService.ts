// AI Summary Service supporting Google Gemini API & Client-side Smart Extractive Fallback Engine
import { SubtitleItem } from '../App';

export interface AiSummaryResult {
  overview: string[];
  keyTopics: string[];
  qaSummary: string[];
  fullSummaryText: string;
}

const DEFAULT_GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';

/**
 * Generate AI Summary using Google Gemini API or Smart Fallback Engine
 */
export async function generateLectureSummary(
  subtitles: SubtitleItem[],
  courseTitle: string = '강의',
  weekNum: number = 1,
  topic: string = '',
  apiKey?: string
): Promise<AiSummaryResult> {
  const geminiKey = apiKey || DEFAULT_GEMINI_API_KEY;

  // 1. Prepare raw transcript text
  const cleanTranscriptLines: string[] = [];
  const qaLines: string[] = [];

  subtitles.forEach((s) => {
    if (s.type === 'qa') {
      const q = s.qaQuestionKorean || s.koreanText;
      const a = s.qaAnswerKorean ? ` (답변: ${s.qaAnswerKorean})` : '';
      qaLines.push(`- Q: ${q}${a}`);
    } else {
      const text = s.koreanText.trim();
      // Filter out empty or very short filler phrases
      if (text && text.length > 3) {
        cleanTranscriptLines.push(text);
      }
    }
  });

  const fullRawText = cleanTranscriptLines.join(' ');

  // If empty subtitles
  if (!fullRawText && qaLines.length === 0) {
    return {
      overview: ['인식된 강의 자막 내용이 없어 요약할 수 없습니다.'],
      keyTopics: ['내용 없음'],
      qaSummary: [],
      fullSummaryText: '강의 자막 데이터가 비어 있습니다.',
    };
  }

  // Try Google Gemini API if key is available or provided
  if (geminiKey) {
    try {
      const result = await callGeminiApi(fullRawText, qaLines, courseTitle, weekNum, topic, geminiKey);
      if (result) return result;
    } catch (e) {
      console.warn('[AiSummary] Gemini API call failed, switching to Smart Fallback Engine:', e);
    }
  }

  // Smart Extractive Fallback Engine (Runs instantly without API key dependency)
  return generateSmartFallbackSummary(cleanTranscriptLines, qaLines, courseTitle, weekNum, topic);
}

/**
 * Call Google Gemini 1.5 Flash API
 */
async function callGeminiApi(
  transcriptText: string,
  qaLines: string[],
  courseTitle: string,
  weekNum: number,
  topic: string,
  apiKey: string
): Promise<AiSummaryResult | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
당신은 대학교 강의 자막을 완벽하게 요약 정리하는 전문 AI 조교입니다.
아래 제공된 [${courseTitle} ${weekNum}주차 - ${topic}] 강의의 실시간 자막 기록과 질문 답변을 바탕으로 핵심 요약 노트를 작성해 주세요.

[강의 자막 기록]
${transcriptText.substring(0, 8000)}

[학생 Q&A 질문 답변]
${qaLines.length > 0 ? qaLines.join('\n') : 'Q&A 질문 내역 없음'}

반드시 아래 JSON 형식으로만 응답해 주세요 (다른 설명 불필요):
{
  "overview": [
    "핵심 요약 문장 1",
    "핵심 요약 문장 2",
    "핵심 요약 문장 3"
  ],
  "keyTopics": [
    "핵심 개념 또는 키워드 1: 간단한 부연 설명",
    "핵심 개념 또는 키워드 2: 간단한 부연 설명",
    "핵심 개념 또는 키워드 3: 간단한 부연 설명"
  ],
  "qaSummary": [
    "Q&A 핵심 요약 1"
  ]
}
`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const rawJsonStr = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJsonStr) return null;

  const parsed = JSON.parse(rawJsonStr);
  const overview = parsed.overview || [];
  const keyTopics = parsed.keyTopics || [];
  const qaSummary = parsed.qaSummary || [];

  const fullText = buildFormattedText(courseTitle, weekNum, topic, overview, keyTopics, qaSummary);

  return {
    overview,
    keyTopics,
    qaSummary,
    fullSummaryText: fullText,
  };
}

/**
 * Smart Extractive Fallback Engine (Runs locally without external API dependencies)
 */
function generateSmartFallbackSummary(
  lines: string[],
  qaLines: string[],
  courseTitle: string,
  weekNum: number,
  topic: string
): AiSummaryResult {
  // Remove filler words
  const cleaned = lines.map((line) =>
    line
      .replace(/(어\.\.\.|음\.\.\.|자\s+여러분|네\s+그렇습니다|생각합니다|하겠습니다)/g, '')
      .trim()
  ).filter((line) => line.length > 5);

  // Pick 3-5 longest & most meaningful sentences for overview
  const sortedByLength = [...cleaned].sort((a, b) => b.length - a.length);
  const overview = sortedByLength.slice(0, 4);

  if (overview.length === 0 && lines.length > 0) {
    overview.push(lines.slice(0, 3).join(' '));
  }

  // Extract key terms (noun frequency simulation)
  const wordFreq: Record<string, number> = {};
  cleaned.forEach((sentence) => {
    const words = sentence.split(/\s+/);
    words.forEach((w) => {
      const cleanW = w.replace(/[^a-zA-Z0-9가-힣]/g, '');
      if (cleanW.length >= 2 && !['오늘', '지금', '생각', '이것', '저것', '하나', '부분', '대해'].includes(cleanW)) {
        wordFreq[cleanW] = (wordFreq[cleanW] || 0) + 1;
      }
    });
  });

  const sortedKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, freq]) => `🔑 ${term} (언급 횟수: ${freq}회)`);

  const keyTopics = sortedKeywords.length > 0 ? sortedKeywords : ['핵심 주제: ' + (topic || '기본 강의 주제')];

  const qaSummary = qaLines.length > 0 ? qaLines : ['이번 주차 수업에서는 등록된 학생 질의응답이 없습니다.'];

  const fullText = buildFormattedText(courseTitle, weekNum, topic, overview, keyTopics, qaSummary);

  return {
    overview: overview.length > 0 ? overview : ['수업 자막 내용 요약 준비 완료.'],
    keyTopics,
    qaSummary,
    fullSummaryText: fullText,
  };
}

/**
 * Format structured summary text for TXT export & Clipboard Copy
 */
function buildFormattedText(
  courseTitle: string,
  weekNum: number,
  topic: string,
  overview: string[],
  keyTopics: string[],
  qaSummary: string[]
): string {
  let text = `==================================================\n`;
  text += `🤖 AI 강의 핵심 요약 노트 (Lecture Summary)\n`;
  text += `과목명: ${courseTitle} (${weekNum}주차)\n`;
  text += `강의 주제: ${topic || '주제 미지정'}\n`;
  text += `생성 일시: ${new Date().toLocaleString()}\n`;
  text += `==================================================\n\n`;

  text += `📌 1. 강의 핵심 3줄 요약\n`;
  overview.forEach((item, idx) => {
    text += `   ${idx + 1}. ${item}\n`;
  });
  text += `\n`;

  text += `🔑 2. 주요 개념 및 키워드\n`;
  keyTopics.forEach((item) => {
    text += `   - ${item}\n`;
  });
  text += `\n`;

  text += `💬 3. Q&A 세션 및 주요 답변 요약\n`;
  qaSummary.forEach((item) => {
    text += `   ${item}\n`;
  });
  text += `\n==================================================\n`;

  return text;
}
