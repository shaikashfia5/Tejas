-- Tejas COMBINED Migration: 001 + 002 + 003 (security-hardened)
-- Run this ONE file in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te')),
  income_type TEXT NOT NULL DEFAULT 'seasonal' CHECK (income_type IN ('seasonal', 'project', 'mixed', 'regular-informal')),
  goal TEXT NOT NULL DEFAULT 'crop_input' CHECK (goal IN ('crop_input', 'working_capital', 'emergency_buffer', 'education_fee', 'other')),
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. EVIDENCE RECORDS
CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'manual')),
  raw_text TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  category TEXT NOT NULL CHECK (category IN ('wages','crop_sale','shop_sale','transport_income','remittance','groceries','rent','medical','education','loan_repayment','utility','other')),
  provenance_label TEXT NOT NULL CHECK (provenance_label IN ('verified', 'declared', 'estimated')),
  date DATE NOT NULL,
  image_url TEXT,
  parsed_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own evidence records" ON public.evidence_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. OBLIGATIONS
CREATE TABLE IF NOT EXISTS public.obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own obligations" ON public.obligations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. SHOCK SCENARIOS
CREATE TABLE IF NOT EXISTS public.shock_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('delayed_payment','medical_expense','fee_deadline','supplier_payment')),
  shock_amount NUMERIC(12, 2) NOT NULL,
  resulting_shortfall_date DATE,
  resulting_gap_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.shock_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own shock scenarios" ON public.shock_scenarios FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. BRIEFS (owner-only; public access via RPC)
CREATE TABLE IF NOT EXISTS public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own briefs" ON public.briefs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_user_date ON public.evidence_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_obligations_user_due ON public.obligations(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_briefs_token ON public.briefs(share_token);

-- 6. TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, language, income_type, goal, onboarded)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Tejas Entrepreneur'), COALESCE(NEW.raw_user_meta_data->>'language','en'), COALESCE(NEW.raw_user_meta_data->>'income_type','seasonal'), COALESCE(NEW.raw_user_meta_data->>'goal','crop_input'), false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. STORAGE: private bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-images', 'evidence-images', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload own evidence images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own evidence images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own evidence images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. BRIEF VIEWS audit table
CREATE TABLE IF NOT EXISTS public.brief_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL REFERENCES public.briefs(share_token) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);
ALTER TABLE public.brief_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their brief views" ON public.brief_views FOR SELECT USING (EXISTS (SELECT 1 FROM public.briefs b WHERE b.share_token = brief_views.share_token AND b.user_id = auth.uid()));

-- 9. SECURITY: token-gated public brief access (replaces broken public SELECT policy)
-- NO public SELECT policy on briefs table -- anonymous must use the RPC below.
CREATE OR REPLACE FUNCTION public.get_public_brief(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  SELECT * INTO b FROM public.briefs WHERE share_token = trim(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF b.revoked THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  IF b.expiry_date <= NOW() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  RETURN jsonb_build_object('status', 'ok', 'brief', to_jsonb(b));
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_brief(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_brief(TEXT) TO anon, authenticated;
REVOKE SELECT ON public.briefs FROM anon;
