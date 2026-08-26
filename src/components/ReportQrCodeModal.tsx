import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink, FileText, Send } from 'lucide-react';
import { getQrCodeImageUrl } from '../utils/googleDrive';

interface ReportQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  reportTitle?: string;
  reportUrl?: string;
}

export const ReportQrCodeModal: React.FC<ReportQrCodeModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  reportTitle = '리포트(과제) 제출',
  reportUrl = '',
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  if (!isOpen) return null;

  const hasUrl = Boolean(reportUrl && reportUrl.trim());
  const qrImageUrl = hasUrl ? getQrCodeImageUrl(reportUrl.trim(), 600) : '';

  const handleCopyLink = () => {
    if (!hasUrl) return;
    navigator.clipboard.writeText(reportUrl.trim());
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
          maxWidth: '660px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid var(--border-color)',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.25)',
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                📋 {reportTitle || '리포트(과제) 제출 QR코드'}
              </h3>
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
            background: 'rgba(16, 185, 129, 0.1)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>
            {courseTitle}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            📝 {reportTitle || '과제 제출 안내'}
          </div>
        </div>

        {/* QR Code Canvas/Image Area */}
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
          {!hasUrl ? (
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
                <FileText size={30} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                등록된 리포트(과제) 제출 링크가 없습니다
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, maxWidth: '420px' }}>
                라운지 대시보드의 과목 수정 화면에서 구글 설문(Forms) 제출 링크를 등록해 주시면, 학생 제출용 QR코드가 생성됩니다.
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
                  alt="리포트 제출 QR 코드"
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
                  스캔 즉시 <strong style={{ color: '#10b981' }}>{reportTitle || '리포트 제출 페이지'}</strong>로 연결되어 파일 업로드가 가능합니다.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {hasUrl && (
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
              {copiedLink ? '제출 링크 복사 완료!' : '구글 설문 링크 복사'}
            </button>

            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
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
