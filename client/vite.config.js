import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    // TensorFlow.js is legitimately large; it's lazy-loaded only on /monitor.
    chunkSizeWarningLimit: 2600,
  },
});
