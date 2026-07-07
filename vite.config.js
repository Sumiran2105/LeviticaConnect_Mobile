import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  optimizeDeps: {
    include: ['@hookform/resolvers/zod'],
  },
  server: {
    proxy: {
      '/backend': {
        target: 'https://collabration-teams-zrhv.onrender.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
      '/backend-ws': {
        target: 'https://collabration-teams-zrhv.onrender.com',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/backend-ws/, '/ws'),
      },
    },
  },
})
