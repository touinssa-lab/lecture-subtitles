import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onAuthenticate: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthenticate }) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'insight123') {
      sessionStorage.setItem('lecture_app_authenticated', 'true');
      onAuthenticate();
    } else {
      setError(true);
    }
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
          실시간 강의 자막 시스템
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.5 }}>
          접속을 위해 보안 비밀번호를 입력해 주세요.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              placeholder="비밀번호 입력..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 44px 14px 42px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: error ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
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

        {/* Footer Security Badge */}
        <div
          style={{
            marginTop: '32px',
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
      </div>
    </div>
  );
};
