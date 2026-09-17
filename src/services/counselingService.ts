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
  html?: string;
}

export function getCounselingEmailTemplate(record: CounselingRecord): EmailTemplateContent {
  const lang = record.studentLang || 'en';
  const studentId = record.studentId;
  const scheduledAt = record.scheduledAt || '일정 확인 필요';
  const topic = record.topic || '1:1 학업 및 진로 상담';
  const professor = PROFESSOR_SENDER_INFO.name;
  const office = PROFESSOR_SENDER_INFO.office;
  const profEmail = PROFESSOR_SENDER_INFO.email;

  const buildHtml = (title: string, subGreeting: string, labelTime: string, labelLoc: string, labelTopic: string, note: string) => `
    <div style="font-family: 'Apple SD Gothic Neo', Pretendard, -apple-system, BlinkMacSystemFont, Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 28px 24px; color: #ffffff; text-align: center;">
        <div style="font-size: 13px; letter-spacing: 1.5px; opacity: 0.9; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">JANGAN UNIVERSITY 1:1 COUNSELING</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">${title}</h1>
      </div>
      <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: 600; margin-top: 0; color: #0f172a;">${subGreeting}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; margin-bottom: 12px; font-size: 14px;">
            <span style="font-weight: 700; width: 100px; color: #64748b;">📅 ${labelTime}:</span>
            <span style="font-weight: 800; color: #1e40af; font-size: 15px;">${scheduledAt}</span>
          </div>
          <div style="display: flex; margin-bottom: 12px; font-size: 14px;">
            <span style="font-weight: 700; width: 100px; color: #64748b;">📍 ${labelLoc}:</span>
            <span style="font-weight: 700; color: #0f172a;">${office}</span>
          </div>
          <div style="display: flex; font-size: 14px;">
            <span style="font-weight: 700; width: 100px; color: #64748b;">💬 ${labelTopic}:</span>
            <span style="color: #334155;">${topic}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">${note}</p>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 18px; font-size: 13px; color: #64748b;">
          <div><strong>👨‍🏫 담당 교수:</strong> ${professor} (${profEmail})</div>
          <div style="margin-top: 4px;"><strong>🏫 장안대학교:</strong> 스마트관광학부</div>
        </div>
      </div>
    </div>
  `;

  switch (lang) {
    case 'ko':
      return {
        subject: `[상담 예약 안내] 1:1 학생 상담 일정 안내 (학번: ${studentId})`,
        body: `안녕하세요, ${studentId} 학생.\n\n1:1 교수 상담 일정이 등록되었습니다.\n\n📅 상담 일시: ${scheduledAt}\n📍 상담 장소: ${office}\n💬 상담 주제: ${topic}\n\n일정에 맞춰 참석해 주시기 바랍니다.\n\n감사합니다.\n\n담당 교수: ${professor} (${profEmail})`,
        html: buildHtml(
          '1:1 학생 상담 일정 안내',
          `안녕하세요, ${studentId} 학생.`,
          '상담 일시',
          '상담 장소',
          '상담 주제',
          '정해진 상담 일시에 맞춰 연구실을 방문해 주시기 바랍니다. 부득이한 사정으로 시간 변경이 필요할 경우 담당 교수에게 미리 회신해 주세요.'
        ),
      };
    case 'vi':
      return {
        subject: `[Thông báo lịch tư vấn] Lịch tư vấn 1:1 (MSSV: ${studentId})`,
        body: `Xin chào sinh viên (MSSV: ${studentId}),\n\nLịch tư vấn 1:1 với giáo sư đã được đăng ký thành công.\n\n📅 Thời gian: ${scheduledAt}\n📍 Địa điểm: ${office}\n💬 Nội dung: ${topic}\n\nVui lòng kiểm tra và tham gia đúng giờ.\n\nXin cảm ơn.\n\nGiáo sư phụ trách: ${professor} (${profEmail})`,
        html: buildHtml(
          'Thông Báo Lịch Tư Vấn 1:1',
          `Xin chào sinh viên (MSSV: ${studentId}),`,
          'Thời gian',
          'Địa điểm',
          'Nội dung tư vấn',
          'Vui lòng có mặt đúng giờ tại phòng nghiên cứu của giáo sư. Nếu cần thay đổi thời gian do lý do bất khả kháng, vui lòng liên hệ lại với giáo sư qua email.'
        ),
      };
    case 'uz':
      return {
        subject: `[Maslahat uchrashuvi bildirishnomasi] 1:1 Talaba maslahat jadvali (Talaba ID: ${studentId})`,
        body: `Salom, talaba (ID: ${studentId}).\n\nSizning 1:1 professor maslahat uchrashuvingiz muvaffaqiyatli ro'yxatdan o'tkazildi.\n\n📅 Sana va vaqt: ${scheduledAt}\n📍 Joyi: ${office}\n💬 Mavzu: ${topic}\n\nIltimos, belgilangan vaqtda qatnashishingizni so'raymiz.\n\nRahmat.\n\nMas'ul professor: ${professor} (${profEmail})`,
        html: buildHtml(
          '1:1 Talaba Maslahat Uchrashuvi Bildirishnomasi',
          `Salom, talaba (ID: ${studentId}).`,
          'Sana va vaqt',
          'Joylashuv',
          'Maslahat mavzusi',
          "Iltimos, belgilangan vaqtda professor xonasiga tashrif buyuring. Agar jadvalni o'zgartirish zarur bo'lsa, oldindan professorga xabar bering."
        ),
      };
    case 'mn':
      return {
        subject: `[Зөвлөгөөний товлосон мэдэгдэл] 1:1 Оюутны зөвлөгөөний хуваарь (Оюутны ID: ${studentId})`,
        body: `Сайн байна уу, оюутан (ID: ${studentId}).\n\nТаны 1:1 багшийн зөвлөгөөний цаг амжилттай товлогдлоо.\n\n📅 Огноо ба цаг: ${scheduledAt}\n📍 Байршил: ${office}\n💬 Сэдэв: ${topic}\n\nХуваарийн дагуу цагтаа хамрагдана уу.\n\nБаярлалаа.\n\nХариуцсан багш: ${professor} (${profEmail})`,
        html: buildHtml(
          '1:1 Оюутны Зөвлөгөөний Товлосон Хуваарь',
          `Сайн байна уу, оюутан (ID: ${studentId}).`,
          'Огноо ба цаг',
          'Байршил',
          'Зөвлөгөөний сэдэв',
          'Товлосон цагт багшийн өрөөнд ирж уулзана уу. Хуваарь өөрчлөх шаардлагатай бол багшдаа имэйлээр мэдэгдэнэ үү.'
        ),
      };
    case 'ne':
      return {
        subject: `[परामर्श समय तालिका सूचना] १:१ विद्यार्थी परामर्श तालिका (विद्यार्थी ID: ${studentId})`,
        body: `नमस्कार, विद्यार्थी (ID: ${studentId}).\n\nतपाईंको १:१ प्राध्यापक परामर्श समय तालिका सफलतापूर्वक दर्ता भएको छ।\n\n📅 मिति र समय: ${scheduledAt}\n📍 स्थान: ${office}\n💬 विषय: ${topic}\n\nकृपया तालिका अनुसार समयमै उपस्थित हुनुहोस्।\n\nधन्यवाद।\n\nजिम्मेवार प्राध्यापक: ${professor} (${profEmail})`,
        html: buildHtml(
          '१:१ विद्यार्थी परामर्श तालिका सूचना',
          `नमस्कार, विद्यार्थी (ID: ${studentId}).`,
          'मिति र समय',
          'स्थान',
          'परामर्श विषय',
          'कृपया तोकिएको समयमा प्राध्यापकको कार्यालयमा उपस्थित हुनुहोस्। यदि समय परिवर्तन गर्नुपरेमा अग्रिम जानकारी दिनुहोस्।'
        ),
      };
    case 'en':
    default:
      return {
        subject: `[Counseling Appointment] 1:1 Counseling Schedule Notice (Student ID: ${studentId})`,
        body: `Dear Student (ID: ${studentId}),\n\nYour 1:1 academic counseling session with professor has been scheduled.\n\n📅 Date & Time: ${scheduledAt}\n📍 Location: ${office}\n💬 Topic: ${topic}\n\nPlease check your schedule accordingly and join on time.\n\nThank you.\n\nProfessor: ${professor} (${profEmail})`,
        html: buildHtml(
          '1:1 Student Counseling Schedule Notice',
          `Dear Student (ID: ${studentId}),`,
          'Date & Time',
          'Location',
          'Counseling Topic',
          'Please visit the professor’s research office on time according to the schedule. If you need to reschedule, please reply in advance.'
        ),
      };
  }
}

export const PROFESSOR_SENDER_INFO = {
  name: '이지호 교수',
  email: 'ljh@jangan.ac.kr',
  office: '인문관 313호 이지호 교수 연구실',
};

/**
 * Open default mail client (Outlook / Gmail / Apple Mail) with pre-filled To, Subject, and Body
 */
export function sendCounselingEmailViaMailto(record: CounselingRecord): { success: boolean; message: string } {
  if (!record.studentEmail || !record.studentEmail.trim()) {
    return { success: false, message: '이메일 주소가 없습니다.' };
  }

  const emailData = getCounselingEmailTemplate(record);
  const subjectEncoded = encodeURIComponent(emailData.subject);
  const bodyEncoded = encodeURIComponent(emailData.body);

  const mailtoUrl = `mailto:${record.studentEmail.trim()}?subject=${subjectEncoded}&body=${bodyEncoded}`;
  window.open(mailtoUrl, '_blank');

  return {
    success: true,
    message: `${record.studentEmail} 주소로 이메일 클라이언트(아웃룩/메일 앱)가 실행되었습니다.`,
  };
}

/**
 * Send automated email notification to student via Vercel Serverless API (/api/send-email)
 * Automatically falls back to mailto client if server-side email credentials are not set up.
 */
export async function sendCounselingEmailNotification(
  record: CounselingRecord
): Promise<{ success: boolean; message: string; method: 'server' | 'mailto' | 'none' }> {
  const email = (record.studentEmail || '').trim();
  if (!email) {
    return {
      success: false,
      method: 'none',
      message: '이메일 주소가 등록되지 않아 메일 발송이 건너뛰어졌습니다.',
    };
  }

  const emailData = getCounselingEmailTemplate(record);

  try {
    // 1. Vercel 서버리스 API (/api/send-email) 호출하여 완전 자동 발송 시도
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.html,
        senderName: PROFESSOR_SENDER_INFO.name,
        senderEmail: PROFESSOR_SENDER_INFO.email,
        studentLang: record.studentLang,
        scheduledAt: record.scheduledAt,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.success) {
        return {
          success: true,
          method: 'server',
          message: `✉️ 학생(${email})에게 [${(record.studentLang || 'EN').toUpperCase()}] 언어 공식 안내 메일이 완전 자동 발송되었습니다!`,
        };
      } else if (data?.requiresFallback) {
        // 서버 발송 키 미설정 시 안전하게 PC 메일 앱으로 즉시 연결
        console.info('[EmailService] Server credentials not yet set, falling back to mailto.');
        sendCounselingEmailViaMailto(record);
        return {
          success: true,
          method: 'mailto',
          message: `✉️ 학생(${email})에게 보낼 안내 메일이 PC 메일 프로그램(Outlook 등)에 준비되었습니다. '보내기'를 눌러주세요.`,
        };
      }
    }
  } catch (err) {
    console.warn('[EmailService] Automated server sending failed, falling back to mailto:', err);
  }

  // 2. 비상 안전망: 서버 통신 실패 시에도 내용 유실 없이 메일 클라이언트 연동
  sendCounselingEmailViaMailto(record);
  return {
    success: true,
    method: 'mailto',
    message: `✉️ 학생(${email})의 이메일 안내창(아웃룩/기본 메일 앱)이 준비되었습니다. '보내기'를 눌러 완료해 주세요.`,
  };
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
