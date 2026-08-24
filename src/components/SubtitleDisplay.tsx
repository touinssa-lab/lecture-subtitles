import React, { useRef, useEffect } from 'react';
import { Volume2, Languages, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react';
import { TARGET_LANGUAGES } from '../services/translationService';
import { Equalizer } from './Equalizer';

export interface SubtitleItem {
  id: string;
  type?: 'lecture' | 'qa';
  koreanText: string;
  englishText: string;
  timestamp: string;
  qaQuestionOriginal?: string;
  qaQuestionKorean?: string;
  qaAnswerKorean?: string;
  qaAnswerTranslated?: string;
  qaLangName?: string;
}

interface SubtitleDisplayProps {
  subtitles: SubtitleItem[];
  interimText: string;
  isListening: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  targetLanguage?: string;
  showKorean: boolean;
  onToggleKorean: () => void;
  onClearSubtitles: () => void;
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  subtitles,
  interimText,
  isListening,
  fontSize,
  targetLanguage = 'en',
  showKorean,
  onToggleKorean,
  onClearSubtitles,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new subtitles arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [subtitles, interimText]);

  // Font size map
  const fontSizeMap = {
    small: { title: '18px', kr: '13px' },
    medium: { title: '22px', kr: '14px' },
    large: { title: '28px', kr: '16px' },
    xl: { title: '36px', kr: '18px' },
    xxl: { title: '44px', kr: '20px' },
  };

  const currentFont = fontSizeMap[fontSize] || fontSizeMap.large;
  const currentLangObj = TARGET_LANGUAGES.find((l) => l.code === targetLanguage) || TARGET_LANGUAGES[0];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Subtitle Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Languages size={20} color="var(--accent-color)" />
          <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>
            실시간 자막 ({currentLangObj.flag} {currentLangObj.name} - {currentLangObj.nativeName})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-hover)',
              border: `1px solid ${isListening ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
            }}
          >
            {isListening ? (
              <Equalizer active={true} color="var(--mic-active)" size="sm" />
            ) : (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                }}
              />
            )}
            <span style={{ fontSize: '12px', fontWeight: 600, color: isListening ? 'var(--mic-active)' : 'var(--text-muted)' }}>
              {isListening ? '음성 수신 중 (Listening...)' : '대기 중 (Ready)'}
            </span>
          </div>

          {/* Show/Hide Korean Toggle */}
          <button
            onClick={onToggleKorean}
            title={showKorean ? '한국어 원문 숨기기' : '한국어 원문 함께 보기'}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              fontSize: '12px',
              fontWeight: 500,
              gap: '4px'
            }}
          >
            {showKorean ? <Eye size={14} /> : <EyeOff size={14} />}
            {showKorean ? '원문 표시 중' : '자막만 표시'}
          </button>

          {/* Clear Feed */}
          <button
            onClick={onClearSubtitles}
            title="자막 비우기"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              color: 'var(--text-muted)',
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Subtitles Main Feed Area */}
      <div
        style={{
          flex: 1,
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {subtitles.length === 0 && !interimText && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '12px',
              textAlign: 'center',
              padding: '30px'
            }}
          >
            <Sparkles size={36} color="var(--accent-color)" style={{ opacity: 0.6 }} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>
              상단 [마이크 시작] 버튼을 누르고 한국어로 말씀을 시작해 보세요.
            </p>
            <p style={{ fontSize: '13px', opacity: 0.7 }}>
              강사의 한국어 음성을 실시간으로 인식하여 선명한 {currentLangObj.name} 자막으로 표시합니다.
            </p>
          </div>
        )}

        {/* Historic Subtitles */}
        {subtitles.map((sub, index) => {
          const isLatest = index === subtitles.length - 1;

          // Render Q&A Session Card
          if (sub.type === 'qa') {
            return (
              <div
                key={sub.id}
                className="animate-subtitle"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💬 Q&A 기록 ({sub.qaLangName || '외국인 학생'})
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub.timestamp}</span>
                </div>

                {/* Q&A Question */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa' }}>
                    🙋‍♂️ [질문] {sub.qaQuestionOriginal ? `(${sub.qaQuestionOriginal})` : ''}
                  </div>
                  <div style={{ fontSize: currentFont.kr, fontWeight: 600, color: '#ffffff', paddingLeft: '8px', borderLeft: '3px solid #8b5cf6' }}>
                    🇰🇷 {sub.qaQuestionKorean || sub.koreanText}
                  </div>
                </div>

                {/* Q&A Answer */}
                {sub.qaAnswerKorean && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                      🎙️ [강사 답변]
                    </div>
                    <div style={{ fontSize: currentFont.kr, color: 'var(--text-muted)', paddingLeft: '8px' }}>
                      🇰🇷 {sub.qaAnswerKorean}
                    </div>
                    {sub.qaAnswerTranslated && (
                      <div style={{ fontSize: currentFont.title, fontWeight: 700, color: '#34d399', paddingLeft: '8px', borderLeft: '3px solid #10b981' }}>
                        {sub.englishText || sub.qaAnswerTranslated}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Standard Lecture Subtitle Card
          return (
            <div
              key={sub.id}
              className="animate-subtitle"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: isLatest ? '16px 20px' : '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: isLatest ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                borderLeft: isLatest ? '4px solid var(--accent-color)' : '4px solid transparent',
                transition: 'all 0.25s ease-out',
                opacity: isLatest ? 1 : 0.75,
              }}
            >
              {/* Korean Original Text (Optional) */}
              {showKorean && sub.koreanText && (
                <div
                  style={{
                    fontSize: currentFont.kr,
                    color: 'var(--text-muted)',
                    fontWeight: 400,
                    lineHeight: 1.4,
                  }}
                >
                  {sub.koreanText}
                </div>
              )}

              {/* Main Subtitle */}
              <div
                style={{
                  fontSize: currentFont.title,
                  fontWeight: 700,
                  color: isLatest ? '#ffffff' : 'var(--text-main)',
                  lineHeight: 1.35,
                  letterSpacing: '-0.01em',
                  textShadow: isLatest ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {sub.englishText}
              </div>
            </div>
          );
        })}

        {/* Interim STT pending state (Live Korean speech being recognized) */}
        {interimText && (
          <div
            className="animate-subtitle"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.08)',
              borderLeft: '4px solid var(--mic-active)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Equalizer active={true} color="var(--mic-active)" size="md" />
            <span
              style={{
                fontSize: currentFont.kr,
                color: 'var(--mic-active)',
                fontStyle: 'italic',
                fontWeight: 500,
              }}
            >
              "{interimText}..."
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
