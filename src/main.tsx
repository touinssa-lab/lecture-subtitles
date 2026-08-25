import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f8fafc', background: '#0f172a', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>⚠️ 애플리케이션 실행 오류 발생</h2>
          <pre style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', color: '#ef4444', marginTop: '16px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#38bdf8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Vite Re-bundle trigger
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
