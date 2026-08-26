import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onAuthenticate: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthenticate }) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Real-time keyboard state detectors
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [isKoreanInput, setIsKoreanInput] = useState<boolean>(false);

  // SHA-256 Hash verification to prevent plain-text password exposure in frontend bundle
  const EXPECTED_HASH = '49a441871e3d21536c8b69c3849836cfcdb6634bddd65073ba6203853dd8b700';

  const hashString = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hashedInput = await hashString(password.trim());
      if (hashedInput === EXPECTED_HASH) {
        sessionStorage.setItem('lecture_app_authenticated', 'true');
        onAuthenticate();
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    }
  };

  const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleCompositionStart = () => {
    setIsKoreanInput(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setError(false);

    // Detect Korean Hangul characters in input string
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(val);
    setIsKoreanInput(hasKorean);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="animate-subtitle"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Icon Header */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-[#6366f1, #a855f7]',
            backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Lock size={30} color="#ffffff" />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          강의교재관리/번역자막시스템
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.5 }}>
          공공PC 사용시 비밀번호가 저장되지 않도록 주의하세요
        </p>

        {/* Form - Configured to bypass Chrome Password Saver on public PCs */}
        <form onSubmit={handleSubmit} autoComplete="off" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <div
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                display: 'flex',
              }}
            >
              <KeyRound size={18} />
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              name="access_pin_code"
              id="access_pin_code"
              autoComplete="new-password"
              data-lpignore="true"
              data-form-type="other"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="비밀번호 입력..."
              value={password}
              onChange={handleInputChange}
              onKeyDown={handleKeyActivity}
              onKeyUp={handleKeyActivity}
              onCompositionStart={handleCompositionStart}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 44px 14px 42px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: error
                  ? '2px solid #ef4444'
                  : isKoreanInput || isCapsLockOn
                  ? '2px solid #f59e0b'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                padding: 0,
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Real-time Keyboard Status Warnings */}
          {isCapsLockOn && (
            <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>🔒 Caps Lock이 켜져 있습니다.</span>
            </div>
          )}

          {isKoreanInput && (
            <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>⌨️ 키보드가 한글 상태입니다. (영문으로 입력해 주세요)</span>
            </div>
          )}

          {error && (
            <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
              ⚠️ 비밀번호가 올바르지 않습니다.
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            시스템 접속하기 <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer Security Badge & Copyright */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>보안 인증 세션 작동 중</span>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 500,
              letterSpacing: '0.02em',
              opacity: 0.85,
            }}
          >
            © {new Date().getFullYear()} Tourism Insight. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};
