import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload, Maximize2, Minimize2, FileText, ZoomIn, ZoomOut, Download, Loader2, Play } from 'lucide-react';
import { DEMO_SLIDES, renderDemoSlideToCanvas } from '../utils/demoPdf';
import { parseGoogleDriveUrl } from '../utils/googleDrive';
import { WeekSchedule } from '../data/scheduleData';

interface PdfViewerProps {
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onPdfLoaded?: (fileDataUrl: string, fileName: string) => void;
  externalPdfDataUrl?: string | null;
  externalPdfFileName?: string | null;
  externalCurrentPage?: number;
  externalGoogleDriveUrl?: string | null;
  courseSchedules?: WeekSchedule[];
  activeWeekNum?: number;
  onSelectWeekSchedule?: (week: WeekSchedule) => void;
  isReadOnly?: boolean; // True for Student Projector Window (Hides interactive control buttons)
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  onPageChange,
  onPdfLoaded,
  externalPdfDataUrl,
  externalPdfFileName,
  externalCurrentPage,
  externalGoogleDriveUrl,
  courseSchedules,
  activeWeekNum,
  onSelectWeekSchedule,
  isReadOnly = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pdfFileName, setPdfFileName] = useState<string>('교재 불러오는 중...');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [driveEmbedUrl, setDriveEmbedUrl] = useState<string | null>(null);
  const [isLoadingDrivePdf, setIsLoadingDrivePdf] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync external page changes (e.g. for student mode)
  useEffect(() => {
    if (externalCurrentPage !== undefined && externalCurrentPage !== currentPage) {
      setCurrentPage(externalCurrentPage);
    }
  }, [externalCurrentPage]);

  // Sync external PDF Data URL (e.g. when instructor loads a local file)
  useEffect(() => {
    if (externalPdfDataUrl) {
      setDriveEmbedUrl(null);
      loadPdfFromDataUrl(externalPdfDataUrl, externalPdfFileName || '동기화된 PDF 교재');
    }
  }, [externalPdfDataUrl, externalPdfFileName]);

  // Auto-load Google Drive PDF document or fallback public /textbook.pdf when entering lecture room
  useEffect(() => {
    if (externalGoogleDriveUrl && !externalPdfDataUrl) {
      const parsed = parseGoogleDriveUrl(externalGoogleDriveUrl);
      if (parsed.fileId) {
        setIsDemoMode(false);
        setPdfFileName(externalPdfFileName || '구글 드라이브 교재');
        setDriveEmbedUrl(parsed.previewUrl); // Initial fallback

        // Attempt binary fetch to parse into 1-slide-per-page PDF.js Canvas
        attemptGoogleDriveBinaryFetch(parsed.fileId, externalPdfFileName || '구글 드라이브 교재');
      } else {
        setDriveEmbedUrl(null);
        loadPdfFromUrl('/textbook.pdf', externalPdfFileName || '기본 교재 (textbook.pdf)');
      }
    } else if (!externalGoogleDriveUrl && !externalPdfDataUrl) {
      setDriveEmbedUrl(null);
      loadPdfFromUrl('/textbook.pdf', externalPdfFileName || '기본 교재 (textbook.pdf)');
    }
  }, [externalGoogleDriveUrl, externalPdfFileName, externalPdfDataUrl]);

  // Helper to load Uint8Array into PDF.js document
  const loadPdfFromUint8Array = async (typedArray: Uint8Array, fileName: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const lib = (pdfjsLib as any).default || pdfjsLib;
      if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version || '3.11.174'}/pdf.worker.min.js`;
      }

      const loadingTask = lib.getDocument({ data: typedArray });
      const loadedPdf = await loadingTask.promise;

      setPdfDoc(loadedPdf);
      setPdfFileName(fileName);
      setIsDemoMode(false);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);
      setDriveEmbedUrl(null); // Switch to 1-slide-per-page Canvas viewer!
      if (onPageChange) onPageChange(1, loadedPdf.numPages);
    } catch (e) {
      console.warn('PDF.js Uint8Array load failed:', e);
    }
  };

  // Attempt binary arrayBuffer fetch from Google Drive for 1-slide-per-page canvas
  const attemptGoogleDriveBinaryFetch = async (fileId: string, fileName: string) => {
    setIsLoadingDrivePdf(true);
    const candidateUrls = [
      `/gdrive-user-content/download?id=${fileId}&export=download&confirm=t`,
      `/gdrive-pdf/uc?export=download&confirm=t&id=${fileId}`,
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`)}`,
    ];

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        if (bytes.length < 500) continue;

        // Check PDF Magic Header %PDF (0x25, 0x50, 0x44, 0x46)
        const header = String.fromCharCode(...bytes.slice(0, 4));
        if (header === '%PDF') {
          await loadPdfFromUint8Array(bytes, fileName);
          setIsLoadingDrivePdf(false);
          return;
        }
      } catch (e) {
        // Try next candidate endpoint
      }
    }
    setIsLoadingDrivePdf(false);
  };

  const loadPdfFromDataUrl = async (dataUrl: string, fileName: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const lib = (pdfjsLib as any).default || pdfjsLib;
      if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version || '3.11.174'}/pdf.worker.min.js`;
      }

      const loadingTask = lib.getDocument(dataUrl);
      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setPdfFileName(fileName);
      setIsDemoMode(false);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);
      if (onPageChange) onPageChange(1, loadedPdf.numPages);
    } catch (e) {
      console.warn('Could not load PDF from data URL:', e);
    }
  };

  const loadPdfFromUrl = async (url: string, fileName: string) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const lib = (pdfjsLib as any).default || pdfjsLib;
      if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version || '3.11.174'}/pdf.worker.min.js`;
      }

      const loadingTask = lib.getDocument(url);
      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setPdfFileName(fileName);
      setIsDemoMode(false);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);
      setDriveEmbedUrl(null);
      if (onPageChange) onPageChange(1, loadedPdf.numPages);
    } catch (e) {
      console.warn('Could not load PDF from URL:', e);
      setIsDemoMode(true);
    }
  };

  // Load and Render PDF page or Demo slide
  useEffect(() => {
    if (isDemoMode && !driveEmbedUrl) {
      setTotalPages(DEMO_SLIDES.length);
      renderDemoPage();
    } else if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [currentPage, pdfDoc, isDemoMode, zoomScale, driveEmbedUrl]);

  // Keyboard navigation shortcuts & Mouse Wheel navigation
  const lastWheelTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        goToPrevPage();
      } else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Mouse Wheel Scroll page navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 250) return;

      if (e.deltaY > 0) {
        goToNextPage();
        lastWheelTimeRef.current = now;
      } else if (e.deltaY < 0) {
        goToPrevPage();
        lastWheelTimeRef.current = now;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [totalPages]);

  const renderDemoPage = () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.width = 1280 * zoomScale;
      canvas.height = 720 * zoomScale;

      const safePage = Math.max(1, Math.min(currentPage, DEMO_SLIDES.length));
      const currentSlide = DEMO_SLIDES[safePage - 1] || DEMO_SLIDES[0];
      if (currentSlide) {
        renderDemoSlideToCanvas(canvas, currentSlide);
      }
    } catch (e) {
      console.error('Demo page render error:', e);
    }
  };

  const renderPdfPage = async (pageNum: number) => {
    if (!pdfDoc) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(1, 0, 0, 1, 0, 0);

      const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({
        scale: zoomScale * dpr,
        rotation: page.rotate || 0,
      });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('PDF Page Render Error:', err);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setDriveEmbedUrl(null);

    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const dataUrl = fileReader.result as string;
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const lib = (pdfjsLib as any).default || pdfjsLib;
        if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
          lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version || '3.11.174'}/pdf.worker.min.js`;
        }

        const loadingTask = lib.getDocument(dataUrl);
        const loadedPdf = await loadingTask.promise;
        setPdfDoc(loadedPdf);
        setIsDemoMode(false);
        setTotalPages(loadedPdf.numPages);
        setCurrentPage(1);
        if (onPageChange) onPageChange(1, loadedPdf.numPages);
        if (onPdfLoaded) onPdfLoaded(dataUrl, file.name);
      } catch (e) {
        console.error('Failed to load PDF document', e);
        alert('PDF 파일을 불러오는데 실패했습니다. 올바른 PDF 형식인지 확인해주세요.');
      }
    };
    fileReader.readAsDataURL(file);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        const next = prev - 1;
        if (onPageChange) onPageChange(next, totalPages);
        return next;
      }
      return prev;
    });
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => {
      if (prev < totalPages) {
        const next = prev + 1;
        if (onPageChange) onPageChange(next, totalPages);
        return next;
      }
      return prev;
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleManualConvertClick = () => {
    if (externalGoogleDriveUrl) {
      const parsed = parseGoogleDriveUrl(externalGoogleDriveUrl);
      if (parsed.fileId) {
        attemptGoogleDriveBinaryFetch(parsed.fileId, pdfFileName);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Control Toolbar */}
      <div
        style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          gap: '8px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        {/* Document Selector / Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexShrink: 1 }}>
          <FileText size={16} color="var(--accent-color)" style={{ flexShrink: 0 }} />
          
          {!isReadOnly && courseSchedules && courseSchedules.length > 0 ? (
            <select
              value={activeWeekNum || 1}
              onChange={(e) => {
                const targetWeek = courseSchedules.find((w) => w.week === parseInt(e.target.value, 10));
                if (targetWeek && onSelectWeekSchedule) {
                  onSelectWeekSchedule(targetWeek);
                }
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '220px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                flexShrink: 1,
              }}
            >
              {courseSchedules.map((w) => (
                <option key={w.week} value={w.week} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {w.week}주차: {w.pdfFileName || w.topic || `${w.week}주차 강의안.pdf`}
                </option>
              ))}
            </select>
          ) : (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '260px'
              }}
              title={pdfFileName}
            >
              {pdfFileName}
            </span>
          )}

          {!isReadOnly && isLoadingDrivePdf ? (
            <span style={{ fontSize: '11px', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Loader2 size={12} className="animate-spin" /> 1슬라이드 변환 중...
            </span>
          ) : !isReadOnly && driveEmbedUrl ? (
            <button
              onClick={handleManualConvertClick}
              title="구글드라이브 미리보기를 1슬라이드 꽉 차는 화질로 수동 변환"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Play size={11} /> 1장씩 크게 변환
            </button>
          ) : null}
        </div>

        {/* Page Navigation Controls & Page Count Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {!isReadOnly && (
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                opacity: currentPage <= 1 ? 0.4 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={15} />
            </button>
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '44px', textAlign: 'center', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {currentPage} / {totalPages}
          </span>
          {!isReadOnly && (
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                opacity: currentPage >= totalPages ? 0.4 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <ChevronRight size={15} />
            </button>
          )}
        </div>

        {/* View Controls & Action Buttons - Completely Hidden in Projector (isReadOnly) Mode */}
        {!isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.1))}
              title="축소"
              style={{ padding: '5px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', flexShrink: 0 }}
            >
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{Math.round(zoomScale * 100)}%</span>
            <button
              onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
              title="확대"
              style={{ padding: '5px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', flexShrink: 0 }}
            >
              <ZoomIn size={15} />
            </button>

            {/* Student PDF Download Button */}
            {externalGoogleDriveUrl && (
              <a
                href={parseGoogleDriveUrl(externalGoogleDriveUrl).downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="학생 교재 PDF 다운로드"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Download size={13} /> PDF 다운로드
              </a>
            )}

            {/* Upload Local PDF */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Upload size={13} /> 파일 새로 선택
              <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title="전체화면"
              style={{ padding: '5px 8px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', flexShrink: 0 }}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        )}
      </div>

      {/* Main Slide / PDF Display Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {driveEmbedUrl && !pdfDoc ? (
          <iframe
            src={driveEmbedUrl}
            title="Google Drive PDF Document Viewer"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
              boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            }}
            allow="autoplay"
          />
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                transition: 'all 0.2s ease-out',
                display: (!pdfDoc && !isDemoMode) ? 'none' : 'block'
              }}
            />
            {!pdfDoc && !isDemoMode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <svg className="animate-spin" style={{ width: '36px', height: '36px', color: 'var(--accent-color)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.7 }}>교재를 불러오는 중입니다...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
