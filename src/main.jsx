import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// ── PWA service worker registration & auto-update ───────────────────────────
// Previously the app manually registered /public/sw.js, but vite-plugin-pwa
// generates its own Workbox sw.js at build time which silently overwrites
// that file — so the manual registration was talking to a SW that doesn't
// actually exist in production, and updates never reloaded the page. This
// uses the plugin's own registration helper instead, and forces a reload as
// soon as a new version has installed (iOS standalone PWAs don't reliably
// pick up background updates on their own, even via pull-to-refresh).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // A new version finished installing in the background. Activate it and
    // reload immediately so the user always gets the latest build next time
    // they open the app — no stale "why isn't this updating" confusion.
    updateSW(true);
  },
  onOfflineReady() {
    // App shell cached for offline use — nothing to do, just informational.
  },
});

// Re-check for an update whenever the app regains focus/visibility. iOS
// PWAs launched from the home screen don't get the browser's normal
// "check for SW update on navigation" behavior, so this is the main way
// updates get noticed in practice.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateSW();
  }
});

// ── iOS PWA viewport-fit=cover ───────────────────────────────────────────────
// Without `viewport-fit=cover`, env(safe-area-inset-*) values are always 0 even
// on devices with notches. This sets it on the existing meta viewport tag, or
// adds one if missing — required for our safe-area padding in styles.js to work.
(function setViewportFit() {
  let vp = document.querySelector('meta[name="viewport"]');
  if (!vp) {
    vp = document.createElement('meta');
    vp.name = 'viewport';
    document.head.appendChild(vp);
  }
  vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
})();

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