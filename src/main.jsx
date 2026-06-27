import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceExpenseTrackerPreview from './VoiceExpenseTrackerPreview.jsx';
import './styles.css';
import './premium-overrides.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoiceExpenseTrackerPreview />
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
