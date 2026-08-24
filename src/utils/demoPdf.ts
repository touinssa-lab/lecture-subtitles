// Demo Presentation Slides generator for instant testing without uploading a PDF file

export interface DemoSlide {
  id: number;
  title: string;
  subtitle: string;
  contentLines: string[];
  bgGradient: string;
}

export const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 1,
    title: "글로벌 지역 관광 콘텐츠 기획",
    subtitle: "Regional Tourism Trend Analysis 2026",
    contentLines: [
      "• 외국인 수강생 대상 한국 관광 트렌드 특강",
      "• 실시간 한국어 음성 인식 & 영문 자막 서포트 시스템",
      "• 강연자: 투어리즘인사이트 전문 강사진"
    ],
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
  },
  {
    id: 2,
    title: "1. 한국 로컬 관광 트렌드 변화",
    subtitle: "Shifting Paradigm of Local K-Tourism",
    contentLines: [
      "• 유명 관광지 중심 관람에서 로컬 일상 체험으로 이동",
      "• 전통시장, K-Food 클래스, 템플스테이 수요 대폭 증가",
      "• 개별 관광객(FIT) 비율 85% 돌파"
    ],
    bgGradient: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)"
  },
  {
    id: 3,
    title: "2. 스마트 관광 생태계 및 IT 연동",
    subtitle: "Smart Tourism & Multilingual Support Ecosystem",
    contentLines: [
      "• 실시간 다국어 AI 음성 자막 서비스의 필요성",
      "• 언어 장벽 없는 몰입형 강의 경험 제공",
      "• 디지털 포용 관광(Inclusive Tourism) 정책의 확장"
    ],
    bgGradient: "linear-gradient(135deg, #701a75 0%, #4c1d95 50%, #5b21b6 100%)"
  },
  {
    id: 4,
    title: "3. 결론 및 향후 과제",
    subtitle: "Conclusion & Strategic Outlook",
    contentLines: [
      "• 맞춤형 로컬 스토리텔링 콘텐츠 개발",
      "• 실시간 수강생 피드백 시스템 도입",
      "• 감사합니다 / Q&A Session"
    ],
    bgGradient: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)"
  }
];

export function renderDemoSlideToCanvas(canvas: HTMLCanvasElement, slide: DemoSlide) {
  if (!canvas || !slide) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  if (slide.id === 1) {
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#4338ca');
  } else if (slide.id === 2) {
    grad.addColorStop(0, '#064e3b');
    grad.addColorStop(1, '#059669');
  } else if (slide.id === 3) {
    grad.addColorStop(0, '#701a75');
    grad.addColorStop(1, '#5b21b6');
  } else {
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#475569');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle background decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.25, width * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Slide Number Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(width * 0.06, height * 0.08, 110, 36, 18);
  } else {
    ctx.rect(width * 0.06, height * 0.08, 110, 36);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText(`SLIDE ${slide.id} / ${DEMO_SLIDES.length}`, width * 0.08, height * 0.115);

  // Main Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
  ctx.fillText(slide.title, width * 0.06, height * 0.26);

  // Subtitle
  ctx.fillStyle = '#38bdf8';
  ctx.font = '500 20px "Inter", sans-serif';
  ctx.fillText(slide.subtitle, width * 0.06, height * 0.33);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.06, height * 0.38);
  ctx.lineTo(width * 0.94, height * 0.38);
  ctx.stroke();

  // Content Lines
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '400 22px "Noto Sans KR", sans-serif';
  let startY = height * 0.48;
  const lineHeight = height * 0.10;

  slide.contentLines.forEach((line) => {
    ctx.fillText(line, width * 0.06, startY);
    startY += lineHeight;
  });

  // Footer Note
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '14px "Noto Sans KR", sans-serif';
  ctx.fillText('💡 Tip: [←] [→] 방향키를 누르거나 하단 전후 버튼으로 슬라이드를 이동할 수 있습니다.', width * 0.06, height * 0.92);
}
