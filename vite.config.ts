import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import viteImagemin from 'vite-plugin-imagemin'
import { buildMetadataPlugin } from './src/plugins/buildMetadataPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildMetadataPlugin({
      customMetadata: {
        deployment: 'production',
        app: 'openstay'
      }
    }),
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
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    open: true, // Optional: automatically open browser
  },
  build: {
    // Optimize bundle size
    target: 'es2020',
    minify: 'terser',
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
