import React, { useState } from 'react';
import { X, Calendar, PlusCircle } from 'lucide-react';
import { Semester } from '../data/scheduleData';

interface SemesterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSemester: (newSem: Semester) => void;
}

export const SemesterCreateModal: React.FC<SemesterCreateModalProps> = ({
  isOpen,
  onClose,
  onCreateSemester,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(2027);
  const [term, setTerm] = useState<string>('1학기');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const semName = `${year}년 ${term}`;
    const semId = `sem-${year}-${term.replace(/[^0-9]/g, '') || '1'}`;
    const newSem: Semester = {
      id: semId,
      year: year,
      term: term,
      name: semName,
      isCurrent: true,
    };
    onCreateSemester(newSem);
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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="var(--accent-color)" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>➕ 신규 학기 개설</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              연도 선택
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {y}년도
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              학기 구분
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="1학기" style={{ background: 'var(--bg-card)' }}>1학기 (봄학기)</option>
              <option value="2학기" style={{ background: 'var(--bg-card)' }}>2학기 (가을학기)</option>
              <option value="여름학기" style={{ background: 'var(--bg-card)' }}>여름계절학기</option>
              <option value="겨울학기" style={{ background: 'var(--bg-card)' }}>겨울계절학기</option>
            </select>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              <PlusCircle size={16} /> 신규 학기 개설
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
