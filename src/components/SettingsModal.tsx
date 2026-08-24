import React, { useState } from 'react';
import { X, Key, CheckCircle, Info, Cpu } from 'lucide-react';
import { TranslationSettings } from '../services/translationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onSaveSettings: (newSettings: TranslationSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [engine, setEngine] = useState<'google' | 'deepl' | 'free'>(settings.engine);
  const [googleApiKey, setGoogleApiKey] = useState<string>(settings.googleApiKey || '');
  const [deeplApiKey, setDeeplApiKey] = useState<string>(settings.deeplApiKey || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      engine,
      googleApiKey,
      deeplApiKey,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="var(--accent-color)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
              실시간 번역 엔진 및 API 설정
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Engine Selector */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              번역 엔진 선택 (Translation Engine)
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* Free Engine */}
              <button
                type="button"
                onClick={() => setEngine('free')}
                style={{
                  padding: '12px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${engine === 'free' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  background: engine === 'free' ? 'var(--accent-glow)' : 'var(--bg-hover)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700 }}>무료 기본 엔진</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>키 등록 없이 바로 사용</span>
              </button>

              {/* Google Translate API */}
              <button
                type="button"
                onClick={() => setEngine('google')}
                style={{
                  padding: '12px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${engine === 'google' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  background: engine === 'google' ? 'var(--accent-glow)' : 'var(--bg-hover)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Google 번역 API</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>월 50만 자 무료</span>
              </button>

              {/* DeepL API */}
              <button
                type="button"
                onClick={() => setEngine('deepl')}
                style={{
                  padding: '12px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${engine === 'deepl' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  background: engine === 'deepl' ? 'var(--accent-glow)' : 'var(--bg-hover)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700 }}>DeepL API</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>월 50만 자 무료</span>
              </button>
            </div>
          </div>

          {/* Google API Key Input */}
          {engine === 'google' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>
                <Key size={14} style={{ display: 'inline', marginRight: 4 }} />
                Google Cloud Translation API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                * Google Cloud Console에서 발급받으신 API 키를 입력해 주세요. (월 50만 글자까지 무료)
              </span>
            </div>
          )}

          {/* DeepL API Key Input */}
          {engine === 'deepl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>
                <Key size={14} style={{ display: 'inline', marginRight: 4 }} />
                DeepL API Authentication Key
              </label>
              <input
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx:fx"
                value={deeplApiKey}
                onChange={(e) => setDeeplApiKey(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                * DeepL API Free Plan 키 (끝에 :fx 가 붙은 키 지원)
              </span>
            </div>
          )}

          {/* Help Info Box */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-main)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <Info size={20} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>무료 기본 엔진 정보:</strong> 별도의 API Key를 입력하지 않으셔도 무료 기본 연동 엔진으로 즉시 실시간 영문 번역 자막을 테스트해 보실 수 있습니다.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={16} /> 설정 저장하기
          </button>
        </div>
      </div>
    </div>
  );
};
