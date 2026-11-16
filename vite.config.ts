import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: ['es2015', 'chrome80', 'firefox78', 'safari13', 'edge80'],
    cssTarget: ['chrome80', 'firefox78', 'safari13'],
    chunkSizeWarningLimit: 1200,
  },
})
