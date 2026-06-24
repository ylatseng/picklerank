import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ── Load English typography fonts from Google Fonts ─────────────────────────
// These power the new font options in Settings (Inter, Poppins, Merriweather,
// Roboto, JetBrains Mono). Loaded once at startup with `display=swap` so the
// UI never blocks waiting for them.
(function injectFonts() {
  if (document.getElementById('pickle-fonts')) return;
  const link = document.createElement('link');
  link.id = 'pickle-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2' +
    '?family=Inter:wght@400;600;700' +
    '&family=Poppins:wght@400;600;700' +
    '&family=Merriweather:wght@400;700' +
    '&family=Roboto:wght@400;500;700' +
    '&family=JetBrains+Mono:wght@400;600' +
    '&display=swap';
  document.head.appendChild(link);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)