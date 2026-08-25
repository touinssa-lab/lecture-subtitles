import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, Download, RefreshCw, FileText, HelpCircle, Key, BookOpen } from 'lucide-react';
import { SubtitleItem } from '../App';
import { generateLectureSummary, AiSummaryResult } from '../services/aiSummaryService';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  courseTitle: string;
  weekNum: number;
  topic: string;
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  courseTitle,
  weekNum,
  topic,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<AiSummaryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'qa'>('overview');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateLectureSummary(subtitles, courseTitle, weekNum, topic);
      setSummaryData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    if (!summaryData) return;
    navigator.clipboard.writeText(summaryData.fullSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!summaryData) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const safeCourse = courseTitle ? courseTitle.replace(/[^a-zA-Z0-9가-힣]/g, '') : '';
    const fileName = `${todayStr}_${weekNum}주차_${safeCourse || '강의'}_AI요약본.txt`;

    const blob = new Blob([summaryData.fullSummaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)' }}>
                Google Gemini AI 엔진 연동
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                🤖 AI 강의 자막 핵심 요약 노트
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Course Info Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(139, 92, 246, 0.08)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            📚 {courseTitle} ({weekNum}주차): {topic}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            총 {subtitles.length}개 자막 항목 분석
          </span>
        </div>

        {/* Loading Spinner or Content */}
        {loading ? (
          <div
            style={{
              padding: '60px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid rgba(139, 92, 246, 0.2)',
                borderTopColor: '#8b5cf6',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              AI가 강의 자막을 정밀 분석하여 핵심 요약 노트를 생성하고 있습니다...
            </p>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', padding: '14px 24px 0 24px', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'overview' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                  color: activeTab === 'overview' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} /> 📌 핵심 3줄 요약
              </button>
              <button
                onClick={() => setActiveTab('keywords')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'keywords' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                  color: activeTab === 'keywords' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Key size={15} /> 🔑 주요 키워드
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'qa' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                  color: activeTab === 'qa' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <HelpCircle size={15} /> 💬 Q&A 정리
              </button>
            </div>

            {/* Tab Body */}
            <div
              style={{
                flex: 1,
                padding: '20px 24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summaryData?.overview.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--accent-gradient)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'keywords' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {summaryData?.keyTopics.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'qa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {summaryData?.qaSummary.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 24px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} /> 다시 요약
          </button>

          <button
            onClick={handleCopyText}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            {copied ? '요약본 복사 완료!' : '요약본 전체 복사'}
          </button>

          <button
            onClick={handleDownloadTxt}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
            }}
          >
            <Download size={16} /> TXT 저장
          </button>
        </div>
      </div>
    </div>
  );
};
