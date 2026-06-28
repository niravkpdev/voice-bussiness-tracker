import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceExpenseTrackerPreview from './VoiceExpenseTrackerPreview.jsx';
import './styles.css';
import './premium-overrides.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or contact support.</p>
          <pre style={{ color: 'red', textAlign: 'left', padding: '20px', overflow: 'auto', background: '#ffebee', borderRadius: '8px', marginTop: '20px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>Refresh</button>
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
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => {
        if ('caches' in window) {
          return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        }
        return null;
      })
      .catch(() => {
        // The app still works if the browser blocks service worker cleanup.
      });
  });
}
