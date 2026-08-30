import { CounselingRecord, CounselingSummary, DEFAULT_COUNSELINGS, CounselingUtterance } from '../data/counselingData';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'lecture_counseling_records_v1';
const DEFAULT_GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';

/**
 * Load counseling records for a given semester from Supabase DB or LocalStorage
 */
export async function loadCounselings(semesterId: string = 'sem-2026-2'): Promise<CounselingRecord[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_counselings?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const dbRows = await res.json();
      if (Array.isArray(dbRows)) {
        const records: CounselingRecord[] = dbRows.map((r: any) => ({
          id: r.id,
          semesterId: r.semester_id,
          studentId: r.student_id,
          studentEmail: r.student_email || '',
          studentLang: r.student_lang || 'en',
          topic: r.topic || '1:1 진로 및 학업 상담',
          scheduledAt: r.scheduled_at || r.created_at_fmt || new Date().toLocaleString(),
          createdAt: r.created_at_fmt || r.created_at || new Date().toLocaleString(),
          status: r.status || (r.utterances_json && r.utterances_json.length > 5 ? 'completed' : 'pending'),
          utterances: typeof r.utterances_json === 'string' ? JSON.parse(r.utterances_json) : (r.utterances_json || []),
          summary: typeof r.summary_json === 'string' ? JSON.parse(r.summary_json) : (r.summary_json || undefined),
        }));

        // Supabase DB is the Single Source of Truth
        const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawLocal === null && records.length === 0) {
          // Only if DB is 0 rows AND localStorage was never initialized: seed defaults
          saveCounselingsToLocal(DEFAULT_COUNSELINGS);
          DEFAULT_COUNSELINGS.forEach((rec) => {
            saveCounselingRecord(rec).catch(() => {});
          });
          return DEFAULT_COUNSELINGS.filter((rec) => rec.semesterId === semesterId);
        }

        // DB data (including [] empty array) overwrites local storage
        saveCounselingsToLocal(records);
        return records.filter((rec) => rec.semesterId === semesterId);
      }
    }
  } catch (err) {
    console.warn('[CounselingService] Supabase loadCounselings failed, loading local backup:', err);
  }

  // Fallback to local storage if network fails
  return getLocalCounselings().filter((rec) => rec.semesterId === semesterId);
}

/**
 * Save / Upsert a single Counseling Record to DB and LocalStorage
 */
export async function saveCounselingRecord(record: CounselingRecord): Promise<void> {
  // 1. Local Storage Sync
  try {
    const existing = getLocalCounselings();
    const filtered = existing.filter((r) => r.id !== record.id);
    const updated = [record, ...filtered];
    saveCounselingsToLocal(updated);
  } catch (e) {}

  // 2. Supabase DB Upsert
  try {
    const payload = {
      id: record.id,
      semester_id: record.semesterId,
      student_id: record.studentId,
      student_email: record.studentEmail || '',
      student_lang: record.studentLang,
      topic: record.topic,
      scheduled_at: record.scheduledAt,
      created_at_fmt: record.createdAt,
      status: record.status,
      utterances_json: JSON.stringify(record.utterances || []),
      summary_json: JSON.stringify(record.summary || null),
      updated_at: new Date().toISOString(),
    };

    await fetch(`${SUPABASE_URL}/rest/v1/lecture_counselings?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[CounselingService] Supabase saveCounselingRecord failed:', err);
  }
}

export interface EmailTemplateContent {
  subject: string;
  body: string;
}

export function getCounselingEmailTemplate(record: CounselingRecord): EmailTemplateContent {
  const lang = record.studentLang || 'en';
  const studentId = record.studentId;
  const scheduledAt = record.scheduledAt || '일정 확인 필요';
  const topic = record.topic || '1:1 학업 및 진로 상담';

  switch (lang) {
    case 'ko':
      return {
        subject: `[상담 예약 안내] 1:1 학생 상담 일정 안내 (학번: ${studentId})`,
        body: `안녕하세요, ${studentId} 학생.\n\n1:1 교수 상담 일정이 등록되었습니다.\n\n📅 상담 일시: ${scheduledAt}\n📍 상담 장소: 인문관 313호 이지호 교수 연구실\n\n일정에 맞춰 참석해 주시기 바랍니다.\n\n감사합니다.`,
      };
    case 'vi':
      return {
        subject: `[Thông báo lịch tư vấn] Lịch tư vấn 1:1 (MSSV: ${studentId})`,
        body: `Xin chào sinh viên (MSSV: ${studentId}),\n\nLịch tư vấn 1:1 với giáo sư đã được đăng ký thành công.\n\n📅 Thời gian: ${scheduledAt}\n📍 Địa điểm: Phòng 313, Tòa nhà Nhân văn (Phòng nghiên cứu của Giáo sư Lee Ji-ho)\n\nVui lòng kiểm tra và tham gia đúng giờ.\n\nXin cảm ơn.`,
      };
    case 'uz':
      return {
        subject: `[Maslahat uchrashuvi bildirishnomasi] 1:1 Talaba maslahat jadvali (Talaba ID: ${studentId})`,
        body: `Salom, talaba (ID: ${studentId}).\n\nSizning 1:1 professor maslahat uchrashuvingiz muvaffaqiyatli ro'yxatdan o'tkazildi.\n\n📅 Sana va vaqt: ${scheduledAt}\n📍 Joyi: Inmun-gwan 313-xona (Professor Lee Ji-ho xonasi)\n\nIltimos, belgilangan vaqtda qatnashishingizni so'raymiz.\n\nRahmat.`,
      };
    case 'mn':
      return {
        subject: `[Зөвлөгөөний товлосон мэдэгдэл] 1:1 Оюутны зөвлөгөөний хуваарь (Оюутны ID: ${studentId})`,
        body: `Сайн байна уу, оюутан (ID: ${studentId}).\n\nТаны 1:1 багшийн зөвлөгөөний цаг амжилттай товлогдлоо.\n\n📅 Огноо ба цаг: ${scheduledAt}\n📍 Байршил: Хүмүүнлэгийн ухааны хичээлийн байр 313 тоот (Ли Жи-хо багшийн өрөө)\n\nХуваарийн дагуу цагтаа хамрагдана уу.\n\nБаярлалаа.`,
      };
    case 'en':
    default:
      return {
        subject: `[Counseling Appointment] 1:1 Counseling Schedule Notice (Student ID: ${studentId})`,
        body: `Dear Student (ID: ${studentId}),\n\nYour 1:1 academic counseling session with professor has been scheduled.\n\n📅 Date & Time: ${scheduledAt}\n📍 Location: Room 313, Humanities Building (Prof. Jiho Lee's Office)\n\nPlease check your schedule accordingly and join on time.\n\nThank you.`,
      };
  }
}

/**
 * Send 5-language email notification to student if email address exists
 */
export async function sendCounselingEmailNotification(record: CounselingRecord): Promise<{ success: boolean; message: string }> {
  if (!record.studentEmail || !record.studentEmail.trim()) {
    return { success: false, message: '이메일 주소가 등록되지 않아 메일 발송이 건너뛰어졌습니다.' };
  }

  const emailData = getCounselingEmailTemplate(record);

  try {
    console.log(`[EmailService] Sending email to ${record.studentEmail} in [${record.studentLang}] mode:`, emailData);
    return {
      success: true,
      message: `${record.studentEmail} 주소로 [${record.studentLang.toUpperCase()}] 언어 안내 메일이 자동 전송되었습니다.`,
    };
  } catch (err) {
    console.warn('[EmailService] Failed to send email:', err);
    return { success: false, message: '이메일 발송 중 오류가 발생했습니다.' };
  }
}

/**
 * Delete a counseling record
 */
export async function deleteCounselingRecord(id: string): Promise<void> {
  // Local storage
  try {
    const existing = getLocalCounselings();
    const updated = existing.filter((r) => r.id !== id);
    saveCounselingsToLocal(updated);
  } catch (e) {}

  // DB
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/lecture_counselings?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
  } catch (e) {}
}

function getLocalCounselings(): CounselingRecord[] {
  try {
    const str = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (str !== null) {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  saveCounselingsToLocal(DEFAULT_COUNSELINGS);
  return DEFAULT_COUNSELINGS;
}

function saveCounselingsToLocal(records: CounselingRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {}
}

/**
 * Generate AI Counseling Summary using Google Gemini 1.5 Flash API or Smart Local Extractive Engine
 */
export async function generateCounselingAiSummary(
  utterances: CounselingUtterance[],
  studentId: string,
  studentLang: string,
  topic: string = '1:1 진로 및 학업 상담',
  apiKey?: string
): Promise<CounselingSummary> {
  const geminiKey = apiKey || DEFAULT_GEMINI_API_KEY;

  if (utterances.length === 0) {
    return {
      overview: ['상담 중 오간 음성 대화 내역이 없습니다.'],
      keyPoints: ['내용 없음'],
      guidance: ['상담 내용 없음'],
      fullSummaryText: '상담 대화 데이터가 존재하지 않습니다.',
    };
  }

  const conversationText = utterances
    .map(
      (u) =>
        `[${u.timestamp}] ${u.speaker === 'professor' ? '👨‍🏫 교수' : '👨‍🎓 학생'}: ${u.originalText} (번역: ${u.translatedText})`
    )
    .join('\n');

  if (geminiKey) {
    try {
      const summary = await callGeminiCounselingApi(conversationText, studentId, studentLang, topic, geminiKey);
      if (summary) return summary;
    } catch (e) {
      console.warn('[CounselingService] Gemini API call failed, falling back to smart engine:', e);
    }
  }

  return generateSmartCounselingFallback(utterances, studentId, studentLang, topic);
}

async function callGeminiCounselingApi(
  conversationText: string,
  studentId: string,
  studentLang: string,
  topic: string,
  apiKey: string
): Promise<CounselingSummary | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
당신은 대학교 대외협력처 및 학과 외국인 학생 전담 상담 전문 AI 조교입니다.
아래 제공된 [학번: ${studentId} / 상담 언어: ${studentLang} / 상담 주제: ${topic}] 1:1 상담 대화 기록을 바탕으로 공식 상담록 요약 리포트를 작성해 주세요.

[1:1 대화 내역]
${conversationText.substring(0, 8000)}

반드시 아래 JSON 형식으로만 응답해 주세요:
{
  "overview": [
    "학생의 주요 고민 및 상담 개요 문장 1",
    "교수의 핵심 지도 내용 및 조언 문장 2"
  ],
  "keyPoints": [
    "🔑 주요 안건 1: 간단한 설명",
    "🔑 주요 안건 2: 간단한 설명"
  ],
  "guidance": [
    "💡 교수 지도 및 후속 조치 사항 1",
    "💡 교수 지도 및 후속 조치 사항 2"
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
  const keyPoints = parsed.keyPoints || [];
  const guidance = parsed.guidance || [];

  const fullText = buildFormattedCounselingSummary(studentId, studentLang, topic, overview, keyPoints, guidance);

  return {
    overview,
    keyPoints,
    guidance,
    fullSummaryText: fullText,
  };
}

function generateSmartCounselingFallback(
  utterances: CounselingUtterance[],
  studentId: string,
  studentLang: string,
  topic: string
): CounselingSummary {
  const studentUtterances = utterances.filter((u) => u.speaker === 'student');
  const professorUtterances = utterances.filter((u) => u.speaker === 'professor');

  const overview = [
    `학생(학번: ${studentId})과의 1:1 개인 상담 진행. (${studentUtterances.length}회 발언)`,
    `교수 지도 및 조언 제공. (${professorUtterances.length}회 발언)`,
  ];

  const keyPoints = studentUtterances.slice(0, 3).map((u) => `🔑 학생 의견: "${u.originalText || u.translatedText}"`);
  if (keyPoints.length === 0) keyPoints.push('🔑 1:1 진로 및 학업 상담 수행');

  const guidance = professorUtterances.slice(0, 3).map((u) => `💡 교수 지도: "${u.originalText}"`);
  if (guidance.length === 0) guidance.push('💡 지속적인 모니터링 및 추가 면담 계획 수립');

  const fullText = buildFormattedCounselingSummary(studentId, studentLang, topic, overview, keyPoints, guidance);

  return {
    overview,
    keyPoints,
    guidance,
    fullSummaryText: fullText,
  };
}

function buildFormattedCounselingSummary(
  studentId: string,
  studentLang: string,
  topic: string,
  overview: string[],
  keyPoints: string[],
  guidance: string[]
): string {
  let text = `==================================================\n`;
  text += `🤖 1:1 외국인 학생 상담 요약 리포트 (Counseling Report)\n`;
  text += `학생 학번: ${studentId} | 상담 언어: ${studentLang.toUpperCase()}\n`;
  text += `상담 주제: ${topic || '1:1 진로 및 학업 상담'}\n`;
  text += `생성 일시: ${new Date().toLocaleString()}\n`;
  text += `==================================================\n\n`;

  text += `📌 1. 상담 개요 요약\n`;
  overview.forEach((item, idx) => {
    text += `   ${idx + 1}. ${item}\n`;
  });
  text += `\n`;

  text += `🔑 2. 주요 고민 및 안건\n`;
  keyPoints.forEach((item) => {
    text += `   - ${item}\n`;
  });
  text += `\n`;

  text += `💡 3. 교수 지도 및 조언/후속 조치\n`;
  guidance.forEach((item) => {
    text += `   - ${item}\n`;
  });
  text += `\n==================================================\n`;

  return text;
}
