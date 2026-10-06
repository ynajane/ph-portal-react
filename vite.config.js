import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Local dev: `npm run server` (API on :3000) + `npm run dev` (React on :5173). Unset TLS_KEY/TLS_CERT locally, or set API_TARGET=https://localhost:3000
const t = process.env.API_TARGET || 'http://localhost:3000', p = { target: t, secure: false };
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': p, '/verify-email': p, '/unlock': p } } });
