import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      '@hcaptcha/react-hcaptcha': path.resolve(__dirname, 'node_modules/@hcaptcha/react-hcaptcha'),
    }
  }
})