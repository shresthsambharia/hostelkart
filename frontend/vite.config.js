import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split heavy PDF generation dependencies to keep initial load lightweight
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            // Split heavy charting library to keep customer landing pages lightweight
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Split socket connection to keep initial load lightweight
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            // Isolate icons to allow parallel download
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Standard framework libraries
            return 'vendor';
          }
        },
      },
    },
  },
});
