import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/analyze-product-image': {
        target: 'http://127.0.0.1:5001/my-store-6a861/us-central1',
        changeOrigin: true,
        rewrite: () => '/analyzeProductImage',
      },
    },
  },
})
