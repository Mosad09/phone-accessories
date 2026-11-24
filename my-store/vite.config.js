import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/')) {
            if (normalized.includes('/@firebase/') || normalized.includes('/firebase/')) {
              return 'vendor-firebase';
            }
            if (normalized.includes('/framer-motion/')) {
              return 'vendor-motion';
            }
            if (normalized.includes('/i18next/') || normalized.includes('/react-i18next/')) {
              return 'vendor-i18n';
            }
            if (
              normalized.includes('/react-router') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react/') ||
              normalized.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (
              normalized.includes('/nouislider/') ||
              normalized.includes('/papaparse/') ||
              normalized.includes('/bootstrap/')
            ) {
              return 'vendor-ui';
            }
          }
        },
      },
    },
  },
})
