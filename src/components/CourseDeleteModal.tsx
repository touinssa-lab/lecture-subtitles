import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, ArrowLeft, Archive } from 'lucide-react';
import { CourseSchedule } from '../data/scheduleData';

interface CourseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseSchedule | null;
  onMoveToTrash: (courseId: string) => void;
}

export const CourseDeleteModal: React.FC<CourseDeleteModalProps> = ({
  isOpen,
  onClose,
  course,
  onMoveToTrash,
}) => {
  const [confirmInput, setConfirmInput] = useState<string>('');

  if (!isOpen || !course) return null;

  const isConfirmed = confirmInput.trim() === '삭제' || confirmInput.trim() === course.title.trim();

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    onMoveToTrash(course.id);
    setConfirmInput('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 24px 64px rgba(239, 68, 68, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                1단계: 삭제 대기(휴지통) 이동
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 0 0' }}>
                과목 삭제 확인
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
              📖 <span style={{ color: course.color }}>{course.title}</span> ({course.section})
            </p>
            <p style={{ margin: 0 }}>
              과목을 삭제하시면 등록해 두신 <strong>15주차 강의 주제 및 구글 드라이브 교재 링크</strong>가 휴지통(삭제 대기 목록)으로 이동합니다.
            </p>
            <div
              style={{
                marginTop: '10px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Archive size={14} /> 실수로 삭제했더라도 [휴지통]에서 클릭 한 번으로 바로 복구할 수 있습니다!
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              안전을 위해 <span style={{ color: '#ef4444' }}>"삭제"</span> 또는 과목명을 입력하세요:
            </label>
            <input
              type="text"
              placeholder={`"삭제" 또는 "${course.title}" 입력`}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: isConfirmed ? '1px solid #ef4444' : '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={16} /> 취소 (유지)
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              style={{
                flex: 1.5,
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                background: isConfirmed ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'var(--bg-hover)',
                color: isConfirmed ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isConfirmed ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isConfirmed ? '0 4px 14px rgba(239,68,68,0.4)' : 'none',
                opacity: isConfirmed ? 1 : 0.6,
              }}
            >
              <Trash2 size={16} /> 휴지통으로 이동
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
