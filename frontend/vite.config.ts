import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  root: __dirname,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
  preview: {
    port: Number(process.env.PORT ?? 4173),
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
});
