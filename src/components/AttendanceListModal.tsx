import React, { useState } from 'react';
import { X, Users, Copy, Download, Search, Check, FileText } from 'lucide-react';

interface AttendanceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  weekNum: number;
  topic?: string;
  studentIds: string[];
}

export const AttendanceListModal: React.FC<AttendanceListModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  weekNum,
  topic = '',
  studentIds = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter unique student IDs
  const uniqueStudentIds = Array.from(new Set(studentIds));
  const filteredIds = uniqueStudentIds.filter((id) => id.includes(searchQuery.trim()));

  const handleCopyAll = () => {
    if (uniqueStudentIds.length === 0) return;
    const textToCopy = uniqueStudentIds.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadTxt = () => {
    if (uniqueStudentIds.length === 0) return;
    let content = `==================================================\n`;
    content += `출석 학생 명단 기록\n`;
    content += `과목명: ${courseTitle} (${weekNum}주차)\n`;
    if (topic) content += `강의 주제: ${topic}\n`;
    content += `출석 총원: ${uniqueStudentIds.length}명\n`;
    content += `==================================================\n\n`;

    uniqueStudentIds.forEach((id, index) => {
      content += `${(index + 1).toString().padStart(2, '0')}. 학번: ${id}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = courseTitle.replace(/[^a-zA-Z0-9가-힣]/g, '');
    link.download = `${weekNum}주차_${safeTitle}_출석명단.txt`;
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
        zIndex: 99990,
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
          maxWidth: '560px',
          maxHeight: '85vh',
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '24px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--bg-secondary, #0f172a)',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                출석 학생 명단 확인
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', fontWeight: 700 }}>
                {courseTitle} &bull; <span style={{ color: '#10b981', fontWeight: 800 }}>{weekNum}주차</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats & Filter Bar */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--bg-card, #1e293b)',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            온라인 자막 강의 참가 학생 : <span style={{ color: '#10b981', fontSize: '17px', fontWeight: 800, marginLeft: '4px' }}>{uniqueStudentIds.length}명</span>
          </div>

          <div style={{ position: 'relative', width: '200px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #94a3b8)',
              }}
            />
            <input
              type="text"
              placeholder="학번 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '8px',
                background: 'var(--bg-hover, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Attendance List Body */}
        <div
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            minHeight: '200px',
            maxHeight: '380px',
          }}
        >
          {filteredIds.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '13px',
              }}
            >
              {searchQuery ? '검색 결과와 일치하는 학번이 없습니다.' : '등록된 출석 학생이 없습니다.'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '10px',
              }}
            >
              {filteredIds.map((studentId, idx) => (
                <div
                  key={studentId}
                  style={{
                    background: 'var(--bg-secondary, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                    #{(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#10b981',
                      letterSpacing: '0.04em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {studentId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--bg-secondary, #0f172a)',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={handleCopyAll}
            disabled={uniqueStudentIds.length === 0}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-hover, rgba(255, 255, 255, 0.1))',
              border: copied ? '1px solid #10b981' : '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
              color: copied ? '#10b981' : 'var(--text-primary, #ffffff)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: uniqueStudentIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사 완료!' : '전체 학번 복사'}
          </button>

          <button
            onClick={handleDownloadTxt}
            disabled={uniqueStudentIds.length === 0}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: uniqueStudentIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Download size={16} /> 명단 다운로드 (.txt)
          </button>
        </div>
      </div>
    </div>
  );
};
