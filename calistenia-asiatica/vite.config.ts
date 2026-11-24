import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' para funcionar empacotado dentro do APK
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
});
