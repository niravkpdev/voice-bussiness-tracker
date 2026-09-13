import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceExpenseTrackerPreview from './VoiceExpenseTrackerPreview.jsx';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './styles.css';
import './premium-overrides.css';
import './mobile-fixes.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or contact support.</p>
          {import.meta.env.DEV && (
            <details style={{ textAlign: 'left', margin: '20px 0', background: '#ffebee', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#b91c1c' }}>Technical Diagnostics (Dev Mode)</summary>
              <pre style={{ color: '#b91c1c', overflow: 'auto', marginTop: '10px', fontSize: '12px' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }} 
              style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', background: '#0284c7', color: '#ffffff', border: 'none', fontWeight: 'bold' }}
            >
              Clear Cache &amp; Refresh
            </button>
            <button 
              onClick={() => {
                window.location.href = '/';
              }} 
              style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VoiceExpenseTrackerPreview />
      <SpeedInsights />
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // SW registration fallback
      if (import.meta.env.DEV) {
        console.warn('Service worker registration failed:', err);
      }
    });
  });
}

