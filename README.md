ADS_CD_BOT — Telegram Mini App (Frontend)

Overview
ADS_CD_BOT is a React-based Telegram Mini App frontend. It integrates:
- Telegram WebApp SDK for in-app initialization and UI behavior.
- Montage/Monetag Ad SDK (show_9822309) to display rewarded ads.
- Backend REST API for balance and credit endpoints.

Project Stack
- React 18 (Create React App or Vite)
- React Router (optional, for multiple pages)
- Telegram WebApp SDK (loaded via script tag)
- Montage/Monetag Ad SDK (loaded via script tag)
- Deployed on Vercel (frontend) + Render (backend)

Folder Structure (suggested)
- public/
  - index.html (includes Telegram SDK + ad SDK)
- src/
  - index.js
  - App.jsx (Telegram init, optional router)
  - AppRoutes.jsx (if using multiple pages)
  - pages/ (Home, Earn, Profile)
  - components/ (shared UI)
  - services/
    - apiClient.js (fetch wrapper)
    - user.service.js (getBalance, credit)
    - ads.service.js (show_9822309 helpers)
  - hooks/ (useTelegram, useUser)
  - styles/ (App.css)
- .env.sample
- .env.development
- .env.production
- vite.config.js (if using Vite)

Environment Variables
- VITE_API_URL (required)
  - Production example: https://ads-cd-bot-backend.onrender.com
  - Development example: http://localhost:8843
- Only variables prefixed with VITE_ are exposed to the client bundle (Vite requirement).

Example .env files
- .env.development
  VITE_API_URL=http://localhost:8843
- .env.production
  VITE_API_URL=https://ads-cd-bot-backend.onrender.com

Index.html requirements
- Keep both script tags:
  - <script src="https://telegram.org/js/telegram-web-app.js"></script>
  - <script src="//libtl.com/sdk.js" data-zone="9822309" data-sdk="show_9822309"></script>
- These expose:
  - window.Telegram.WebApp (Telegram SDK).
  - window.show_9822309 (ad SDK function).

Ad SDK usage (frontend)
- Rewarded Interstitial:
  window.show_9822309().then(() => { /* credit points */ }).catch(() => {});
- Rewarded Popup:
  window.show_9822309('pop').then(() => { /* credit points */ }).catch(() => {});
- In-App Interstitial (auto, no reward):
  window.show_9822309({ type: 'inApp', inAppSettings: { frequency: 2, capping: 0.1, interval: 30, timeout: 5, everyPage: false } });

Backend endpoints (expected)
- GET /balance → { normal_points, gold_points }
- POST /credit { adType: 'popup' | 'interstitial' } → returns updated points
- Authorization header should include Telegram init data:
  Authorization: tma <tg-init-data>

Local Development
- If using Vite, add a dev proxy to avoid CORS:
  vite.config.js
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  export default defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'https://ads-cd-bot-backend.onrender.com',
          changeOrigin: true,
          secure: true,
          rewrite: p => p.replace(/^\\/api/, ''),
        },
      },
    },
  });
- Start dev server:
  - CRA: npm start
  - Vite: npm run dev (if configured)

Production Deployment (Vercel)
- Set VITE_API_URL as a Vercel Environment Variable for Production.
- Build command:
  - CRA: npm run build (output: build/)
  - Vite: npm run build (output: dist/)
- Ensure CORS on the backend allows your Vercel domain if calling cross-origin.

Security Notes
- Never expose secrets in .env files; only non-sensitive VITE_ variables are client-side.
- Validate Telegram init data on backend before crediting rewards.

Troubleshooting
- “Ad SDK not loaded”: confirm index.html script tag for libtl.com is present and data-zone is correct.
- “Failed to credit”: check backend /credit route, CORS, and Authorization handling.
- CORS errors in production: allow the Vercel domain in backend CORS settings or use a reverse proxy.

License
- Private/internal use for ADS_CD_BOT project.

Contributing
- Use small, incremental PRs—one feature or file at a time.
- Keep API calls inside services to avoid touching page/UI code when backend changes.

Citations:
[1] 1000060907.jpg https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/83287131/5dbb19d6-8b2c-42f0-99c2-5bd2023c5f96/1000060907.jpg
[2] 1000060913.jpg https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/83287131/a024227c-0be1-4e74-954b-750660fa3c9d/1000060913.jpg
