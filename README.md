# Tejas (तेजस) — Financial Continuity Passport PWA

> **Consent-based financial access PWA for rural Indian micro-entrepreneurs.**  
> Built for hackathon evaluation: complete end-to-end journey (onboarding → verifiable brief) in under 5 minutes.

---

## 🌟 Overview

Rural micro-entrepreneurs in India (farmers, auto drivers, artisans, tailors) operate largely in cash and informal UPI payments. Traditional credit bureaus reject them due to lack of formal payslips or balance sheets.

**Tejas** empowers micro-entrepreneurs to build a **self-sovereign Financial Continuity Passport**:
1. **Verifiable Evidence Locker**: Scans UPI receipts, mandi slips, and bank SMS with client-side OCR and automatic keyword classification.
2. **Provenance-Aware Ledger**: Distinguishes between **Verified** (hard proof), **Declared** (manual log), and **Estimated** projections with color-coded provenance bars.
3. **Cash-Flow Map & Traceability**: Interactive trajectory chart with every number clickable to drill down to its supporting proofs.
4. **Liquidity Shock Simulator**: Tests resilience against delayed buyer payments, medical emergencies, or supplier advances.
5. **Consent-Based Shareable Brief & PDF**: Generates time-limited, revocable read-only links and downloadable PDF documents for lenders or self-help groups.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🌐 **Bilingual (English + Hindi)** | Full localization designed for low-literacy users with large touch targets. |
| 📷 **Client-Side OCR** | Tesseract.js in-browser text extraction from receipt photos without server latency. |
| ⚡ **Offline-First PWA** | IndexedDB queue stores manual entries offline and automatically syncs upon reconnection. |
| 🛡️ **Resilience Buffer** | Computes true runway days based on 90-day net surplus and upcoming debt obligations. |
| 💥 **Shock Simulator** | Real-time liquidity gap calculation with shortfall date projection and plain-language guidance. |
| 🔗 **Time-Limited Sharing** | Shareable tokenized URLs with expiration dates and one-click instant consent revocation. |
| 📄 **Downloadable PDF Brief** | Professional PDF export powered by `@react-pdf/renderer`. |

---

## 👥 Demo Profiles (1-Click Login)

For instant testing and evaluation, the app comes with three pre-seeded synthetic personas:

1. **🌾 Lakshmi Devi (Farmer)**
   - *Income model*: Seasonal (Cotton & Groundnut harvest)
   - *Goal*: Crop Inputs (Seeds & Fertilizers)
   - *Evidence*: Mandi receipt UPI payments, fertilizer bills, pump electricity estimates
   - *Token sample*: `lakshmi-kisan-2026`

2. **🛺 Raju Kumar (Auto Driver)**
   - *Income model*: Regular Informal
   - *Goal*: Working Capital
   - *Evidence*: Daily passenger UPIs, fuel expenses, auto loan EMI

3. **🧵 Priya Sharma (Tailor)**
   - *Income model*: Mixed (Custom bridal orders & tailoring)
   - *Goal*: Education Fees
   - *Evidence*: Boutique order payments, silk thread purchase receipts

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v3
- **Visualization**: Recharts (Monthly cash trajectory)
- **OCR Engine**: Tesseract.js (Client-side worker)
- **PDF Engine**: `@react-pdf/renderer`
- **Offline Storage**: `idb` (IndexedDB queue) + Service Worker (PWA)
- **Backend / Database**: Supabase PostgreSQL with Row Level Security (RLS) policies
- **Icons**: Lucide React

---

## 📦 Project Structure

```
tejas-app/
├── public/
│   ├── manifest.json              # PWA Manifest
│   ├── offline.html               # Offline fallback screen
│   └── icons/                     # Vector and PNG icons
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Profiles, Evidence, Obligations, Briefs + RLS
├── src/
│   ├── components/
│   │   ├── BufferIndicator.tsx    # Resilience days gauge
│   │   ├── CashFlowChart.tsx      # Monthly bar chart
│   │   ├── EvidenceCard.tsx       # Receipt item with provenance
│   │   ├── LanguageSelector.tsx   # EN / HI toggle
│   │   ├── Layout.tsx             # Mobile app shell & navigation
│   │   ├── PassportCard.tsx       # Expandable indicator card
│   │   ├── ProvenanceBadge.tsx    # Green/Blue/Yellow tags
│   │   ├── ProvenanceBar.tsx      # Stacked proof breakdown
│   │   └── ShockResult.tsx        # Before/After shock comparison
│   ├── context/
│   │   └── AuthContext.tsx        # Auth state + Demo persona manager
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBriefs.ts
│   │   ├── useEvidence.ts
│   │   ├── useObligations.ts
│   │   └── useShockSim.ts
│   ├── lib/
│   │   ├── classifier.ts          # Rule-based transaction extraction
│   │   ├── computations.ts        # Financial math & full traceability
│   │   ├── demoData.ts            # Synthetic profiles & seed records
│   │   ├── i18n.tsx               # English & Hindi translation engine
│   │   ├── ocr.ts                 # Tesseract.js wrapper
│   │   ├── offlineQueue.ts        # IndexedDB queue & auto-sync
│   │   ├── pdfGenerator.tsx       # PDF export document
│   │   └── supabase.ts            # Supabase client initialization
│   ├── pages/
│   │   ├── CashFlowMap.tsx        # Screen 3: Cash Flow Map
│   │   ├── EvidenceLocker.tsx     # Screen 2: Scanned receipts & logs
│   │   ├── Login.tsx              # Auth & 1-Click demo accounts
│   │   ├── MyShares.tsx           # Manage & revoke active briefs
│   │   ├── Onboarding.tsx         # Screen 1: Language, Rhythm & Goals
│   │   ├── Passport.tsx           # Screen 5: Financial Continuity Passport
│   │   ├── PublicBrief.tsx        # Public read-only token view
│   │   ├── ShareBrief.tsx         # Screen 6: Generate share link & PDF
│   │   └── ShockSimulator.tsx     # Screen 4: Liquidity stress test
│   ├── types/
│   │   └── database.ts            # TypeScript interfaces
│   ├── App.tsx                    # Route definitions
│   ├── index.css                  # Tailwind tokens & glassmorphism
│   ├── main.tsx                   # Entry point
│   └── sw-register.ts             # Service Worker registration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                    # SPA redirects for Vercel
└── vite.config.ts                 # Vite + PWA config
```

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js (v18+) & npm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/shaikashfia5/Tejas.git
cd Tejas/tejas-app

# Install dependencies
npm install
```

### 3. Environment Setup (Optional for Supabase)
The app runs out-of-the-box in demo mode. To connect your live Supabase project:
1. Create a free project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`.
3. Copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Deployment (Vercel)

The repository includes `vercel.json` for single-page app rewrites:
```bash
# Deploy with Vercel CLI
npx vercel
```
Or import the repository directly in the [Vercel Dashboard](https://vercel.com).
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables if using remote Supabase.

---

## 📜 License
MIT License • Built for Hackathon 2026.
