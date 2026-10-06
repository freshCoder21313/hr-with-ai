import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from '@/App';

// Automatically reload when dynamic imports fail (e.g. after HMR, rebuild, or dev server restart)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
