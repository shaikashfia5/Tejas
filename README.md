# Tejas (तेजस) — Financial Continuity Passport PWA

> **Consent-based financial access PWA for rural Indian micro-entrepreneurs.**

Rural micro-entrepreneurs (farmers, auto drivers, artisans) operate largely in cash and
informal UPI payments and are invisible to traditional credit bureaus. **Tejas** lets them
build a self-sovereign **Financial Continuity Passport**: verifiable evidence, provenance-aware
metrics, a liquidity shock simulator, and time-limited, revocable shareable briefs.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌐 **Bilingual (English + Hindi)** | Full localization with large touch targets for low-literacy users. |
| 📷 **Client-side OCR** | Tesseract.js extracts text from receipt photos in-browser. |
| 🧠 **Secure AI structuring** | Receipt text is structured by a Supabase Edge Function (Gemini key stays server-side, JWT-authenticated, rate-limited) with an offline rule-based fallback. |
| ⚡ **Offline-First PWA** | IndexedDB queue stores entries offline and syncs automatically with retry caps. |
| 🛡️ **Resilience Buffer** | Dated cashflow projection: 90-day surplus + daily flows + obligations on their real due dates. |
| 💥 **Shock Simulator** | Projects buffer before/after a shock, with shortfall date and gap amount. |
| 🔗 **Time-Limited Sharing** | Cryptographically random share tokens, expiry, one-click revocation — public briefs are only readable through a token-gated RPC. |
| 📄 **PDF Brief** | Export with Noto Sans (₹ renders correctly). |

---

## 🔐 Security Model

- **Row Level Security on every table** — users can only ever touch their own rows.
- **Briefs are NOT publicly queryable.** The anonymous role cannot `SELECT` from `briefs`;
  public briefs are served only via the `get_public_brief(token)` RPC, which returns the
  brief **only** when the token matches and the brief is neither revoked nor expired.
- **No secrets in the client.** The Gemini API key lives in Supabase secrets
  (`supabase secrets set GEMINI_API_KEY=...`). The `VITE_GEMINI_API_KEY` client fallback
  was removed — anything prefixed `VITE_` ships in the JS bundle.
- **Authenticated, rate-limited Edge Function** (`parse-evidence`): verifies the caller's
  JWT and enforces a per-user sliding-window limit (20 req/min).
- **Offline sync integrity**: failed inserts are queued and retried (max 5 attempts); the
  queue never flushes another user's rows; entries queued offline keep `image_url` and
  `parsed_meta`.
- **Security headers** (CSP, HSTS, X-Frame-Options, nosniff) are set in `vercel.json`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v3
- **Visualization**: Recharts · **OCR**: Tesseract.js · **PDF**: @react-pdf/renderer
- **Offline**: `idb` (IndexedDB queue) + Service Worker (vite-plugin-pwa)
- **Backend**: Supabase (Postgres + RLS, Auth, Storage, Edge Functions)

---

## 📦 Project Structure

```
tejas-app/
├── public/
│   ├── fonts/                     # Noto Sans (PDF export, ₹ support)
│   ├── manifest.json              # PWA manifest
│   └── offline.html
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Tables + RLS + user-profile trigger
│   │   ├── 002_storage_gemini.sql   # Private storage bucket + policies
│   │   └── 003_security_hardening.sql # Briefs RLS fix + token-gated RPC
│   └── functions/parse-evidence/    # Hardened receipt-structuring function
├── src/
│   ├── components/                # UI building blocks
│   ├── context/AuthContext.tsx    # Supabase auth session
│   ├── hooks/                     # useEvidence / useBriefs / useObligations / useShockSim
│   ├── lib/
│   │   ├── classifier.ts          # Rule-based transaction extraction (offline fallback)
│   │   ├── computations.ts        # Dated cashflow projection engine
│   │   ├── geminiParser.ts        # Edge-function-first parsing pipeline
│   │   ├── localStore.ts          # Crash-proof localStorage helpers
│   │   ├── offlineQueue.ts        # IndexedDB queue w/ retry caps
│   │   └── ...
│   ├── pages/                     # Onboarding → Evidence → CashFlow → Shock → Passport → Share
│   └── types/database.ts
└── vercel.json                    # SPA rewrites + security headers
```

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js (v18+) & npm

### 2. Install
```bash
git clone https://github.com/shaikashfia5/Tejas.git
cd Tejas
npm install
```

### 3. Supabase setup
1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations **in order**:
   `001_initial_schema.sql` → `002_storage_gemini.sql` → `003_security_hardening.sql`
3. Set the AI secret (optional — the rule-based classifier is the offline fallback):
   ```bash
   supabase secrets set GEMINI_API_KEY=your-gemini-api-key
   supabase functions deploy parse-evidence
   ```
4. Create `.env` (copy `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

> Without Supabase configured the app runs in **local-only mode** (data stays on the device).

### 4. Run
```bash
npm run dev     # http://localhost:5173
npm run lint    # tsc --noEmit
npm run build   # production build
```

---

## 🚢 Deployment (Vercel)

The repo includes `vercel.json` (SPA rewrites + security headers). Import the repository in
the [Vercel Dashboard](https://vercel.com) and set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` as project environment variables. Every push to `main` triggers
a fresh deployment.

---

## 📜 License
MIT License • Built for Hackathon 2026.
