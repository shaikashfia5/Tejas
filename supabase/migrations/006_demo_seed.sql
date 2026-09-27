-- ═══════════════════════════════════════════════════════════════════════════
-- 006_demo_seed.sql — Demo login accounts for judges/reviewers
--
-- Creates two clearly-labeled demo accounts (fixed password TejasDemo2026!)
-- so reviewers can skip sign-up via the "Try the Demo" buttons on /login:
--
--   • demo.field@tejas.app  → role 'field_agent', onboarded, seeded with
--     7 realistic evidence records + 1 completed shock simulation, so the
--     Passport shows real numbers instead of zeros.
--   • demo.admin@tejas.app  → role 'admin', onboarded, lands on /command
--     with the 12 synthetic Tejas Command segments.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   Requires migrations 001–004 to exist (role column + admin_allowlist).
--   IDEMPOTENT: safe to run again; existing rows are left untouched.
--
-- NOTES:
--   • Runs as `postgres` in the SQL Editor, so it may write to auth.users
--     (RLS and the auth-schema restriction do not apply there).
--   • If the auth.users INSERT fails on your project's GoTrue schema version
--     (a NOT NULL column not covered below), fallback: sign up both demo
--     emails once through the app's normal sign-up form with the same
--     password, then re-run this file — every step below is keyed by email
--     and will still apply correctly.
--   • Password hash uses pgcrypto (enabled by default on Supabase).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

/* ── 1. Admin allowlist FIRST, so the signup trigger auto-promotes ────────── */

INSERT INTO public.admin_allowlist (email)
VALUES ('demo.admin@tejas.app')
ON CONFLICT (email) DO NOTHING;

/* ── 2. Create the two demo auth users (skip if they already exist) ───────── */

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
SELECT
  '00000000-0000-0000-0000-000000000000',  -- default Supabase instance id
  v.id, 'authenticated', 'authenticated', v.email,
  crypt('TejasDemo2026!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name),
  NOW(), NOW(),
  '', '', '', ''
FROM (VALUES
  ('00000000-0000-0000-0000-0000000000f1'::uuid, 'demo.field@tejas.app', 'Demo Field Agent'),
  ('00000000-0000-0000-0000-0000000000a9'::uuid, 'demo.admin@tejas.app', 'Demo Admin')
) AS v(id, email, full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(v.email)
);

/* ── 3. auth.identities rows (email provider linkage) ─────────────────────── */

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', u.id::text,
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE lower(u.email) IN ('demo.field@tejas.app', 'demo.admin@tejas.app')
ON CONFLICT (provider, provider_id) DO NOTHING;

/* ── 4. Profiles: role + onboarded (also covers manually signed-up users) ─── */

INSERT INTO public.profiles (id, full_name, language, income_type, goal, onboarded, role)
SELECT u.id, v.full_name, 'en', 'seasonal', 'crop_input', true, v.role
FROM (VALUES
  ('demo.field@tejas.app', 'Demo Field Agent', 'field_agent'),
  ('demo.admin@tejas.app', 'Demo Admin', 'admin')
) AS v(email, full_name, role)
JOIN auth.users u ON lower(u.email) = v.email
ON CONFLICT (id) DO UPDATE SET
  role      = EXCLUDED.role,
  onboarded = EXCLUDED.onboarded,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

/* ── 5. Seed evidence for the FIELD demo (only if account has none) ───────── */
-- Realistic micro-entrepreneur story (UP-based street vendor + MGNREGA
-- household member): mixed verified/declared provenance, spread over the
-- last ~35 days. Numbers chosen so the Passport computes:
--   buffer ≈ 90 days (Strong) · goal readiness ≈ 75% · proof 5/7 verified.

INSERT INTO public.evidence_records
  (user_id, type, raw_text, amount, direction, category, provenance_label, date, image_url, parsed_meta)
SELECT
  p.id, 'manual', v.raw_text, v.amount, v.direction, v.category,
  v.provenance_label, CURRENT_DATE - v.days_ago, NULL, NULL
FROM (VALUES
  ('MGNREGA wage slip — 6 days worked, Phase 4',          2840.00, 'in',  'wages',            'verified', 12),
  ('Mandi receipt — 3.2 quintal wheat sold @ ₹2,875',     9200.00, 'in',  'crop_sale',        'verified', 34),
  ('Evening stall sales — self-recorded at close',        5500.00, 'in',  'shop_sale',        'declared',  6),
  ('Auto-rickshaw ferry income, station route',           1900.00, 'in',  'transport_income', 'verified', 20),
  ('Monthly ration + cooking supplies',                   4200.00, 'out', 'groceries',        'declared',  9),
  ('SHG loan instalment #7 of 24',                        6800.00, 'out', 'loan_repayment',   'verified', 15),
  ('School tuition — Term 1 fee receipt',                 4750.00, 'out', 'education',        'verified', 27)
) AS v(raw_text, amount, direction, category, provenance_label, days_ago)
JOIN public.profiles p
  ON p.id = (SELECT id FROM auth.users WHERE lower(email) = 'demo.field@tejas.app')
WHERE NOT EXISTS (
  SELECT 1 FROM public.evidence_records e WHERE e.user_id = p.id
);

/* ── 6. One completed shock simulation for the FIELD demo ─────────────────── */
-- Story: a ₹5,000 medical expense was simulated earlier; with the buffer
-- above it was absorbed (no shortfall) — realistic "resilient" outcome.

INSERT INTO public.shock_scenarios
  (user_id, scenario_type, shock_amount, resulting_shortfall_date, resulting_gap_amount)
SELECT
  p.id, 'medical_expense', 5000.00, NULL, 0
FROM public.profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE lower(email) = 'demo.field@tejas.app')
  AND NOT EXISTS (
  SELECT 1 FROM public.shock_scenarios s WHERE s.user_id = p.id
);

/* ── 7. Sanity check (run output shows these grids) ───────────────────────── */

SELECT p.full_name, p.role, p.onboarded, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) IN ('demo.field@tejas.app', 'demo.admin@tejas.app');

SELECT
  (SELECT count(*) FROM public.evidence_records e
    WHERE e.user_id = (SELECT id FROM auth.users WHERE lower(email) = 'demo.field@tejas.app')) AS evidence_count,
  (SELECT count(*) FROM public.shock_scenarios s
    WHERE s.user_id = (SELECT id FROM auth.users WHERE lower(email) = 'demo.field@tejas.app')) AS shock_count;
