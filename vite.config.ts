/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served from https://dylan-harmsen.github.io/zine-creator/
  base: '/zine-creator/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
