import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload, Maximize2, Minimize2, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { DEMO_SLIDES, renderDemoSlideToCanvas } from '../utils/demoPdf';

interface PdfViewerProps {
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onPdfLoaded?: (fileDataUrl: string, fileName: string) => void;
  externalPdfDataUrl?: string | null;
  externalPdfFileName?: string | null;
  externalCurrentPage?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  onPageChange,
  onPdfLoaded,
  externalPdfDataUrl,
  externalPdfFileName,
  externalCurrentPage,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(DEMO_SLIDES.length);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pdfFileName, setPdfFileName] = useState<string>('시범 강의 슬라이드 (Demo Slides)');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync external page changes (e.g. for student mode)
  useEffect(() => {
    if (externalCurrentPage !== undefined && externalCurrentPage !== currentPage) {
      setCurrentPage(externalCurrentPage);
    }
  }, [externalCurrentPage]);

  // Sync external PDF Data URL (e.g. when instructor loads a new PDF)
  useEffect(() => {
    if (externalPdfDataUrl) {
      loadPdfFromDataUrl(externalPdfDataUrl, externalPdfFileName || '동기화된 PDF 교재');
    }
  }, [externalPdfDataUrl, externalPdfFileName]);

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

  // Auto-detect and load default PDF file from public/lecture.pdf or public/default.pdf if present
  useEffect(() => {
    const checkDefaultPdf = async () => {
      const candidates = ['/lecture.pdf', '/default.pdf'];
      for (const pdfUrl of candidates) {
        try {
          const res = await fetch(pdfUrl, { method: 'HEAD' });
          if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
            loadPdfFromUrl(pdfUrl, pdfUrl.substring(1));
            break;
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    checkDefaultPdf();
  }, []);

  const loadPdfFromUrl = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

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
      if (onPageChange) onPageChange(1, loadedPdf.numPages);
    } catch (e) {
      console.warn('Could not auto-load default PDF:', e);
    }
  };

  // Load and Render PDF page or Demo slide
  useEffect(() => {
    if (isDemoMode) {
      setTotalPages(DEMO_SLIDES.length);
      renderDemoPage();
    } else if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [currentPage, pdfDoc, isDemoMode, zoomScale]);

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

    // Cancel any previous ongoing PDF render task to prevent canvas matrix corruption
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

      // Reset HTML5 canvas transformation matrix before drawing
      context.setTransform(1, 0, 0, 1, 0, 0);

      // High-DPI Ultra Crisp Vector Rendering (Super High Quality)
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

  const resetToDemoMode = () => {
    setIsDemoMode(true);
    setPdfDoc(null);
    setPdfFileName('시범 강의 슬라이드 (Demo Slides)');
    setCurrentPage(1);
    setTotalPages(DEMO_SLIDES.length);
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Document Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <FileText size={18} color="var(--accent-color)" />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '220px'
            }}
          >
            {pdfFileName}
          </span>
        </div>

        {/* Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              opacity: currentPage <= 1 ? 0.4 : 1,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '70px', textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-hover)',
              opacity: currentPage >= totalPages ? 0.4 : 1,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Toolbar Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Zoom controls */}
          <button
            onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.1))}
            title="축소"
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)' }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{Math.round(zoomScale * 100)}%</span>
          <button
            onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
            title="확대"
            style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)' }}
          >
            <ZoomIn size={16} />
          </button>

          {/* Upload PDF */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} /> PDF 교재 파일 열기
            <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="전체화면"
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)' }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Canvas Display Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            transition: 'all 0.2s ease-out'
          }}
        />
      </div>
    </div>
  );
};
