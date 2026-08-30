export interface CounselingUtterance {
  id: string;
  speaker: 'professor' | 'student';
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
}

export interface CounselingSummary {
  overview: string[];
  keyPoints: string[];
  guidance: string[];
  fullSummaryText: string;
}

export interface CounselingRecord {
  id: string;
  semesterId: string;
  studentId: string;
  studentLang: string;
  topic: string;
  scheduledAt: string;
  createdAt: string;
  status: 'pending' | 'completed';
  utterances: CounselingUtterance[];
  summary?: CounselingSummary;
}

export const DEFAULT_COUNSELINGS: CounselingRecord[] = [
  {
    id: 'counsel-sample-1',
    semesterId: 'sem-2026-2',
    studentId: '20261042',
    studentLang: 'en',
    topic: '전공 학업 적응 및 진로 상담',
    scheduledAt: '2026-09-15 14:30',
    createdAt: '2026.09.15 14:30',
    status: 'completed',
    utterances: [
      {
        id: 'u-1',
        speaker: 'professor',
        originalText: '안녕하세요, 이번 학기 전공 수업 들으면서 어려운 점이 있으신가요?',
        translatedText: 'Hello, are you experiencing any difficulties taking major classes this semester?',
        sourceLang: 'ko',
        targetLang: 'en',
        timestamp: '14:30:15',
      },
      {
        id: 'u-2',
        speaker: 'student',
        originalText: 'The programming assignments are a bit fast for me to keep up.',
        translatedText: '프로그래밍 과제 진행 속도가 조금 빨라서 따라가기가 약간 어렵습니다.',
        sourceLang: 'en',
        targetLang: 'ko',
        timestamp: '14:30:42',
      },
      {
        id: 'u-3',
        speaker: 'professor',
        originalText: '매주 튜터링 세션을 제공하고 있으니 참가해 보세요. 큰 도움이 될 것입니다.',
        translatedText: 'We provide weekly tutoring sessions, so please join them. It will be a great help.',
        sourceLang: 'ko',
        targetLang: 'en',
        timestamp: '14:31:10',
      },
    ],
    summary: {
      overview: [
        '학생(학번: 20261042)은 전공 프로그래밍 과제 수행 속도에 어려움을 겪고 있음.',
        '교수는 주차별 튜터링 프로그램 안내 및 학습 지원 방안 제시.',
      ],
      keyPoints: [
        '🔑 프로그래밍 과제 난이도 및 제출 기한 상담',
        '🔑 외국인 전용 학습 튜터링 참여 권장',
      ],
      guidance: [
        '교수 조언: 튜터링 세션 매주 참석 및 실습 과제 조교 피드백 활용 권고.',
      ],
      fullSummaryText: `==================================================\n🤖 1:1 외국인 학생 상담 요약 리포트\n학번: 20261042 | 언어: 영어(en)\n일시: 2026.09.15 14:30\n상담 주제: 전공 학업 적응 및 진로 상담\n==================================================\n📌 1. 핵심 2줄 요약\n  1. 학생은 프로그래밍 과제 진행 속도에 어려움을 느끼고 있음.\n  2. 교수는 주차별 튜터링 프로그램 참가 및 조교 지원 활용 안내.\n\n🔑 2. 주요 고민 사항\n  - 과제 해결 및 실습 수업 적응\n\n💡 3. 지도 및 조언 사항\n  - 매주 튜터링 세션 참여 및 단계별 학습 지도 제공 예정\n==================================================`,
    },
  },
];
