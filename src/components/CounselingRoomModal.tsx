import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  PlusCircle,
  Calendar,
  User,
  Globe,
  FileText,
  Sparkles,
  Download,
  Trash2,
  LogOut,
  X,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { CounselingRecord } from '../data/counselingData';
import { Semester } from '../data/scheduleData';
import { TARGET_LANGUAGES } from '../services/translationService';
import { loadCounselings, deleteCounselingRecord } from '../services/counselingService';

interface CounselingRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  activeSemesterId: string;
  onSemesterChange: (semesterId: string) => void;
  onStartSession: (studentId: string, studentLang: string, topic: string) => void;
  theme?: 'dark' | 'light';
}

export const CounselingRoomModal: React.FC<CounselingRoomModalProps> = ({
  isOpen,
  onClose,
  semesters,
  activeSemesterId,
  onSemesterChange,
  onStartSession,
  theme = 'dark',
}) => {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [studentLangInput, setStudentLangInput] = useState<string>('en');
  const [topicInput, setTopicInput] = useState<string>('1:1 진로 및 학업 상담');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals for viewing detailed transcript & AI summary
  const [viewingTranscript, setViewingTranscript] = useState<CounselingRecord | null>(null);
  const [viewingSummary, setViewingSummary] = useState<CounselingRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCounselings(activeSemesterId).then((data) => {
        setRecords(data);
      });
    }
  }, [isOpen, activeSemesterId]);

  if (!isOpen) return null;

  const currentSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0];

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentIdInput.trim();
    if (cleanId.length !== 8) {
      alert('⚠️ 학번은 숫자 8자리를 정확히 입력해 주세요. (예: 20261042)');
      return;
    }
    onStartSession(cleanId, studentLangInput, topicInput.trim() || '1:1 진로 및 학업 상담');
  };

  const [deletingRecord, setDeletingRecord] = useState<CounselingRecord | null>(null);

  const confirmDeleteRecord = async () => {
    if (!deletingRecord) return;
    await deleteCounselingRecord(deletingRecord.id);
    setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
    setDeletingRecord(null);
  };

  const handleDownloadTxt = (record: CounselingRecord) => {
    const textContent =
      record.summary?.fullSummaryText ||
      `1:1 상담록 (학번: ${record.studentId})\n일시: ${record.createdAt}\n주제: ${record.topic}\n\n[대화 내역]\n` +
        record.utterances
          .map((u) => `[${u.timestamp}] ${u.speaker === 'professor' ? '교수' : '학생'}: ${u.originalText} (번역: ${u.translatedText})`)
          .join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `상담록_${record.studentId}_${record.createdAt.replace(/[:.\s]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter(
    (r) =>
      r.studentId.includes(searchQuery) ||
      (r.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.createdAt.includes(searchQuery)
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1140px',
          maxHeight: '92vh',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '24px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
          color: 'var(--text-main, #ffffff)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
            background: 'var(--bg-secondary, #0f172a)',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
              }}
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  1:1 외국인 학생 상담실 (Counseling Center)
                </h2>
                {/* Semester Selector */}
                <select
                  value={activeSemesterId}
                  onChange={(e) => onSemesterChange(e.target.value)}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-hover, rgba(255,255,255,0.08))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    color: '#a78bfa',
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                      📅 {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted, rgba(255, 255, 255, 0.6))', margin: '4px 0 0 0' }}>
                외국인 학생과의 1:1 상담을 진행하고 학기별 상담록 및 AI 요약 보고서를 관리하세요.
              </p>
            </div>
          </div>

          {/* Exit Button back to Lounge */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '9px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={15} /> 상담실 나가기 (라운지 복귀)
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Top Form: Start New 1:1 Counseling Session */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} /> 신규 1:1 학생 상담 시작
            </h3>

            <form onSubmit={handleStartSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr auto', gap: '14px', alignItems: 'end' }}>
              {/* Student ID Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, rgba(255,255,255,0.7))', marginBottom: '6px' }}>
                  👨‍🎓 학생 학번 (Student ID) *
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="8자리 학번 (예: 20261042)"
                  value={studentIdInput}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                    setStudentIdInput(digitsOnly);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-card, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Student Target Language Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, rgba(255,255,255,0.7))', marginBottom: '6px' }}>
                  🌐 상담 언어 (Student Lang) *
                </label>
                <select
                  value={studentLangInput}
                  onChange={(e) => setStudentLangInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-card, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} style={{ background: '#0f172a', color: '#ffffff' }}>
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Counseling Topic */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, rgba(255,255,255,0.7))', marginBottom: '6px' }}>
                  📌 상담 주제 (Topic)
                </label>
                <input
                  type="text"
                  placeholder="예: 진로 및 학업 적응 상담"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-card, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Start Button */}
              <button
                type="submit"
                style={{
                  height: '42px',
                  padding: '0 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                1:1 상담 시작
              </button>
            </form>
          </div>

          {/* Bottom Table Section: Counseling History & Records */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 [{currentSemester.name}] 상담 기록 목록 ({filteredRecords.length}건)
              </h3>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="학번 또는 언어 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div
                style={{
                  padding: '48px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px',
                }}
              >
                💬 등록된 상담 내역이 없습니다. 위 폼에서 학번을 입력하여 1:1 상담을 시작하세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRecords.map((r) => {
                  const langObj = TARGET_LANGUAGES.find((l) => l.code === r.studentLang) || TARGET_LANGUAGES[0];
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '18px 24px',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Left: Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '18px',
                          }}
                        >
                          <MessageSquare size={20} color="#ffffff" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                              학번: {r.studentId}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#a78bfa',
                              }}
                            >
                              {langObj.flag} {langObj.name}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                              📅 {r.createdAt}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                              ({r.utterances.length}개 대화 기록)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* View Transcript */}
                        <button
                          onClick={() => setViewingTranscript(r)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <FileText size={14} /> 상담록 보기
                        </button>

                        {/* View AI Summary */}
                        <button
                          onClick={() => setViewingSummary(r)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            color: '#a78bfa',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Sparkles size={14} color="#a78bfa" /> AI 요약본 보기
                        </button>

                        {/* Export TXT */}
                        <button
                          onClick={() => handleDownloadTxt(r)}
                          title="상담록 TXT 파일 다운로드"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Download size={14} /> TXT
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingRecord(r)}
                          title="상담 기록 삭제"
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: VIEW FULL TRANSCRIPT ================= */}
      {viewingTranscript && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setViewingTranscript(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '80vh',
              background: '#0f172a',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                📄 1:1 상담 대화록 (학번: {viewingTranscript.studentId})
              </h3>
              <button onClick={() => setViewingTranscript(null)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {viewingTranscript.utterances.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>저장된 대화 기록이 없습니다.</p>
              ) : (
                viewingTranscript.utterances.map((u) => (
                  <div key={u.id} style={{ padding: '12px 16px', borderRadius: '12px', background: u.speaker === 'professor' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)', borderLeft: `4px solid ${u.speaker === 'professor' ? '#8b5cf6' : '#10b981'}` }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                      {u.timestamp} - {u.speaker === 'professor' ? '👨‍🏫 교수' : '👨‍🎓 학생'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{u.originalText}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>번역: {u.translatedText}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: VIEW AI SUMMARY ================= */}
      {viewingSummary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setViewingSummary(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '84vh',
              background: '#0f172a',
              borderRadius: '20px',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(139, 92, 246, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#a78bfa" /> AI 상담 요약 리포트 (학번: {viewingSummary.studentId})
              </h3>
              <button onClick={() => setViewingSummary(null)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  lineHeight: 1.6,
                }}
              >
                {viewingSummary.summary?.fullSummaryText || 'AI 요약본이 생성되지 않았습니다.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CONFIRM DELETE COUNSELING RECORD ================= */}
      {deletingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setDeletingRecord(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#1e293b',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                color: '#ef4444',
              }}
            >
              <Trash2 size={26} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                상담 기록 삭제 확인
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                학번 <strong style={{ color: '#ffffff' }}>[{deletingRecord.studentId}]</strong> 학생의 상담 기록을 삭제하시겠습니까?
              </p>
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={14} /> 삭제된 상담 기록 및 대화 내역은 복구할 수 없습니다.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
