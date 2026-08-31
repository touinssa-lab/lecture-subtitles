import React, { useState } from 'react';
import { UserCheck, BookOpen, Pin, AlertCircle, ArrowRight } from 'lucide-react';

interface StudentAuthModalProps {
  isOpen: boolean;
  courseTitle?: string;
  weekNum?: number;
  topic?: string;
  onSubmit: (studentId: string) => void;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  courseTitle = '관광 AI 콘텐츠 제작 실무',
  weekNum = 1,
  topic = '강의 오리엔테이션',
  onSubmit,
}) => {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentIdInput.trim();

    // Validate 8 digits
    if (!/^\d{8}$/.test(cleanId)) {
      setErrorMsg('학번 8자리 숫자를 올바르게 입력해 주세요. (예: 20261234)');
      return;
    }

    setErrorMsg(null);
    onSubmit(cleanId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.25)',
          padding: '32px 28px',
          color: '#ffffff',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)',
              marginBottom: '16px',
            }}
          >
            <UserCheck size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            온라인 강의실 입장
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0 0' }}>
            실시간 번역 자막 시청을 위해 학번을 입력해 주세요.
          </p>
        </div>

        {/* Course Name & Week Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <BookOpen size={18} color="#8b5cf6" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            {courseTitle} <span style={{ color: '#8b5cf6' }}>({weekNum}주차)</span>
          </div>
        </div>

        {/* Lecture Topic Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Pin size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
            강의 주제: <strong style={{ color: '#ffffff' }}>{topic}</strong>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="student-id-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}
            >
              학생 학번 (8자리 숫자)
            </label>
            <input
              id="student-id-input"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="예: 20261234"
              value={studentIdInput}
              onChange={(e) => {
                setStudentIdInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: errorMsg ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
            />
          </div>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)',
              transition: 'transform 0.15s ease, boxShadow 0.15s ease',
              marginTop: '4px',
            }}
          >
            강의실 입장하기 <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
