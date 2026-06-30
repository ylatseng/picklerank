import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Assuming you use this
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
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