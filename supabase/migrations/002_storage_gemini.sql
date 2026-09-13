-- Migration 002: Storage + Gemini hardening + image_url
-- Run in Supabase SQL Editor after 001_initial_schema.sql

-- 1. Add image_url + parsed_meta to evidence_records
ALTER TABLE public.evidence_records
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS parsed_meta JSONB;

-- 2. Create private bucket for receipt images (via storage API)
-- Note: create bucket from dashboard or via: insert into storage.buckets (id, name, public) values ('evidence-images','evidence-images', false);
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-images', 'evidence-images', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies (owner-only)
-- Allow authenticated users to upload/list their own folder
CREATE POLICY "Users can upload own evidence images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own evidence images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own evidence images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidence-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Harden briefs: keep existing policies, add view audit table
CREATE TABLE IF NOT EXISTS public.brief_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL REFERENCES public.briefs(share_token) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);
ALTER TABLE public.brief_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their brief views"
  ON public.brief_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.briefs b WHERE b.share_token = brief_views.share_token AND b.user_id = auth.uid())
  );
-- Edge function will insert via service_role bypassing RLS

-- 5. Optional: allow te language (UI now supports hi/en, keep te for future)
-- Already in check constraint en/hi/te — no change needed
