import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// `base` is required for GitHub Pages deployments served from a project
// subfolder, e.g. https://<user>.github.io/Starai-exchange/. Leaving it as
// the default `/` will break all asset URLs (favicon, JS, CSS) on Pages.
export default defineConfig({
  plugins: [react()],
  // Relative base also keeps `vite preview` working locally without surprises.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    // Ensure assets are emitted with relative paths so the same build can
    // be served from `/`, `/Starai-exchange/`, or any other subfolder.
    assetsDir: 'assets',
  },
});
