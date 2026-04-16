import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('../core/src', import.meta.url)),
      // Resolve workspace packages directly to their TS sources so a prior
      // `tsc -b` of the package isn't required for dev/build/typecheck.
      '@quarter-tone/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@quarter-tone/audio': fileURLToPath(new URL('../audio/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
