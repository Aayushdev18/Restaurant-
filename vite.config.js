import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
      "/agent": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:5001", changeOrigin: true },
      "/agent": { target: "http://127.0.0.1:5001", changeOrigin: true },
    },
  },
})
