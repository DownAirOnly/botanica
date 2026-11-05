import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/botanica/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Botanica — Inventory Workspaces',
        short_name: 'Botanica',
        description: 'Private inventory workspaces, herbal production, and stock control.',
        theme_color: '#1b382e',
        background_color: '#f8f7f0',
        display: 'standalone',
        start_url: '/botanica/',
        scope: '/botanica/',
        icons: [
          {src:'/botanica/favicon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}
        ]
      },
      workbox: {globPatterns:['**/*.{js,css,html,svg,png,woff2}']}
    })
  ]
});
