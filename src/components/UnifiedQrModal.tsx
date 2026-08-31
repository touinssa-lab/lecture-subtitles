import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Send,
  FileX,
} from 'lucide-react';
import { getQrCodeImageUrl, parseGoogleDriveUrl } from '../utils/googleDrive';
import { ReportItem } from '../data/scheduleData';

export interface QrSlideItem {
  id: string;
  type: 'pdf' | 'report';
  badgeTitle: string;
  mainTitle: string;
  subtitle: string;
  url: string;
  pdfFileName?: string;
  hasUrl: boolean;
  color: string;
}

interface UnifiedQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseId?: string;
  weekNumber?: number;
  topic?: string;
  googleDriveUrl?: string;
  pdfFileName?: string;
  reports?: ReportItem[];
  reportTitle?: string;
  reportUrl?: string;
  initialIndex?: number;
  hidePdfSlide?: boolean;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export const UnifiedQrModal: React.FC<UnifiedQrModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  courseId = 'course-1',
  weekNumber = 1,
  topic,
  googleDriveUrl = '',
  pdfFileName = '강의교재.pdf',
  reports = [],
  reportTitle = '리포트 제출',
  reportUrl = '',
  initialIndex = 0,
  hidePdfSlide = false,
  currentIndex: controlledIndex,
  onIndexChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(controlledIndex ?? initialIndex ?? 0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync external controlledIndex changes
  useEffect(() => {
    if (controlledIndex !== undefined) {
      setCurrentIndex(controlledIndex);
    }
  }, [controlledIndex]);

  // Parse PDF Drive URL
  const parsedDrive = parseGoogleDriveUrl(googleDriveUrl);
  const targetPdfDownloadUrl = parsedDrive.fileId
    ? parsedDrive.downloadUrl
    : parsedDrive.viewUrl || '';

  // Prepare normalized list of valid reports
  const validReports: ReportItem[] =
    reports && reports.length > 0
      ? reports.filter((r) => r.url && r.url.trim())
      : reportUrl && reportUrl.trim()
      ? [{ id: 'default-1', title: reportTitle || '리포트 제출', url: reportUrl.trim() }]
      : [];

  // Build Student Live Classroom Viewer URL
  const baseUrl = window.location.origin + window.location.pathname;
  const studentViewerUrl = `${baseUrl}?room=${courseId}_${weekNumber}&mode=student`;

  // Build slide items array
  const slides: QrSlideItem[] = [];

  // Slide 0: Student Live Classroom Viewer QR
  if (!hidePdfSlide) {
    slides.push({
      id: 'student-classroom-slide',
      type: 'report',
      badgeTitle: '🎓 학생 강의실 접속',
      mainTitle: `${weekNumber ? weekNumber + '주차 ' : ''}학생 실시간 시청 & 출석 인증 접속 QR`,
      subtitle: '학생 개인 PC에서 접속하여 출석을 입력하고 강의를 시청합니다.',
      url: studentViewerUrl,
      hasUrl: true,
      color: '#8b5cf6', // Violet
    });
  }

  // Slide 1: PDF Slide Download (Only if hidePdfSlide is false)
  if (!hidePdfSlide) {
    slides.push({
      id: 'pdf-slide',
      type: 'pdf',
      badgeTitle: '📘 강의 교재',
      mainTitle: `${weekNumber ? weekNumber + '주차 ' : ''}강의교재 PDF 다운로드`,
      subtitle: topic || courseTitle,
      url: targetPdfDownloadUrl,
      pdfFileName: pdfFileName || (weekNumber ? `${weekNumber}주차_강의안.pdf` : '강의안.pdf'),
      hasUrl: Boolean(targetPdfDownloadUrl),
      color: '#6366f1', // Indigo
    });
  }

  // Slide 2..N: Report Submissions
  validReports.forEach((rep, idx) => {
    slides.push({
      id: rep.id || `report-${idx}`,
      type: 'report',
      badgeTitle: rep.title || `과제 ${idx + 1}`,
      mainTitle: rep.title || `리포트 ${idx + 1} 제출 (구글 설문)`,
      subtitle: courseTitle,
      url: rep.url.trim(),
      hasUrl: Boolean(rep.url && rep.url.trim()),
      color: idx === 0 ? '#10b981' : idx === 1 ? '#06b6d4' : '#f59e0b', // Emerald, Cyan, Amber
    });
  });

  // Keep index within bounds on open if not controlled
  useEffect(() => {
    if (isOpen && controlledIndex === undefined) {
      const idx = initialIndex >= 0 && initialIndex < slides.length ? initialIndex : 0;
      setCurrentIndex(idx);
    }
  }, [isOpen, initialIndex, slides.length, controlledIndex]);

  const updateIndex = (newIndex: number) => {
    setCurrentIndex(newIndex);
    if (onIndexChange) {
      onIndexChange(newIndex);
    }
  };

  // Keyboard navigation (Left / Right Arrow Keys)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextIdx = currentIndex > 0 ? currentIndex - 1 : slides.length - 1;
        updateIndex(nextIdx);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
        updateIndex(nextIdx);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, currentIndex, onClose]);

  if (!isOpen) return null;

  const activeSlide = slides[currentIndex] || slides[0];
  const qrImageUrl = activeSlide.hasUrl ? getQrCodeImageUrl(activeSlide.url, 800) : '';

  const handlePrev = () => {
    const nextIdx = currentIndex > 0 ? currentIndex - 1 : slides.length - 1;
    updateIndex(nextIdx);
  };

  const handleNext = () => {
    const nextIdx = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
    updateIndex(nextIdx);
  };

  const handleCopyLink = () => {
    if (!activeSlide.hasUrl) return;
    navigator.clipboard.writeText(activeSlide.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '24px 20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          border: '1.5px solid var(--border-color)',
          boxShadow: `0 32px 80px rgba(0, 0, 0, 0.8), 0 0 50px ${activeSlide.color}33`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
          margin: '0 auto',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: activeSlide.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: `0 4px 14px ${activeSlide.color}66`,
                transition: 'all 0.3s ease',
              }}
            >
              <QrCode size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                {courseTitle} {weekNumber ? `(${weekNumber}주차)` : ''}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            title="닫기 (Esc)"
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Bar (Slide Switcher Tabs) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto',
          }}
        >
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: isActive
                    ? `1.5px solid ${slide.color}`
                    : '1px solid var(--border-color)',
                  background: isActive ? `${slide.color}25` : 'transparent',
                  color: isActive ? slide.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 2px 10px ${slide.color}33` : 'none',
                }}
              >
                {slide.type === 'pdf' ? <BookOpen size={14} /> : <FileText size={14} />}
                <span>{slide.badgeTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Active Item Title & Subtitle */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
                background: `${activeSlide.color}20`,
                color: activeSlide.color,
                border: `1px solid ${activeSlide.color}40`,
                marginBottom: '8px',
              }}
            >
              {activeSlide.badgeTitle}
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
              {activeSlide.mainTitle}
            </h2>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {activeSlide.type === 'pdf' && activeSlide.pdfFileName ? (
                <span>📄 파일명: <strong>{activeSlide.pdfFileName}</strong></span>
              ) : (
                <span>{activeSlide.subtitle}</span>
              )}
            </div>
          </div>

          {/* QR Display Area with Large Left/Right Chevron Arrow Controls */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {/* Left Chevron Button */}
            {slides.length > 1 && (
              <button
                onClick={handlePrev}
                title="이전 QR (왼쪽 화살표 키)"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = activeSlide.color;
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = activeSlide.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* Center QR Code Container (Expanded to 450px) */}
            <div
              style={{
                width: '450px',
                height: '450px',
                maxWidth: 'calc(100vw - 160px)',
                maxHeight: 'calc(100vh - 320px)',
                borderRadius: '24px',
                background: '#ffffff',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px ${activeSlide.color}44`,
                border: `4px solid ${activeSlide.color}`,
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              {activeSlide.hasUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR Code"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  <FileX size={56} style={{ color: '#ef4444', marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    등록된 링크가 없습니다
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                    과목 설정에서 구글 드라이브 또는 설문 링크를 추가해 주세요.
                  </div>
                </div>
              )}
            </div>

            {/* Right Chevron Button */}
            {slides.length > 1 && (
              <button
                onClick={handleNext}
                title="다음 QR (오른쪽 화살표 키)"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = activeSlide.color;
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = activeSlide.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {/* Slide Progress / Counter Indicator */}
          {slides.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
              }}
            >
              <span>{currentIndex + 1} / {slides.length}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {slides.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: i === currentIndex ? '20px' : '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: i === currentIndex ? activeSlide.color : 'var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Link URL Input & Quick Actions */}
          {activeSlide.hasUrl && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '4px',
              }}
            >
              <input
                type="text"
                readOnly
                value={activeSlide.url}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: copiedLink ? '#10b981' : activeSlide.color,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                {copiedLink ? '복사 완료!' : '링크 복사'}
              </button>
              <a
                href={activeSlide.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <ExternalLink size={16} /> 열기
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
