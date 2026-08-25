import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink, Download, FileX } from 'lucide-react';
import { getQrCodeImageUrl, parseGoogleDriveUrl } from '../utils/googleDrive';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  weekNumber: number;
  topic: string;
  googleDriveUrl?: string;
  pdfFileName?: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  weekNumber,
  topic,
  googleDriveUrl = '',
  pdfFileName = '강의교재.pdf',
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const parsedDrive = parseGoogleDriveUrl(googleDriveUrl);
  const hasRegisteredPdf = Boolean(parsedDrive.fileId);

  if (!isOpen) return null;

  // Download target link for student QR code (PDF file)
  const targetDownloadUrl = parsedDrive.fileId ? parsedDrive.downloadUrl : parsedDrive.viewUrl || '';
  // Request 600x600 high resolution QR image from QR API
  const qrImageUrl = targetDownloadUrl ? getQrCodeImageUrl(targetDownloadUrl, 600) : '';

  const handleCopyLink = () => {
    if (!targetDownloadUrl) return;
    navigator.clipboard.writeText(targetDownloadUrl);
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
        alignItems: 'flex-start', // Top aligned so podium/lectern in front center doesn't block the view!
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        padding: '30px 20px 20px 20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '660px', // Extra large width for high classroom visibility
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid var(--border-color)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.25)',
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
            padding: '20px 28px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px var(--accent-glow)',
              }}
            >
              <QrCode size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                📱 학생 교재 PDF 다운로드 QR
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                강의실 맨 뒷자리 학생까지 카메라로 또렷하게 스캔할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="닫기"
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
            <X size={22} />
          </button>
        </div>

        {/* Course Info Banner */}
        <div
          style={{
            padding: '16px 28px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '4px' }}>
            {courseTitle}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {weekNumber}주차: {topic}
          </div>
          {pdfFileName && (
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: hasRegisteredPdf ? 'var(--text-secondary)' : '#ef4444',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📄 교재 파일: {pdfFileName} {!hasRegisteredPdf && '⚠️ (구글 드라이브 PDF 미등록)'}
            </div>
          )}
        </div>

        {/* QR Code Canvas/Image Area (Enlarged) */}
        <div
          style={{
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            background: 'var(--bg-primary)',
          }}
        >
          {!hasRegisteredPdf ? (
            <div
              style={{
                width: '100%',
                padding: '48px 24px',
                borderRadius: '20px',
                background: 'var(--bg-secondary)',
                border: '2px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <FileX size={30} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                등록된 교재 PDF 파일이 없습니다
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, maxWidth: '420px' }}>
                라운지 대시보드 주차 카드 수정에서 구글 드라이브 교재 링크를 등록해 주시면, 학생 다운로드용 대형 QR코드가 자동 생성됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* Extra Large High-DPI White QR Box */}
              <div
                style={{
                  padding: '24px',
                  background: '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={qrImageUrl}
                  alt="교재 PDF 다운로드 QR 코드"
                  style={{
                    width: '380px',
                    height: '380px',
                    display: 'block',
                    imageRendering: 'crisp-edges',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', lineHeight: 1.5 }}>
                  📸 스마트폰 카메라로 위 QR코드를 촬영해 주세요
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  스캔 즉시 오늘 수업의 <strong style={{ color: 'var(--accent-color)' }}>PDF 교재 파일</strong>이 다운로드됩니다.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {hasRegisteredPdf && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 28px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={handleCopyLink}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedLink ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
              {copiedLink ? '다운로드 링크 복사 완료!' : '교재 다운로드 링크 복사'}
            </button>

            <a
              href={targetDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px var(--accent-glow)',
                transition: 'all 0.2s ease',
              }}
            >
              <ExternalLink size={18} /> 새 창에서 직접 열기
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
