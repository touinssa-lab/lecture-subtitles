import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check, PlusCircle, Trash2 } from 'lucide-react';
import { CourseSchedule, ReportItem } from '../data/scheduleData';

interface CourseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
  courseToEdit?: CourseSchedule | null;
  onSaveCourse: (course: CourseSchedule) => void;
}

export const CourseEditModal: React.FC<CourseEditModalProps> = ({
  isOpen,
  onClose,
  semesterId,
  courseToEdit,
  onSaveCourse,
}) => {
  const [title, setTitle] = useState<string>('');
  const [section, setSection] = useState<string>('분반 101');
  const [classroom, setClassroom] = useState<string>('인317-1');
  const [credits, setCredits] = useState<number>(3);
  const [timeSlot, setTimeSlot] = useState<string>('월 5~7교시 (13:30~16:20)');
  const [color, setColor] = useState<string>('#8b5cf6');
  const [reports, setReports] = useState<ReportItem[]>([
    { id: 'rep-1', title: '', url: '' },
  ]);

  useEffect(() => {
    if (courseToEdit) {
      setTitle(courseToEdit.title);
      setSection(courseToEdit.section || '분반 101');
      setClassroom(courseToEdit.classroom || '인317-1');
      setCredits(courseToEdit.credits || 3);
      setTimeSlot(courseToEdit.timeSlot || '월 5~7교시');
      setColor(courseToEdit.color || '#8b5cf6');
      if (courseToEdit.reports && courseToEdit.reports.length > 0) {
        setReports(courseToEdit.reports);
      } else if (courseToEdit.reportUrl || courseToEdit.reportTitle) {
        setReports([{ id: 'rep-1', title: courseToEdit.reportTitle || '', url: courseToEdit.reportUrl || '' }]);
      } else {
        setReports([{ id: 'rep-1', title: '', url: '' }]);
      }
    } else {
      setTitle('');
      setSection('분반 101');
      setClassroom('인317-1');
      setCredits(3);
      setTimeSlot('월 5~7교시 (13:30~16:20)');
      setColor('#8b5cf6');
      setReports([{ id: 'rep-1', title: '', url: '' }]);
    }
  }, [courseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddReport = () => {
    if (reports.length >= 3) return;
    setReports([...reports, { id: `rep-${Date.now()}`, title: '', url: '' }]);
  };

  const handleRemoveReport = (index: number) => {
    if (reports.length <= 1) {
      setReports([{ id: `rep-${Date.now()}`, title: '', url: '' }]);
    } else {
      setReports(reports.filter((_, i) => i !== index));
    }
  };

  const handleReportChange = (index: number, field: 'title' | 'url', value: string) => {
    setReports(
      reports.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('과목명을 입력해주세요.');
      return;
    }

    const validReports = reports.filter((r) => r.title.trim() || r.url.trim());
    const courseId = courseToEdit?.id || `course-${Date.now()}`;
    const newCourse: CourseSchedule = {
      id: courseId,
      semesterId: semesterId,
      title: title.trim(),
      code: classroom.trim(),
      credits: Number(credits),
      classroom: classroom.trim(),
      section: section.trim(),
      timeSlot: timeSlot.trim(),
      color: color,
      reports: validReports,
      reportTitle: validReports[0]?.title || '',
      reportUrl: validReports[0]?.url || '',
      schedules: courseToEdit?.schedules || Array.from({ length: 15 }, (_, i) => ({
        week: i + 1,
        date: `2026.09.${(i + 1).toString().padStart(2, '0')}`,
        topic: `${i + 1}주차 강의 주제 미등록`,
        pdfFileName: '',
        googleDriveUrl: '',
      })),
    };

    onSaveCourse(newCourse);
    onClose();
  };

  const COLOR_OPTIONS = ['#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#06b6d4'];

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
          maxWidth: '720px',
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
            <BookOpen size={20} color="var(--accent-color)" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
              {courseToEdit ? '✏️ 과목 정보 수정' : '➕ 신규 과목 등록'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              과목명 *
            </label>
            <input
              type="text"
              placeholder="예: 관광 AI 콘텐츠 제작 실무"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
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
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                분반 정보
              </label>
              <input
                type="text"
                placeholder="예: 분반 103"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                강의실 위치
              </label>
              <input
                type="text"
                placeholder="예: 인317-1"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                학점
              </label>
              <select
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value={1} style={{ background: 'var(--bg-card)' }}>1학점</option>
                <option value={2} style={{ background: 'var(--bg-card)' }}>2학점</option>
                <option value={3} style={{ background: 'var(--bg-card)' }}>3학점</option>
                <option value={4} style={{ background: 'var(--bg-card)' }}>4학점</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                수업시간
              </label>
              <input
                type="text"
                placeholder="예: 월 5~7교시 (13:30~16:20)"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Google Forms Report Submissions List (Up to 3) */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #94a3b8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📝 리포트(과제) 제출 구글 설문 링크 <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>(최대 3개 등록 가능)</span>
              </label>
              {reports.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddReport}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1.5px solid #10b981',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <PlusCircle size={14} /> 과제 링크 추가 ({reports.length}/3)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.map((rep, idx) => (
                <div key={rep.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`과제 ${idx + 1} 이름 (예: 중간고사 리포트)`}
                    value={rep.title}
                    onChange={(e) => handleReportChange(idx, 'title', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1.5px solid #94a3b8',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  />
                  <input
                    type="url"
                    placeholder="구글 설문 폼 URL (https://forms.gle/...)"
                    value={rep.url}
                    onChange={(e) => handleReportChange(idx, 'url', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1.5px solid #94a3b8',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  />
                  {reports.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReport(idx)}
                      title="이 과제 항목 삭제"
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              과목 테마 색상
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid #ffffff' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: color === c ? '0 0 10px ' + c : 'none',
                  }}
                >
                  {color === c && <Check size={16} color="#fff" />}
                </button>
              ))}
            </div>
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
              {courseToEdit ? '수정 내용 저장' : '새 과목 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
