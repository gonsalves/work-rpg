import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
