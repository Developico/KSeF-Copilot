import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { powerApps } from '@microsoft/power-apps-vite/plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    modulePreload: false,
    assetsInlineLimit: 10000,
  },
})
