import React, { useRef, useEffect, useState } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  LogOut,
  User,
  GraduationCap,
  Sun,
  Moon,
  Globe,
  Type,
} from 'lucide-react';
import { CounselingUtterance } from '../data/counselingData';
import { TARGET_LANGUAGES } from '../services/translationService';
import { Equalizer } from './Equalizer';

interface CounselingSessionViewProps {
  studentId: string;
  studentLang: string;
  topic: string;
  utterances: CounselingUtterance[];
  professorInterim: string;
  studentInterim: string;
  isListening: boolean;
  onToggleListening: () => void;
  onEndSession: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

type FontSizeOption = 'small' | 'medium' | 'large' | 'xl' | 'xxl';

export const CounselingSessionView: React.FC<CounselingSessionViewProps> = ({
  studentId,
  studentLang,
  topic,
  utterances,
  professorInterim,
  studentInterim,
  isListening,
  onToggleListening,
  onEndSession,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [fontSize, setFontSize] = useState<FontSizeOption>('medium');
  const professorScrollRef = useRef<HTMLDivElement>(null);
  const studentScrollRef = useRef<HTMLDivElement>(null);

  const studentLangObj =
    TARGET_LANGUAGES.find((l) => l.code === studentLang) || TARGET_LANGUAGES[0];

  useEffect(() => {
    professorScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    studentScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [utterances, professorInterim, studentInterim]);

  const getFontSizeConfig = (size: FontSizeOption) => {
    switch (size) {
      case 'small':
        return { main: '16px', sub: '12px' };
      case 'medium':
        return { main: '19px', sub: '13px' };
      case 'large':
        return { main: '23px', sub: '15px' };
      case 'xl':
        return { main: '28px', sub: '17px' };
      case 'xxl':
        return { main: '34px', sub: '20px' };
      default:
        return { main: '19px', sub: '13px' };
    }
  };

  const fontStyles = getFontSizeConfig(fontSize);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ================= Header Bar ================= */}
      <header
        style={{
          height: '60px',
          padding: '0 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10,
          boxSizing: 'border-box',
          gap: '12px',
        }}
      >
        {/* Left: Brand Logo + Title + Student Meta Info Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Logo Badge */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={20} color="#ffffff" />
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              1:1 외국인 학생 상담실
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
              실시간 양방향 음성 번역 & AI 상담록 자동 저장
            </p>
          </div>

          {/* Meta Info Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              학번: {studentId}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              상담 언어: {studentLangObj.name} ({studentLangObj.nativeName})
            </span>
          </div>
        </div>

        {/* Center: Mic Action Controls & Subtitle Font Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mic Toggle Button */}
          <button
            onClick={onToggleListening}
            className={isListening ? 'recording-pulse' : ''}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '999px',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 4px 16px rgba(14, 165, 233, 0.4)',
              cursor: 'pointer',
              boxSizing: 'border-box',
              border: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {isListening ? <Equalizer active={true} color="#ffffff" size="sm" /> : <Mic size={16} />}
            {isListening ? '음성 인식 중지' : '마이크 인식 시작'}
          </button>

          {/* Subtitle Font Size Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '0 12px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              height: '36px',
              boxSizing: 'border-box',
            }}
          >
            <Type size={14} color="rgba(255, 255, 255, 0.7)" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as FontSizeOption)}
              style={{
                height: '100%',
                background: 'transparent',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <option value="small" style={{ background: '#1e293b', color: '#ffffff' }}>자막: 보통 (S)</option>
              <option value="medium" style={{ background: '#1e293b', color: '#ffffff' }}>자막: 크게 (M)</option>
              <option value="large" style={{ background: '#1e293b', color: '#ffffff' }}>자막: 더 크게 (L)</option>
              <option value="xl" style={{ background: '#1e293b', color: '#ffffff' }}>자막: 아주 크게 (XL)</option>
              <option value="xxl" style={{ background: '#1e293b', color: '#ffffff' }}>자막: 최대 크기 (XXL)</option>
            </select>
          </div>

          {/* End Session Button */}
          <button
            onClick={onEndSession}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '999px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <LogOut size={15} /> 상담 종료 & 요약 저장
          </button>
        </div>

        {/* Right: Theme Toggle Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? '라이트 모드로 변경' : '다크 모드로 변경'}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}
        </div>
      </header>

      {/* ================= Main 50:50 Split Body ================= */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '16px',
          background: '#0f172a',
          minHeight: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* ================= LEFT PANEL: PROFESSOR (Korean View) ================= */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Sub-toolbar Header */}
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#a78bfa' }}>
                  교수 세션 (Professor - 한국어)
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  교수의 한국어 음성 ➔ 학생 모국어({studentLangObj.name})로 자동 번역
                </p>
              </div>
            </div>

            {/* Live Mic Status Indicator */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: isListening ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '12px',
                color: isListening ? '#a78bfa' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: 700,
              }}
            >
              {isListening ? <Equalizer active={true} color="#a78bfa" size="sm" /> : <MicOff size={14} />}
              {isListening ? '한국어 감지 중' : '대기 중'}
            </div>
          </div>

          {/* Transcript Scroll Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {utterances.length === 0 && !professorInterim ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  gap: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Mic size={32} color="#a78bfa" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    상단 [마이크 인식 시작] 버튼을 누르고 말씀하세요.
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    교수님의 한국어 음성이 실시간 텍스트 및 학생 언어로 자동 번역됩니다.
                  </p>
                </div>
              </div>
            ) : (
              utterances.map((u) => {
                const isProf = u.speaker === 'professor';
                return (
                  <div
                    key={u.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderLeft: `4px solid ${isProf ? '#8b5cf6' : '#10b981'}`,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 800, color: isProf ? '#a78bfa' : '#34d399' }}>
                        {isProf ? '교수' : `학생 (${studentId})`}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>{u.timestamp}</span>
                    </div>

                    {/* Main text: Korean */}
                    <div style={{ fontSize: fontStyles.main, fontWeight: 700, lineHeight: 1.4, color: '#ffffff', transition: 'font-size 0.2s ease' }}>
                      {isProf ? `KR ${u.originalText}` : `KR 번역: ${u.translatedText}`}
                    </div>

                    {/* Secondary text */}
                    <div style={{ fontSize: fontStyles.sub, color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', transition: 'font-size 0.2s ease' }}>
                      {isProf ? `${studentLang} 번역: ${u.translatedText}` : `${studentLang} 원문: "${u.originalText}"`}
                    </div>
                  </div>
                );
              })
            )}

            {/* Interim Feedback */}
            {professorInterim && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  borderLeft: '4px solid #8b5cf6',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Equalizer active={true} color="#8b5cf6" size="md" />
                <span style={{ fontSize: fontStyles.main, color: '#8b5cf6', fontStyle: 'italic', fontWeight: 600 }}>
                  "{professorInterim}..."
                </span>
              </div>
            )}

            <div ref={professorScrollRef} />
          </div>
        </div>

        {/* ================= RIGHT PANEL: STUDENT (Foreign View) ================= */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Sub-toolbar Header */}
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#34d399' }}>
                  학생 세션 (Student - {studentLangObj.name})
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  학생의 모국어 음성 ➔ 교수의 한국어로 자동 번역
                </p>
              </div>
            </div>

            {/* Live Mic Status Indicator */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: isListening ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '12px',
                color: isListening ? '#34d399' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: 700,
              }}
            >
              {isListening ? <Equalizer active={true} color="#34d399" size="sm" /> : <MicOff size={14} />}
              {isListening ? `${studentLangObj.name} 감지 중` : '대기 중'}
            </div>
          </div>

          {/* Transcript Scroll Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {utterances.length === 0 && !studentInterim ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  gap: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Globe size={32} color="#10b981" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    학생의 모국어 음성이 교수의 화면에 한국어로 실시간 번역됩니다.
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    다국어 음성 번역 지원 ({studentLangObj.name})
                  </p>
                </div>
              </div>
            ) : (
              utterances.map((u) => {
                const isProf = u.speaker === 'professor';
                return (
                  <div
                    key={u.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderLeft: `4px solid ${isProf ? '#8b5cf6' : '#10b981'}`,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 800, color: isProf ? '#a78bfa' : '#34d399' }}>
                        {isProf ? 'Professor' : `Student (${studentId})`}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>{u.timestamp}</span>
                    </div>

                    {/* Main text */}
                    <div style={{ fontSize: fontStyles.main, fontWeight: 700, lineHeight: 1.4, color: '#ffffff', transition: 'font-size 0.2s ease' }}>
                      {isProf ? `${studentLang} ${u.translatedText}` : `${studentLang} ${u.originalText}`}
                    </div>

                    {/* Secondary text */}
                    <div style={{ fontSize: fontStyles.sub, color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', transition: 'font-size 0.2s ease' }}>
                      {isProf ? `KR Original: "${u.originalText}"` : `KR Translated: ${u.translatedText}`}
                    </div>
                  </div>
                );
              })
            )}

            {/* Interim Feedback */}
            {studentInterim && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '4px solid #10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Equalizer active={true} color="#10b981" size="md" />
                <span style={{ fontSize: fontStyles.main, color: '#10b981', fontStyle: 'italic', fontWeight: 600 }}>
                  "{studentInterim}..."
                </span>
              </div>
            )}

            <div ref={studentScrollRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
