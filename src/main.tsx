import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety handlers for the sandboxed iframe environment
if (typeof window !== 'undefined') {
  const ignoredErrors = [
    'ResizeObserver',
    'Resize observer',
    'loop limit exceeded',
    'loop completed with undelivered notifications'
  ];

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (ignoredErrors.some(err => message.includes(err))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = (event.reason && event.reason.message) || '';
    if (ignoredErrors.some(err => message.includes(err))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('PWA Service Worker registration failed:', err);
      });
  });
}


