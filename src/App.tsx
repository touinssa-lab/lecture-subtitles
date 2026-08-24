import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PdfViewer } from './components/PdfViewer';
import { SubtitleDisplay, SubtitleItem } from './components/SubtitleDisplay';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { SpeechEngine } from './services/speechRecognition';
import { translateText, TranslationSettings } from './services/translationService';

export const App: React.FC = () => {
  // Student popout window detector
  const isStudentMode = new URLSearchParams(window.location.search).get('mode') === 'student';

  // Auth Protection (Password: insight123)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem('lecture_app_authenticated') === 'true' || isStudentMode
  );

  // Theme & Settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<TranslationSettings>({
    engine: 'free',
  });

  // Layout, Display & Target Language Controls
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'bottom-overlay'>('side-by-side');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl' | 'xxl'>('large');
  const [targetLanguage, setTargetLanguage] = useState<string>('en'); // Default: English ('en')
  const [showKorean, setShowKorean] = useState<boolean>(true);

  // Speech & Translation State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Sync State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(4);

  // Refs for persistent engines & cross-window sync
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastProcessedTextRef = useRef<string>('');
  const targetLanguageRef = useRef<string>('en');

  // Keep targetLanguageRef in sync
  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
  }, [targetLanguage]);

  // Apply theme to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Setup BroadcastChannel for popout student window synchronization
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('lecture_subtitles_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SUBTITLES_UPDATE') {
          setSubtitles(payload.subtitles);
          setInterimText(payload.interimText || '');
          if (payload.targetLanguage) setTargetLanguage(payload.targetLanguage);
        } else if (type === 'PAGE_CHANGE') {
          setCurrentPage(payload.currentPage);
        } else if (type === 'MIC_STATUS') {
          setIsListening(payload.isListening);
        }
      };

      return () => {
        const chan = broadcastChannelRef.current;
        broadcastChannelRef.current = null;
        if (chan) {
          try {
            chan.close();
          } catch (e) {}
        }
      };
    }
  }, []);

  // Initialize SpeechEngine on mount
  useEffect(() => {
    if (isStudentMode || !isAuthenticated) return; // Student window or unauthenticated doesn't capture mic

    const engine = new SpeechEngine({
      onInterimText: (text) => {
        setInterimText(text);
        syncToBroadcast({ interimText: text });
      },
      onFinalSentence: async (finalKoText) => {
        const cleanKo = finalKoText.trim().replace(/\s+/g, ' ');
        if (!cleanKo) return;

        // Deduplicate exact same text sent in rapid succession
        if (lastProcessedTextRef.current === cleanKo) return;
        lastProcessedTextRef.current = cleanKo;

        try {
          const currentLang = targetLanguageRef.current;
          const translatedText = await translateText(cleanKo, settings, currentLang);
          const newItem: SubtitleItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            koreanText: cleanKo,
            englishText: translatedText,
            timestamp: new Date().toLocaleTimeString(),
          };

          setSubtitles((prev) => {
            if (prev.length > 0) {
              const lastItem = prev[prev.length - 1];
              // Skip if last subtitle has identical Korean or translated text
              if (lastItem.koreanText === cleanKo || lastItem.englishText === translatedText) {
                return prev;
              }
            }
            const next = [...prev, newItem];
            // Keep up to 50 subtitles in memory
            if (next.length > 50) next.shift();
            syncToBroadcast({ subtitles: next });
            return next;
          });
        } catch (err) {
          console.error('Translation error:', err);
        }
      },
      onStatusChange: (listening, error) => {
        setIsListening(listening);
        if (error) setErrorMessage(error);
        else setErrorMessage(null);
        syncToBroadcast({ isListening: listening });
      },
    });

    speechEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [settings, isStudentMode, isAuthenticated]);

  const syncToBroadcast = (extraPayload: any = {}) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'SUBTITLES_UPDATE',
          payload: {
            subtitles: extraPayload.subtitles !== undefined ? extraPayload.subtitles : subtitles,
            interimText: extraPayload.interimText !== undefined ? extraPayload.interimText : interimText,
            targetLanguage: extraPayload.targetLanguage !== undefined ? extraPayload.targetLanguage : targetLanguage,
          },
        });
      } catch (err) {
        // Channel closed or unmounted
      }
    }
  };

  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang);
    syncToBroadcast({ targetLanguage: lang });
  };

  const handleToggleMic = () => {
    if (!speechEngineRef.current) return;
    if (isListening) {
      speechEngineRef.current.stop();
    } else {
      speechEngineRef.current.start();
    }
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'PAGE_CHANGE',
          payload: { currentPage: page, totalPages: total },
        });
      } catch (err) {}
    }
  };

  const handleOpenPopoutWindow = () => {
    window.open(`${window.location.origin}${window.location.pathname}?mode=student`, 'StudentView', 'width=1280,height=800');
  };

  // Render Password Auth Modal if not authenticated
  if (!isAuthenticated) {
    return <AuthModal onAuthenticate={() => setIsAuthenticated(true)} />;
  }

  // If student mode window, render clean full-screen presentation + subtitle view
  if (isStudentMode) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          padding: '16px',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, display: 'flex', gap: '16px', height: '100%' }}>
          <div style={{ flex: '0 0 65%', height: '100%' }}>
            <PdfViewer onPageChange={handlePageChange} />
          </div>
          <div style={{ flex: '1', height: '100%' }}>
            <SubtitleDisplay
              subtitles={subtitles}
              interimText={interimText}
              isListening={isListening}
              fontSize={fontSize}
              targetLanguage={targetLanguage}
              showKorean={showKorean}
              onToggleKorean={() => setShowKorean(!showKorean)}
              onClearSubtitles={() => setSubtitles([])}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Top Header Controls */}
      <Header
        isListening={isListening}
        onToggleMic={handleToggleMic}
        layoutMode={layoutMode}
        onChangeLayout={setLayoutMode}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        targetLanguage={targetLanguage}
        onChangeTargetLanguage={handleTargetLanguageChange}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPopoutWindow={handleOpenPopoutWindow}
      />

      {/* Warning / Error Message Banner */}
      {errorMessage && (
        <div
          style={{
            background: '#ef4444',
            color: '#ffffff',
            padding: '8px 24px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Main Workspace Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: layoutMode === 'side-by-side' ? 'row' : 'column',
          padding: '16px',
          gap: '16px',
          overflow: 'hidden',
        }}
      >
        {/* PDF Slide Viewer Container */}
        <div
          style={{
            flex: layoutMode === 'side-by-side' ? '0 0 62%' : '0 0 65%',
            height: '100%',
            minHeight: 0,
          }}
        >
          <PdfViewer onPageChange={handlePageChange} />
        </div>

        {/* Real-time Subtitle Display Container */}
        <div
          style={{
            flex: 1,
            height: '100%',
            minHeight: 0,
          }}
        >
          <SubtitleDisplay
            subtitles={subtitles}
            interimText={interimText}
            isListening={isListening}
            fontSize={fontSize}
            targetLanguage={targetLanguage}
            showKorean={showKorean}
            onToggleKorean={() => setShowKorean(!showKorean)}
            onClearSubtitles={() => setSubtitles([])}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />
    </div>
  );
};
