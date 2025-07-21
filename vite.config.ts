import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import viteImagemin from 'vite-plugin-imagemin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    open: true, // Optional: automatically open browser
  },
  build: {
    // Enable gzip compression
    rollupOptions: {
      output: {
        // Manual chunking for better code splitting
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-label', '@radix-ui/react-slot'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    },
    // Optimize bundle size
    target: 'es2020',
    minify: 'terser',
    // Increase chunk size warning limit since we're optimizing manually
    chunkSizeWarningLimit: 600,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    // PWA optimizations
    assetsDir: 'assets',
    assetsInlineLimit: 4096 // Inline assets smaller than 4kb
  },
  // PWA-specific optimizations
  worker: {
    format: 'es'
  },
  // Enable better tree shaking
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
