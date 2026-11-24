import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AdminStandaloneApp from './AdminStandaloneApp.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './i18n';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

createRoot(document.getElementById('admin-root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AdminStandaloneApp />
    </ErrorBoundary>
  </StrictMode>,
);
