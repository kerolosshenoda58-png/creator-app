import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely handle and ignore benign ResizeObserver layout loop warnings/errors
if (typeof window !== 'undefined') {
  const isResizeObserverError = (msg: string | undefined | null) => {
    if (!msg) return false;
    return msg.includes('ResizeObserver') || msg.includes('loop limit exceeded');
  };

  window.addEventListener('error', (e) => {
    if (isResizeObserverError(e.message) || isResizeObserverError(e.error?.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : '');
    if (isResizeObserverError(msg)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

