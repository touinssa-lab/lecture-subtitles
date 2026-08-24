import React, { useRef, useEffect } from 'react';
import { MessageSquare, Mic, ArrowRight, CheckCircle2, RotateCcw, XCircle, Globe } from 'lucide-react';
import { TARGET_LANGUAGES } from '../services/translationService';
import { Equalizer } from './Equalizer';

export interface QAItem {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
}

interface QADisplayProps {
  qaPhase: 'question' | 'answer';
  questionItem: QAItem | null;
  answerItem: QAItem | null;
  interimText: string;
  isListening: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  studentLang: string;
  onStudentLangChange: (lang: string) => void;
  onStartAnswerPhase: () => void;
  onResetQuestion: () => void;
  onEndQA: () => void;
}

export const QADisplay: React.FC<QADisplayProps> = ({
  qaPhase,
  questionItem,
  answerItem,
  interimText,
  isListening,
  fontSize,
  studentLang,
  onStudentLangChange,
  onStartAnswerPhase,
  onResetQuestion,
  onEndQA,
}) => {
  const questionBottomRef = useRef<HTMLDivElement | null>(null);
  const answerBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (qaPhase === 'question') {
      questionBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      answerBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaPhase, questionItem, answerItem, interimText]);

  const fontSizeMap = {
    small: { title: '18px', kr: '13px' },
    medium: { title: '22px', kr: '14px' },
    large: { title: '28px', kr: '16px' },
    xl: { title: '34px', kr: '18px' },
    xxl: { title: '40px', kr: '20px' },
  };

  const currentFont = fontSizeMap[fontSize] || fontSizeMap.large;
  const currentStudentLangObj = TARGET_LANGUAGES.find((l) => l.code === studentLang) || TARGET_LANGUAGES[0];

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
        border: '2px solid #8b5cf6', // Highlight border for Q&A mode
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
      }}
    >
      {/* Top Header Bar for Q&A Mode */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#8b5cf6',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MessageSquare size={14} /> Q&A 모드
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            {qaPhase === 'question' ? '1단계: 질문 수신 중' : '2단계: 강사 답변 중'}
          </span>
        </div>

        {/* Control Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {qaPhase === 'question' ? (
            <>
              <button
                onClick={onStartAnswerPhase}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
              >
                <ArrowRight size={15} /> 답변하기 (마이크 전환)
              </button>
            </>
          ) : (
            <button
              onClick={onResetQuestion}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} /> 질문 다시 받기
            </button>
          )}

          <button
            onClick={onEndQA}
            title="Q&A 종료 후 강의 모드로 복귀"
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
            }}
          >
            <XCircle size={14} /> Q&A 종료
          </button>
        </div>
      </div>

      {/* Main Split Body Area (Top: Question, Bottom: Answer) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {/* ================= TOP PANEL: Question Section ================= */}
        <div
          style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '2px solid rgba(139, 92, 246, 0.3)',
            background: qaPhase === 'question' ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
            padding: '14px 18px',
            overflowY: 'auto',
            transition: 'background 0.3s ease',
          }}
        >
          {/* Sub Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#a78bfa' }}>
                🙋‍♂️ 질문 (Student Question)
              </span>
              {qaPhase === 'question' && isListening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#a78bfa', fontWeight: 600 }}>
                  <Equalizer active={true} color="#a78bfa" size="sm" /> 질문 수신 중...
                </div>
              )}
            </div>

            {/* Student Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Globe size={13} color="#a78bfa" />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>질문 언어:</span>
              <select
                value={studentLang}
                onChange={(e) => onStudentLangChange(e.target.value)}
                disabled={qaPhase === 'answer'}
                style={{
                  background: 'transparent',
                  color: 'var(--text-main)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: qaPhase === 'answer' ? 'default' : 'pointer',
                  outline: 'none',
                }}
              >
                {TARGET_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {questionItem ? (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderLeft: '4px solid #8b5cf6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Original Question (e.g. English) */}
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  [{currentStudentLangObj.name}] "{questionItem.originalText}"
                </div>

                {/* Translated Korean Question for Teacher */}
                <div
                  style={{
                    fontSize: currentFont.title,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}
                >
                  🇰🇷 {questionItem.translatedText || questionItem.originalText}
                </div>
              </div>
            ) : interimText && qaPhase === 'question' ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(139, 92, 246, 0.08)',
                  borderLeft: '4px solid #a78bfa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Equalizer active={true} color="#a78bfa" size="md" />
                <span style={{ fontSize: currentFont.kr, color: '#a78bfa', fontStyle: 'italic', fontWeight: 500 }}>
                  "{interimText}..."
                </span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '10px' }}>
                {qaPhase === 'question' ? (
                  <p style={{ margin: 0 }}>
                    🎙️ 외국인 학생이 <strong>[{currentStudentLangObj.name}]</strong>로 말하면 자동으로 **한국어 자막**으로 번역되어 표시됩니다.
                  </p>
                ) : (
                  <p style={{ margin: 0, opacity: 0.7 }}>등록된 질문이 있습니다.</p>
                )}
              </div>
            )}
          </div>
          <div ref={questionBottomRef} />
        </div>

        {/* ================= BOTTOM PANEL: Answer Section ================= */}
        <div
          style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            background: qaPhase === 'answer' ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
            padding: '14px 18px',
            overflowY: 'auto',
            transition: 'background 0.3s ease',
          }}
        >
          {/* Sub Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>
                🎙️ 강사 답변 (Lecturer Answer)
              </span>
              {qaPhase === 'answer' && isListening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                  <Equalizer active={true} color="#34d399" size="sm" /> 답변 수신 중...
                </div>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              한국어 → {currentStudentLangObj.flag} {currentStudentLangObj.name} 번역 자막
            </div>
          </div>

          {/* Answer Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {answerItem ? (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderLeft: '4px solid #10b981',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Korean Answer */}
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  🇰🇷 강사 원문: "{answerItem.originalText}"
                </div>

                {/* Translated Answer (e.g. English) */}
                <div
                  style={{
                    fontSize: currentFont.title,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentStudentLangObj.flag} {answerItem.translatedText}
                </div>
              </div>
            ) : interimText && qaPhase === 'answer' ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '4px solid #34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Equalizer active={true} color="#34d399" size="md" />
                <span style={{ fontSize: currentFont.kr, color: '#34d399', fontStyle: 'italic', fontWeight: 500 }}>
                  "{interimText}..."
                </span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '10px' }}>
                {qaPhase === 'answer' ? (
                  <p style={{ margin: 0 }}>
                    📢 한국어로 말씀하시면 학생 언어인 <strong>[{currentStudentLangObj.name}]</strong> 자막으로 번역 출력됩니다.
                  </p>
                ) : (
                  <p style={{ margin: 0, opacity: 0.6 }}>
                    상단 <strong>[답변하기]</strong> 버튼을 누르고 한국어로 답변해 주세요.
                  </p>
                )}
              </div>
            )}
          </div>
          <div ref={answerBottomRef} />
        </div>
      </div>
    </div>
  );
};
