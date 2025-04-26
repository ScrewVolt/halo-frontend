import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HALO - Health Automated Logging Operator',
        short_name: 'HALO',
        description: 'AI-powered clinical charting system for nurses',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1E3A8A',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      },
      workbox: {
        navigateFallback: '/offline.html',  // ✅ fallback if offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true,
      },
      includeAssets: ['offline.html', 'offline.css'], // ✅ Add this line
    })    
  ]
});
