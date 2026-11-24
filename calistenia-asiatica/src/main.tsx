import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// No app Android os arquivos já vêm do próprio APK: não precisa de service worker
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol.startsWith('http') && !('CalisNative' in window)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
