import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 60011,
    host: true,
  },
  preview: {
    port: 60011,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
});
