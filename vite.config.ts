import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// The site is served from the domain root (courses.pattygcoding.com), so the
// default base of "/" is correct. Assets are hashed by Vite, and the 404.html
// fallback that GitHub Pages needs is produced by scripts/copy-404.mjs.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
  },
})
