-- ═══════════════════════════════════════════════════════════════════════════
-- 004_command.sql — Tejas Command (institution-facing targeting & governance)
--
-- Adds:
--   1. profiles.role            ('field_agent' | 'admin')
--   2. pmjdy_segments           PMJDY dormancy counts per village/block segment
--   3. fi_index_scores          RBI FI-Index access vs usage per district
--   4. pmjdy_segment_snapshots  monthly dormancy history per segment (trend)
--   5. priority_scores          computed targeting score + dominant driver
--   6. outreach_log             BC agent actions & outcomes (accountability)
--
--   + is_admin() helper, admin email allowlist trigger,
--     recompute_priority_scores() server-side function, RLS on everything,
--     and SYNTHETIC seed data (clearly marked — NOT sourced from any
--     government system; demo data only).
-- ═══════════════════════════════════════════════════════════════════════════

/* ── 1. Role on existing profiles ─────────────────────────────────────────── */

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'field_agent'
  CHECK (role IN ('field_agent', 'admin'));

/* ── 2. Admin allowlist + promotion trigger ───────────────────────────────── */
-- Insert the emails that should become Tejas Command admins on signup:
--   INSERT INTO public.admin_allowlist (email) VALUES ('you@example.com');

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage allowlist" ON public.admin_allowlist
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.promote_allowlisted_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_promote_admin ON auth.users;
CREATE TRIGGER on_auth_user_promote_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_allowlisted_admin();

/* ── 3. is_admin() helper ─────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

/* ── 4. Core tables ───────────────────────────────────────────────────────── */

-- ⚠ DEMO DATA below: synthetic numbers for the hackathon demo. NOT sourced
-- from PMJDY / DBT Mission / RBI FI-Index / NPCI systems.

CREATE TABLE IF NOT EXISTS public.pmjdy_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  total_accounts INTEGER NOT NULL CHECK (total_accounts >= 0),
  dormant_accounts INTEGER NOT NULL CHECK (dormant_accounts >= 0 AND dormant_accounts <= total_accounts),
  dbt_linked_accounts INTEGER NOT NULL CHECK (dbt_linked_accounts >= 0 AND dbt_linked_accounts <= total_accounts),
  dbt_linked_but_dormant INTEGER NOT NULL CHECK (dbt_linked_but_dormant >= 0 AND dbt_linked_but_dormant <= dbt_linked_accounts),
  aeps_enabled_accounts INTEGER NOT NULL CHECK (aeps_enabled_accounts >= 0 AND aeps_enabled_accounts <= total_accounts),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fi_index_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL UNIQUE,
  fi_index_score NUMERIC(5,2) NOT NULL CHECK (fi_index_score BETWEEN 0 AND 100),
  access_rate NUMERIC(5,2) NOT NULL CHECK (access_rate BETWEEN 0 AND 100),
  usage_rate NUMERIC(5,2) NOT NULL CHECK (usage_rate BETWEEN 0 AND 100),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pmjdy_segment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.pmjdy_segments(id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL,
  total_accounts INTEGER NOT NULL CHECK (total_accounts >= 0),
  dormant_accounts INTEGER NOT NULL CHECK (dormant_accounts >= 0),
  UNIQUE (segment_id, snapshot_month),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.priority_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL UNIQUE REFERENCES public.pmjdy_segments(id) ON DELETE CASCADE,
  computed_score NUMERIC(5,2) NOT NULL CHECK (computed_score BETWEEN 0 AND 100),
  dormancy_rate NUMERIC(5,4) NOT NULL,
  dbt_waste_rate NUMERIC(5,4) NOT NULL,
  access_usage_gap NUMERIC(5,2) NOT NULL,
  primary_driver TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.pmjdy_segments(id) ON DELETE CASCADE,
  bc_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bc_agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('visit', 'call', 'tejas_field_session')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  resulting_status TEXT NOT NULL CHECK (resulting_status IN ('activated', 'no_change', 'follow_up_needed')),
  outcome_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_district ON public.pmjdy_segments(district);
CREATE INDEX IF NOT EXISTS idx_snapshots_segment ON public.pmjdy_segment_snapshots(segment_id, snapshot_month);
CREATE INDEX IF NOT EXISTS idx_outreach_segment ON public.outreach_log(segment_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_priority_score ON public.priority_scores(computed_score DESC);

/* ── 5. RLS ───────────────────────────────────────────────────────────────── */

ALTER TABLE public.pmjdy_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fi_index_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmjdy_segment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (field agents see targets too).
-- Write: admins only.
CREATE POLICY "Authed read segments" ON public.pmjdy_segments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write segments" ON public.pmjdy_segments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Authed read fi_index" ON public.fi_index_scores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write fi_index" ON public.fi_index_scores
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Authed read snapshots" ON public.pmjdy_segment_snapshots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write snapshots" ON public.pmjdy_segment_snapshots
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Authed read priority" ON public.priority_scores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write priority" ON public.priority_scores
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Authed read outreach" ON public.outreach_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents log own outreach" ON public.outreach_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin write outreach" ON public.outreach_log
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

/* ── 6. Server-side priority recompute ────────────────────────────────────── */
-- Equal-thirds weighting: dormancy rate, wasted DBT linkage, access-usage gap.

CREATE OR REPLACE FUNCTION public.recompute_priority_scores()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.priority_scores (
    segment_id, computed_score, dormancy_rate, dbt_waste_rate,
    access_usage_gap, primary_driver, recommended_action
  )
  SELECT
    s.id,
    ROUND(((s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0)) * 100
         + (s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0)) * 100
         + (f.access_rate - f.usage_rate)
        ) / 3, 2),
    ROUND(s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0), 4),
    ROUND(s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0), 4),
    ROUND(f.access_rate - f.usage_rate, 2),
    -- Dominant driver, plain language (mirror of client-side commandEngine)
    CASE
      WHEN (s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0)) >= (s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0))
       AND (s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0)) >= (f.access_rate - f.usage_rate) / 100
        THEN ROUND(s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0) * 100) || '% of DBT-linked accounts here are dormant — prioritize AePS enablement visits'
      WHEN (s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0)) >= (f.access_rate - f.usage_rate) / 100
        THEN ROUND(s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0) * 100) || ' of accounts are fully dormant — schedule a Tejas Field activation session'
      ELSE 'FI-Index shows a ' || ROUND(f.access_rate - f.usage_rate, 1) || ' pt access-usage gap in this district — focus on first-transaction assistance'
    END,
    CASE
      WHEN (s.dbt_linked_but_dormant::numeric / NULLIF(s.dbt_linked_accounts, 0)) >= 0.5
        THEN 'AePS enablement camp + DBT usage walkthrough'
      WHEN (s.dormant_accounts::numeric / NULLIF(s.total_accounts, 0)) >= 0.4
        THEN 'Doorstep activation visit with BC Sakhi'
      ELSE 'First-transaction assistance drive'
    END
  FROM public.pmjdy_segments s
  JOIN public.fi_index_scores f ON f.district = s.district
  ON CONFLICT (segment_id) DO UPDATE SET
    computed_score = EXCLUDED.computed_score,
    dormancy_rate = EXCLUDED.dormancy_rate,
    dbt_waste_rate = EXCLUDED.dbt_waste_rate,
    access_usage_gap = EXCLUDED.access_usage_gap,
    primary_driver = EXCLUDED.primary_driver,
    recommended_action = EXCLUDED.recommended_action,
    computed_at = NOW();
END;
$$;

/* ── 7. SYNTHETIC seed data (DEMO ONLY) ───────────────────────────────────── */

INSERT INTO public.fi_index_scores (district, fi_index_score, access_rate, usage_rate) VALUES
  ('Barabanki',  52.4, 78.3, 41.2),
  ('Sitapur',    48.9, 74.6, 38.1),
  ('Rae Bareli', 55.1, 81.0, 45.7),
  ('Gaya',       44.2, 70.8, 33.9),
  ('Muzaffarpur',50.6, 77.2, 40.5),
  ('Madhubani',  42.8, 68.4, 31.6),
  ('Rewa',       47.3, 73.5, 36.8),
  ('Sidhi',      41.5, 66.9, 30.2),
  ('Chhatarpur', 45.8, 72.1, 34.7)
ON CONFLICT (district) DO NOTHING;

WITH seg AS (
  INSERT INTO public.pmjdy_segments
    (segment_name, district, state, total_accounts, dormant_accounts, dbt_linked_accounts, dbt_linked_but_dormant, aeps_enabled_accounts, last_updated)
  VALUES
    ('Ramnagar Block',    'Barabanki',  'Uttar Pradesh', 18400, 7180, 11250, 6180, 9700,  NOW() - INTERVAL '3 days'),
    ('Sirauli Gauspur',   'Barabanki',  'Uttar Pradesh', 12100, 3690,  6800, 2420, 7300,  NOW() - INTERVAL '3 days'),
    ('Haidargarh Block',  'Sitapur',    'Uttar Pradesh', 15200, 6350,  8900, 5120, 7600,  NOW() - INTERVAL '5 days'),
    ('Shivgarh Block',    'Rae Bareli', 'Uttar Pradesh', 16900, 5210, 10400, 4160, 11200, NOW() - INTERVAL '4 days'),
    ('Banke Bazar Block', 'Gaya',       'Bihar',         13800, 6210,  7300, 5110, 5200,  NOW() - INTERVAL '6 days'),
    ('Imamganj Block',    'Gaya',       'Bihar',         9400,  4100,  4900, 3580, 3400,  NOW() - INTERVAL '6 days'),
    ('Katra Block',       'Muzaffarpur','Bihar',         17600, 5980, 10100, 4340, 9400,  NOW() - INTERVAL '2 days'),
    ('Bochaha Block',     'Muzaffarpur','Bihar',         11300, 4180,  6200, 3350, 5100,  NOW() - INTERVAL '2 days'),
    ('Rajnagar Block',    'Madhubani',  'Bihar',         14700, 6900,  7800, 5700, 4800,  NOW() - INTERVAL '7 days'),
    ('Hanumana Block',    'Rewa',       'Madhya Pradesh',12900, 5420,  7100, 3900, 6300,  NOW() - INTERVAL '3 days'),
    ('Kusmi Block',       'Sidhi',      'Madhya Pradesh',8600,  3960,  4300, 3090, 3500,  NOW() - INTERVAL '8 days'),
    ('Bada Malhera',      'Chhatarpur', 'Madhya Pradesh',10200, 4490,  5600, 3530, 4900,  NOW() - INTERVAL '5 days')
  RETURNING id, dormant_accounts, total_accounts
)
INSERT INTO public.pmjdy_segment_snapshots (segment_id, snapshot_month, total_accounts, dormant_accounts)
SELECT id, (DATE_TRUNC('month', NOW()) - (n || ' months')::interval)::date,
       total_accounts + (n * 120),
       LEAST(dormant_accounts + (n * 260), total_accounts + (n * 120))
FROM seg, generate_series(0, 5) AS n;

SELECT public.recompute_priority_scores();

-- Sample outreach history so the accountability screen is not empty (DEMO).
INSERT INTO public.outreach_log (segment_id, bc_agent_name, action_type, date, resulting_status, outcome_note)
SELECT s.id, a.name, a.action, CURRENT_DATE - a.days_ago, a.status, a.note
FROM public.pmjdy_segments s
JOIN (VALUES
  ('Ramnagar Block',    'Sunita Devi',   'tejas_field_session', 9, 'activated',        'Passport brief generated; first AePS withdrawal done'),
  ('Ramnagar Block',    'Rekha Singh',   'visit',               3, 'follow_up_needed', '2 dormants need Aadhaar-seed fixes'),
  ('Haidargarh Block',  'Sunita Devi',   'call',                6, 'no_change',        'Holder away for harvest season'),
  ('Banke Bazar Block', 'Meena Kumari',  'visit',               8, 'no_change',        'AePS biometric failures reported'),
  ('Rajnagar Block',    'Meena Kumari',  'tejas_field_session', 5, 'activated',        '3 accounts activated during camp')
) AS a(seg_name, name, action, days_ago, status, note) ON a.seg_name = s.segment_name
WHERE NOT EXISTS (SELECT 1 FROM public.outreach_log o WHERE o.segment_id = s.id);
