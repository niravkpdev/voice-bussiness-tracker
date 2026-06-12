import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceExpenseTrackerPreview from './VoiceExpenseTrackerPreview.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoiceExpenseTrackerPreview />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => registration.update())
      .catch(() => {
        // PWA install remains optional if the browser blocks service workers.
      });
  });
}
