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

