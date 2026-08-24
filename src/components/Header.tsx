import React from 'react';
import { Mic, MicOff, Settings, Sun, Moon, ExternalLink, Columns, Rows, Globe } from 'lucide-react';
import { TARGET_LANGUAGES } from '../services/translationService';

interface HeaderProps {
  isListening: boolean;
  onToggleMic: () => void;
  layoutMode: 'side-by-side' | 'bottom-overlay';
  onChangeLayout: (mode: 'side-by-side' | 'bottom-overlay') => void;
  fontSize: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  onChangeFontSize: (size: 'small' | 'medium' | 'large' | 'xl' | 'xxl') => void;
  targetLanguage: string;
  onChangeTargetLanguage: (lang: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenPopoutWindow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isListening,
  onToggleMic,
  layoutMode,
  onChangeLayout,
  fontSize,
  onChangeFontSize,
  targetLanguage,
  onChangeTargetLanguage,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenPopoutWindow,
}) => {
  const CONTROL_HEIGHT = '38px';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)',
        gap: '16px',
        zIndex: 10,
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}
        >
          <Mic size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Live Lecture Subtitles
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            실시간 한국어 음성 인식 & 다국어 자막 교재 뷰어
          </p>
        </div>
      </div>

      {/* Main Microphone Action Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleMic}
          className={isListening ? 'recording-pulse' : ''}
          style={{
            height: CONTROL_HEIGHT,
            padding: '0 24px',
            borderRadius: '999px',
            background: isListening ? 'var(--mic-active)' : 'var(--accent-gradient)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isListening ? '0 0 20px var(--mic-glow)' : '0 4px 16px var(--accent-glow)',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          {isListening ? '음성 인식 중지 (Stop)' : '마이크 인식 시작 (Start Mic)'}
        </button>
      </div>

      {/* Toolbar & View Options */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Target Subtitle Language Selector */}
        <div
          style={{
            height: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-hover)',
            padding: '0 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
          }}
        >
          <Globe size={15} color="var(--accent-color)" />
          <select
            value={targetLanguage}
            onChange={(e) => onChangeTargetLanguage(e.target.value)}
            style={{
              height: '100%',
              background: 'transparent',
              color: 'var(--text-main)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              paddingRight: '4px',
            }}
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                {lang.flag} {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Layout Toggle */}
        <div
          style={{
            height: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-hover)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={() => onChangeLayout('side-by-side')}
            title="좌우 분할 레이아웃"
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              background: layoutMode === 'side-by-side' ? 'var(--bg-card)' : 'transparent',
              color: layoutMode === 'side-by-side' ? 'var(--accent-color)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              gap: '5px',
              border: 'none',
            }}
          >
            <Columns size={14} /> 좌우 분할
          </button>
          <button
            onClick={() => onChangeLayout('bottom-overlay')}
            title="하단 자막 레이아웃"
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              background: layoutMode === 'bottom-overlay' ? 'var(--bg-card)' : 'transparent',
              color: layoutMode === 'bottom-overlay' ? 'var(--accent-color)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              gap: '5px',
              border: 'none',
            }}
          >
            <Rows size={14} /> 하단 자막
          </button>
        </div>

        {/* Font Size Selector */}
        <select
          value={fontSize}
          onChange={(e) => onChangeFontSize(e.target.value as any)}
          style={{
            height: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          <option value="small">자막: 보통 (S)</option>
          <option value="medium">자막: 크게 (M)</option>
          <option value="large">자막: 더 크게 (L)</option>
          <option value="xl">자막: 아주 크게 (XL)</option>
          <option value="xxl">자막: 최대 크기 (XXL)</option>
        </select>

        {/* Pop-out Student Projection Window */}
        <button
          onClick={onOpenPopoutWindow}
          title="학생 프로젝터용 독립 팝업 창 열기"
          style={{
            height: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            color: 'var(--accent-color)',
            fontWeight: 600,
            fontSize: '13px',
            gap: '6px',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
          }}
        >
          <ExternalLink size={14} /> 프로젝터 팝업 창
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="다크 / 라이트 모드 전환"
          style={{
            height: CONTROL_HEIGHT,
            width: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
            padding: 0,
          }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="설정 (API Key & 옵션)"
          style={{
            height: CONTROL_HEIGHT,
            width: CONTROL_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
            padding: 0,
          }}
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
};
