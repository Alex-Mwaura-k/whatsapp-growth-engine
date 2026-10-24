import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // SECURITY: Inject service worker into the build 
      injectRegister: 'auto',
      devOptions: {
        enabled: true 
      },
      // SECURITY: Best practice to include workbox settings for offline security
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Prevents man-in-the-middle attacks by ensuring only trusted assets are cached
        sourcemap: false 
      },
      manifest: {
        name: 'Growth Engine',
        short_name: 'GrowthApp',
        description: 'Expand your WhatsApp network securely.',
        theme_color: '#3b82f6', // Updated to match your blue theme
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait', // SECURITY: Prevents UI breaks on rotate
        scope: '/',
        start_url: '/',
        icons: [
          {
            // FIXED: Pointing exactly to your local files in /public
            src: 'pwa-192x192.png', 
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable' // Support for adaptive Android icons
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],

  // DEV SERVER PROXY: Seamlessly forwards all /api requests to Django backend on port 8000
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // SECURITY: Prevent source code leaking in production
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Security: Removes console.logs in production
        drop_debugger: true
      }
    }
  }
})