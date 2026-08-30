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
  PlayCircle,
  RotateCcw,
  Save,
  Sun,
  Moon,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { CounselingRecord } from '../data/counselingData';
import { Semester } from '../data/scheduleData';
import { TARGET_LANGUAGES } from '../services/translationService';
import { loadCounselings, saveCounselingRecord, deleteCounselingRecord } from '../services/counselingService';

interface CounselingDashboardViewProps {
  semesters: Semester[];
  activeSemesterId: string;
  onSemesterChange: (semesterId: string) => void;
  onStartSession: (record: CounselingRecord) => void;
  onExitToLounge: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const HOUR_OPTIONS = [
  { value: '09', label: '오전 09시' },
  { value: '10', label: '오전 10시' },
  { value: '11', label: '오전 11시' },
  { value: '12', label: '오후 12시' },
  { value: '13', label: '오후 01시' },
  { value: '14', label: '오후 02시' },
  { value: '15', label: '오후 03시' },
  { value: '16', label: '오후 04시' },
  { value: '17', label: '오후 05시' },
  { value: '18', label: '오후 06시' },
];

const MINUTE_OPTIONS = [
  { value: '00', label: '00분' },
  { value: '10', label: '10분' },
  { value: '20', label: '20분' },
  { value: '30', label: '30분' },
  { value: '40', label: '40분' },
  { value: '50', label: '50분' },
];

export const CounselingDashboardView: React.FC<CounselingDashboardViewProps> = ({
  semesters,
  activeSemesterId,
  onSemesterChange,
  onStartSession,
  onExitToLounge,
  theme = 'light',
  onToggleTheme,
}) => {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [scheduledDateInput, setScheduledDateInput] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [scheduledHourInput, setScheduledHourInput] = useState<string>('10');
  const [scheduledMinuteInput, setScheduledMinuteInput] = useState<string>('00');
  const [studentLangInput, setStudentLangInput] = useState<string>('en');
  const [topicInput, setTopicInput] = useState<string>('1:1 진로 및 학업 상담');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);

  // Modals for viewing detailed transcript & AI summary
  const [viewingTranscript, setViewingTranscript] = useState<CounselingRecord | null>(null);
  const [viewingSummary, setViewingSummary] = useState<CounselingRecord | null>(null);

  // Modal & state for editing counseling schedule
  const [editingRecord, setEditingRecord] = useState<CounselingRecord | null>(null);
  const [editDateInput, setEditDateInput] = useState<string>('');
  const [editHourInput, setEditHourInput] = useState<string>('10');
  const [editMinuteInput, setEditMinuteInput] = useState<string>('00');
  const [editLangInput, setEditLangInput] = useState<string>('en');

  const handleOpenEditModal = (record: CounselingRecord) => {
    setEditingRecord(record);
    setEditLangInput(record.studentLang || 'en');

    if (record.scheduledAt) {
      const parts = record.scheduledAt.trim().split(' ');
      if (parts.length >= 2) {
        setEditDateInput(parts[0]);
        const timeParts = parts[1].split(':');
        if (timeParts.length >= 2) {
          setEditHourInput(timeParts[0]);
          setEditMinuteInput(timeParts[1]);
        } else {
          setEditHourInput('10');
          setEditMinuteInput('00');
        }
      } else {
        setEditDateInput(record.scheduledAt);
        setEditHourInput('10');
        setEditMinuteInput('00');
      }
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setEditDateInput(`${yyyy}-${mm}-${dd}`);
      setEditHourInput('10');
      setEditMinuteInput('00');
    }
  };

  const handleSaveEditedRecord = async () => {
    if (!editingRecord) return;
    const formattedScheduledAt = `${editDateInput} ${editHourInput}:${editMinuteInput}`;
    const updatedRecord: CounselingRecord = {
      ...editingRecord,
      scheduledAt: formattedScheduledAt,
      studentLang: editLangInput,
    };

    await saveCounselingRecord(updatedRecord);
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    setEditingRecord(null);
  };

  useEffect(() => {
    loadCounselings(activeSemesterId).then((data) => {
      setRecords(data);
    });
  }, [activeSemesterId]);

  const currentSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0];

  const handleRegisterCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentIdInput.trim();
    if (cleanId.length !== 8) {
      alert('⚠️ 학번은 숫자 8자리를 정확히 입력해 주세요. (예: 20261042)');
      return;
    }

    const formattedScheduledAt = `${scheduledDateInput} ${scheduledHourInput}:${scheduledMinuteInput}`;

    const newRecord: CounselingRecord = {
      id: 'counsel-' + Date.now(),
      semesterId: activeSemesterId,
      studentId: cleanId,
      studentLang: studentLangInput,
      topic: topicInput.trim() || '1:1 진로 및 학업 상담',
      scheduledAt: formattedScheduledAt,
      createdAt: new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }),
      status: 'pending',
      utterances: [],
    };

    await saveCounselingRecord(newRecord);
    setRecords((prev) => [newRecord, ...prev]);
    setStudentIdInput('');
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
      `==================================================\n` +
      `📖 1:1 외국인 학생 상담록 (학번: ${record.studentId})\n` +
      `상담 언어: ${record.studentLang.toUpperCase()} | 예정/진행 일시: ${record.scheduledAt || record.createdAt}\n` +
      `상담 주제: ${record.topic}\n` +
      `상담 상태: ${record.status === 'completed' ? '상담 완료' : '상담 대기'}\n` +
      `==================================================\n\n[대화 내역]\n` +
        (record.utterances.length > 0
          ? record.utterances
              .map((u) => `[${u.timestamp}] ${u.speaker === 'professor' ? '교수' : '학생'}: ${u.originalText} (번역: ${u.translatedText})`)
              .join('\n')
          : '대화 기록 없음');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `상담록_${record.studentId}_${(record.scheduledAt || record.createdAt).replace(/[:.\s-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [sortKey, setSortKey] = useState<'date' | 'studentId' | 'completed' | 'pending'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredRecords = records.filter(
    (r) =>
      r.studentId.includes(searchQuery) ||
      (r.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.scheduledAt || '').includes(searchQuery) ||
      r.createdAt.includes(searchQuery)
  );

  const displayedRecords = [...filteredRecords].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'studentId') {
      cmp = a.studentId.localeCompare(b.studentId, undefined, { numeric: true });
    } else if (sortKey === 'date') {
      const dateA = a.scheduledAt || a.createdAt || '';
      const dateB = b.scheduledAt || b.createdAt || '';
      cmp = dateA.localeCompare(dateB);
    } else if (sortKey === 'completed') {
      const isCompA = a.status === 'completed' ? 1 : 0;
      const isCompB = b.status === 'completed' ? 1 : 0;
      cmp = isCompB - isCompA; // Completed items first
      if (cmp === 0) {
        cmp = (a.scheduledAt || '').localeCompare(b.scheduledAt || '');
      }
    } else if (sortKey === 'pending') {
      const isPendA = a.status === 'pending' ? 1 : 0;
      const isPendB = b.status === 'pending' ? 1 : 0;
      cmp = isPendB - isPendA; // Pending items first
      if (cmp === 0) {
        cmp = (a.scheduledAt || '').localeCompare(b.scheduledAt || '');
      }
    }

    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <div
      data-theme={theme}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Lounge-Harmonized Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          zIndex: 20,
          boxShadow: theme === 'light' ? '0 2px 10px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.3)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left Brand Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
              1:1 학생 상담실
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              학기별 학생 상담 일정을 예약하고 실시간 상담 대화 내역을 관리하세요.
            </p>
          </div>
        </div>

        {/* Right Header Control Group (Harmonized with Lounge Header) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Group 1: Semester Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={activeSemesterId}
              onChange={(e) => onSemesterChange(e.target.value)}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--accent-color)',
                fontSize: '13px',
                fontWeight: 800,
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vertical Separator Line */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

          {/* Group 2: System Controls (Theme Toggle & Return to Lounge) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title="다크 / 라이트 모드 전환"
                style={{
                  height: '34px',
                  width: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}

            <button
              onClick={onExitToLounge}
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxSizing: 'border-box',
              }}
            >
              <LogOut size={14} /> 라운지 페이지로 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Content Workspace (Split Layout: Left = Registration, Right = List) */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: '32px',
          maxWidth: '1480px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Registration Card (학생 상담 예약 등록) */}
        <aside
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '20px',
            border: theme === 'light' ? '1px solid #e9d5ff' : '1px solid rgba(139, 92, 246, 0.3)',
            padding: '24px 24px',
            boxShadow: theme === 'light' ? '0 10px 30px rgba(139, 92, 246, 0.08)' : '0 12px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <PlusCircle size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
              학생 상담 예약 등록
            </h2>
          </div>

          <form onSubmit={handleRegisterCounseling} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Student ID */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
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
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                📅 상담 예정 일자 (Date) *
              </label>
              <input
                type="date"
                value={scheduledDateInput}
                onChange={(e) => setScheduledDateInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Scheduled Time (Hour & Minute side-by-side) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                ⏰ 상담 예정 시간 (Time: 09시 ~ 18시) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <select
                  value={scheduledHourInput}
                  onChange={(e) => setScheduledHourInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value} style={{ fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif", fontSize: '14px' }}>
                      {h.label}
                    </option>
                  ))}
                </select>

                <select
                  value={scheduledMinuteInput}
                  onChange={(e) => setScheduledMinuteInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value} style={{ fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif", fontSize: '14px' }}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                상담 언어 (Language) *
              </label>
              <select
                value={studentLangInput}
                onChange={(e) => setStudentLangInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {TARGET_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} style={{ fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif", fontSize: '14px' }}>
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              style={{
                height: '42px',
                marginTop: '6px',
                width: '100%',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '15px',
                fontFamily: "'Inter', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
                letterSpacing: '-0.01em',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                boxSizing: 'border-box',
              }}
            >
              <Save size={18} /> 상담 저장 & 목록 추가
            </button>
          </form>
        </aside>

        {/* RIGHT COLUMN: Counseling Students List Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 3px 10px rgba(139, 92, 246, 0.35)',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} />
                </div>
                <span>[{currentSemester.name}] 학생 상담 목록 ({displayedRecords.length}건)</span>
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                상담 대기 학생은 [상담 시작]을 클릭하고, 완료된 학생은 상담록과 AI 요약본을 확인/다운로드하세요.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="학번, 언어 또는 날짜 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 12px 0 36px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* LIST SORTING CONTROLS TOOLBAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--bg-secondary)',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ArrowUpDown size={14} color="#8b5cf6" /> 목록 정렬:
              </span>

              {[
                { key: 'date', label: '상담일시', Icon: Calendar },
                { key: 'studentId', label: '학번순', Icon: Hash },
                { key: 'completed', label: '상담완료', Icon: CheckCircle2 },
                { key: 'pending', label: '상담대기', Icon: Clock },
              ].map((item) => {
                const isActive = sortKey === item.key;
                const IconComponent = item.Icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (sortKey === item.key) {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortKey(item.key as any);
                        setSortOrder('asc');
                      }
                    }}
                    title={
                      isActive
                        ? `현재: ${sortOrder === 'asc' ? '오름차순' : '내림차순'} (클릭 시 ${sortOrder === 'asc' ? '내림차순' : '오름차순'}으로 전환)`
                        : `${item.label} 정렬`
                    }
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      border: isActive
                        ? (theme === 'light' ? '1px solid #8b5cf6' : '1px solid #a78bfa')
                        : '1px solid var(--border-color)',
                      background: isActive
                        ? (theme === 'light' ? '#f3e8ff' : 'rgba(139, 92, 246, 0.2)')
                        : 'var(--bg-hover)',
                      color: isActive
                        ? (theme === 'light' ? '#6b21a8' : '#c084fc')
                        : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(139, 92, 246, 0.15)' : 'none',
                    }}
                  >
                    <IconComponent size={14} color={isActive ? (theme === 'light' ? '#6b21a8' : '#c084fc') : 'var(--text-muted)'} />
                    <span>{item.label}</span>
                    {isActive && (
                      sortOrder === 'asc' ? (
                        <ArrowUp size={14} color={theme === 'light' ? '#6b21a8' : '#c084fc'} />
                      ) : (
                        <ArrowDown size={14} color={theme === 'light' ? '#6b21a8' : '#c084fc'} />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards List */}
          {displayedRecords.length === 0 ? (
            <div
              style={{
                padding: '64px',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '15px',
              }}
            >
              이번 학기에 등록된 상담 내역이 없습니다. 학번과 상담일시, 상담언어를 입력해 등록하세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displayedRecords.map((r) => {
                const langObj = TARGET_LANGUAGES.find((l) => l.code === r.studentLang) || TARGET_LANGUAGES[0];
                const isCompleted = r.status === 'completed';
                const isHovered = hoveredRecordId === r.id;

                return (
                  <div
                    key={r.id}
                    onMouseEnter={() => setHoveredRecordId(r.id)}
                    onMouseLeave={() => setHoveredRecordId(null)}
                    style={{
                      padding: '20px 24px',
                      borderRadius: '18px',
                      background: 'var(--bg-secondary)',
                      border: isHovered
                        ? (theme === 'light' ? '2px solid #8b5cf6' : '2px solid #a78bfa')
                        : theme === 'light'
                        ? (isCompleted ? '1px solid #d1fae5' : '1px solid #feefc3')
                        : (isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: isCompleted ? '12px' : '0px',
                      boxShadow: isHovered
                        ? (theme === 'light' ? '0 12px 28px -6px rgba(139, 92, 246, 0.25)' : '0 12px 30px -4px rgba(0, 0, 0, 0.6)')
                        : (theme === 'light' ? '0 4px 16px rgba(0,0,0,0.03)' : '0 4px 20px rgba(0,0,0,0.2)'),
                      transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {/* Top Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '14px' }}>
                      {/* Left Info Group */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        {/* Left Status Round Container with Status Text */}
                        <div
                          style={{
                            height: '34px',
                            padding: '0 14px',
                            borderRadius: '10px',
                            background: isCompleted
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isCompleted
                              ? '0 3px 10px rgba(16, 185, 129, 0.3)'
                              : '0 3px 10px rgba(99, 102, 241, 0.3)',
                            flexShrink: 0,
                            gap: '5px',
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={14} color="#ffffff" /> : <Clock size={14} color="#ffffff" />}
                          <span>{isCompleted ? '상담 완료' : '상담 대기'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                            학번: {r.studentId}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: theme === 'light' ? '#f3e8ff' : 'rgba(139, 92, 246, 0.15)',
                              color: theme === 'light' ? '#7e22ce' : '#c084fc',
                              border: theme === 'light' ? '1px solid #e9d5ff' : '1px solid rgba(139, 92, 246, 0.3)',
                            }}
                          >
                            {langObj.flag} {langObj.name}
                          </span>
                          {/* Scheduled Date & Time - Black Text */}
                          <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} color="var(--text-main)" /> 일시: {r.scheduledAt || r.createdAt}
                          </span>
                        </div>
                      </div>

                      {/* Right Action Controls for Pending Record */}
                      {!isCompleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                          <button
                            onClick={() => onStartSession(r)}
                            style={{
                              height: '34px',
                              padding: '0 14px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <PlayCircle size={14} /> 상담 시작
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            title="상담 일시 및 언어 수정"
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Pencil size={14} /> 수정
                          </button>
                          <button
                            onClick={() => setDeletingRecord(r)}
                            title="상담 기록 삭제"
                            style={{
                              height: '34px',
                              width: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              background: theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                              border: theme === 'light' ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 0,
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row for Completed Record */}
                    {isCompleted && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Far Left: Round Pill Badge for Saved Dialog Count */}
                        <div
                          style={{
                            height: '34px',
                            padding: '0 14px',
                            borderRadius: '10px',
                            background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <MessageSquare size={14} color="#8b5cf6" />
                          <span>({r.utterances.length}개 대화 기록 저장됨)</span>
                        </div>

                        {/* Far Right: Action Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                          <button
                            onClick={() => setViewingTranscript(r)}
                            title="상담 대화록 열람"
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <FileText size={14} /> 상담록
                          </button>

                          <button
                            onClick={() => setViewingSummary(r)}
                            title="AI 상담 요약본 열람"
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              background: theme === 'light' ? '#f3e8ff' : 'rgba(139, 92, 246, 0.15)',
                              border: theme === 'light' ? '1px solid #e9d5ff' : '1px solid rgba(139, 92, 246, 0.3)',
                              color: theme === 'light' ? '#7e22ce' : '#c084fc',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Sparkles size={14} color={theme === 'light' ? '#7e22ce' : '#c084fc'} /> AI 요약본
                          </button>

                          <button
                            onClick={() => handleDownloadTxt(r)}
                            title="상담록 TXT 파일 다운로드"
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                              border: theme === 'light' ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.3)',
                              color: theme === 'light' ? '#047857' : '#34d399',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Download size={14} /> 다운로드
                          </button>

                          <button
                            onClick={() => onStartSession(r)}
                            title="1:1 상담실 재입장"
                            style={{
                              height: '34px',
                              padding: '0 14px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <RotateCcw size={14} /> 다시 상담
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(r)}
                            title="상담 일시 및 언어 수정"
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Pencil size={14} /> 수정
                          </button>

                          <button
                            onClick={() => setDeletingRecord(r)}
                            title="상담 기록 삭제"
                            style={{
                              height: '34px',
                              width: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              background: theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                              border: theme === 'light' ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 0,
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Counseling Room Footer Copyright */}
      <footer
        style={{
          padding: '16px 32px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontWeight: 500,
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        © {new Date().getFullYear()} Tourism Insight. All rights reserved.
      </footer>

      {/* ================= MODAL 1: VIEW FULL TRANSCRIPT ================= */}
      {viewingTranscript && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '720px',
              maxHeight: '84vh',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#8b5cf6" /> 1:1 상담 대화록 (학번: {viewingTranscript.studentId})
              </h3>
              <button onClick={() => setViewingTranscript(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {viewingTranscript.utterances.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>저장된 대화 기록이 없습니다.</p>
              ) : (
                viewingTranscript.utterances.map((u) => (
                  <div key={u.id} style={{ padding: '14px 18px', borderRadius: '14px', background: u.speaker === 'professor' ? (theme === 'light' ? '#f3e8ff' : 'rgba(139, 92, 246, 0.12)') : (theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)'), borderLeft: `4px solid ${u.speaker === 'professor' ? '#8b5cf6' : '#10b981'}` }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {u.timestamp} - {u.speaker === 'professor' ? '교수' : '학생'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{u.originalText}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>번역: {u.translatedText}</div>
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
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '760px',
              maxHeight: '86vh',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#8b5cf6" /> AI 상담 요약 리포트 (학번: {viewingSummary.studentId})
              </h3>
              <button onClick={() => setViewingSummary(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'Inter', 'Noto Sans KR', monospace",
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  background: 'var(--bg-primary)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.6,
                }}
              >
                {viewingSummary.summary?.fullSummaryText || 'AI 요약본이 생성되지 않았습니다.'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT COUNSELING SCHEDULE & LANG ================= */}
      {editingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setEditingRecord(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} color="#8b5cf6" /> 상담 일시 및 언어 수정 (학번: {editingRecord.studentId})
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {editingRecord.status === 'completed' && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                  border: theme === 'light' ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.3)',
                  color: theme === 'light' ? '#047857' : '#34d399',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={15} /> 이미 완료된 상담입니다. 기존 대화 기록 및 AI 요약본은 삭제되지 않고 안전하게 보존됩니다.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Scheduled Date */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  상담 예정일 *
                </label>
                <input
                  type="date"
                  value={editDateInput}
                  onChange={(e) => setEditDateInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Scheduled Time (Hour & Minute) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  상담 예정 시간 (오전 9시 ~ 오후 6시) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select
                    value={editHourInput}
                    onChange={(e) => setEditHourInput(e.target.value)}
                    style={{
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      background: 'var(--bg-card, #ffffff)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editMinuteInput}
                    onChange={(e) => setEditMinuteInput(e.target.value)}
                    style={{
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      background: 'var(--bg-card, #ffffff)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Language */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  상담 언어 선택 *
                </label>
                <select
                  value={editLangInput}
                  onChange={(e) => setEditLangInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEditedRecord}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                }}
              >
                수정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CONFIRM DELETE COUNSELING RECORD ================= */}
      {deletingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.7)',
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
              background: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
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
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                상담 기록 삭제 확인
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                학번 <strong style={{ color: 'var(--text-main)' }}>[{deletingRecord.studentId}]</strong> 학생의 상담 기록을 삭제하시겠습니까?
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
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
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
