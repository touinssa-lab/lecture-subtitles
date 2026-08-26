import React, { useState, useEffect } from 'react';
import { X, Edit3, Link, Calendar, FileText, CheckCircle2, Save } from 'lucide-react';
import { WeekSchedule } from '../data/scheduleData';
import { TARGET_LANGUAGES } from '../services/translationService';

interface WeekEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  schedule: WeekSchedule | null;
  onSave: (updatedWeek: WeekSchedule) => void;
}

export const WeekEditModal: React.FC<WeekEditModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  schedule,
  onSave,
}) => {
  const [topic, setTopic] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');

  useEffect(() => {
    if (schedule) {
      setTopic(schedule.topic || '');
      setDate(schedule.date || '');
      setGoogleDriveUrl(schedule.googleDriveUrl || '');
      setPdfFileName(schedule.pdfFileName || '');
      setTargetLanguage(schedule.targetLanguage || 'en');
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...schedule,
      topic: topic.trim() || `${schedule.week}주차 강의 주제 미등록`,
      date: date.trim() || schedule.date,
      googleDriveUrl: googleDriveUrl.trim(),
      pdfFileName: pdfFileName.trim() || `${schedule.week}주차_강의교재.pdf`,
      targetLanguage: targetLanguage,
    });
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
        backdropFilter: 'blur(12px)',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
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
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
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
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)' }}>
                {courseTitle} &bull; {schedule.week}주차
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 0 0' }}>
                주차별 강의 정보 및 교재 등록
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Topic Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              📌 강의 주제 (Topic) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: 생성형 AI 기초 및 프롬프트 엔지니어링"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Google Drive URL Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-color)' }}>
              <Link size={15} /> 구글 드라이브 공유 링크 (PDF 다운로드 URL)
            </label>
            <input
              type="text"
              placeholder="https://drive.google.com/file/d/..."
              value={googleDriveUrl}
              onChange={(e) => setGoogleDriveUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, margin: '6px 0 0 0', opacity: 0.9 }}>
              • 구글 드라이브에서 교재 PDF 우클릭 ➔ 공유 ➔ "링크가 있는 모든 사용자" 권한 설정 후 링크를 붙여넣으세요.
            </p>
          </div>

          {/* Two Columns: File Name & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                <FileText size={15} /> 강의 교재 파일명
              </label>
              <input
                type="text"
                placeholder={`${schedule.week}주차_강의교재.pdf`}
                value={pdfFileName}
                onChange={(e) => setPdfFileName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                <Calendar size={15} /> 수업 날짜
              </label>
              <input
                type="date"
                value={date ? date.replace(/\./g, '-') : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDate(val ? val.replace(/-/g, '.') : '');
                }}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch (err) {
                    // Ignore if showPicker isn't available or already open
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Translation Target Language Selector */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-color)' }}>
              🌐 실시간 자막 번역 언어 (Target Language)
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} style={{ background: 'var(--bg-card)' }}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, margin: '6px 0 0 0', opacity: 0.9 }}>
              • [강의실 입장] 시 미리 설정한 번역 언어로 실시간 음성 자막 번역이 자동으로 시작됩니다.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px var(--accent-glow)',
              }}
            >
              <Save size={18} /> 설정 저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
