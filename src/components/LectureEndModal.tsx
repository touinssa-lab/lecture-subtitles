import React, { useState } from 'react';
import { LogOut, Save, Sparkles, FileText, CheckCircle, ArrowRight, X } from 'lucide-react';
import { SubtitleItem } from '../App';
import { generateLectureSummary, AiSummaryResult } from '../services/aiSummaryService';

interface LectureEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEnd: (saveTranscript: boolean, saveAiSummary: boolean) => void;
  subtitlesCount: number;
  courseTitle: string;
  weekNum: number;
  topic: string;
}

export const LectureEndModal: React.FC<LectureEndModalProps> = ({
  isOpen,
  onClose,
  onConfirmEnd,
  subtitlesCount,
  courseTitle,
  weekNum,
  topic,
}) => {
  const [saveTranscript, setSaveTranscript] = useState<boolean>(true);
  const [saveAiSummary, setSaveAiSummary] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirmEnd(saveTranscript, saveAiSummary);
    } finally {
      setIsProcessing(false);
    }
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
        backdropFilter: 'blur(10px)',
        padding: '20px',
      }}
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                🚪 강의 종료 및 DB 보관 선택
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                강의 데이터를 데이터베이스(클라우드)에 보관합니다.
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Course Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg-hover)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          📖 {courseTitle} ({weekNum}주차): {topic}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            현재 실시간 수집된 자막 항목: {subtitlesCount}개
          </div>
        </div>

        {/* Checkbox Options or Loading State */}
        {isProcessing ? (
          <div
            style={{
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              minHeight: '220px',
              background: 'rgba(139, 92, 246, 0.02)'
            }}
          >
            <svg className="animate-spin" style={{ width: '42px', height: '42px', color: '#8b5cf6' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5"></circle>
              <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#8b5cf6" /> AI 강의록 요약 및 DB 저장 중
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: 1.5 }}>
                강의 내용을 압축 및 인공지능 요약하고 있습니다.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                약 2~3초가 소요되오니 페이지를 닫지 말고 잠시만 대기해 주세요.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>
              수업 종료 후 라운지 대시보드 주차 카드에 저장할 항목을 선택해 주세요:
            </p>

            {/* Option 1: Save Raw Subtitles */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: saveTranscript ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                border: saveTranscript ? '1px solid #10b981' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={saveTranscript}
                  onChange={(e) => setSaveTranscript(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#10b981" /> 1. 강의록 (실시간 자막 원문) 저장
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    강의 음성 자막 및 Q&A 타임스탬프 원문 기록을 DB에 저장합니다.
                  </div>
                </div>
              </div>
            </label>

            {/* Option 2: Save AI Summary */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: saveAiSummary ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-secondary)',
                border: saveAiSummary ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={saveAiSummary}
                  onChange={(e) => setSaveAiSummary(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#8b5cf6" /> 2. AI 강의 핵심 요약본 저장
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Gemini AI가 3줄 요약, 핵심 키워드, Q&A를 정밀 요약하여 DB에 저장합니다.
                  </div>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '16px 24px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            style={{
              padding: '9px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            {isProcessing ? (
              'DB 저장 및 처리 중...'
            ) : (
              <>
                <CheckCircle size={16} /> 저장 후 라운지 이동
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
