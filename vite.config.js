import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Assuming you use this
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // 'prompt' (not 'autoUpdate') so we control exactly when the new SW
      // takes over and the page reloads — see main.jsx registerSW() call.
      // iOS standalone PWAs don't reliably pick up silent background
      // updates, so we force a reload once the new SW has installed.
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Ensure navigation requests always get the latest index.html shell
        // rather than a stale cached one, so the new JS bundle reference is
        // picked up as soon as the new SW activates.
        cleanupOutdatedCaches: true,
        skipWaiting: false, // we trigger this manually via registerSW()
        clientsClaim: false,
      },
      manifest: {
        name: 'PickleRank',
        short_name: 'PickleRank',
        description: 'Track your pickleball matches offline',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  // Put any other config settings you had on line 11 here (like server or build settings)
});