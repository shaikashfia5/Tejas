-- ==============================================================================
-- Tejas — Migration 003: Security hardening
-- Fixes: public briefs SELECT policy leaked ALL users' briefs to anonymous
-- callers (RLS policy had no token scoping). Briefs are now readable ONLY via
-- the token-gated RPC `get_public_brief(token)`.
-- ==============================================================================

BEGIN;

-- 1. Remove the broken public policy (granted SELECT on every valid brief)
DROP POLICY IF EXISTS "Public can view valid briefs by token" ON public.briefs;

-- 2. Token-gated public access via SECURITY DEFINER function.
--    Returns a status envelope so the client can distinguish
--    not_found / revoked / expired without leaking row existence.
CREATE OR REPLACE FUNCTION public.get_public_brief(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT * INTO b FROM public.briefs WHERE share_token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF b.revoked THEN
    RETURN jsonb_build_object('status', 'revoked');
  END IF;

  IF b.expiry_date <= NOW() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'brief', to_jsonb(b));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_brief(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_brief(TEXT) TO anon, authenticated;

-- 3. Defense in depth: anonymous role must not query the briefs table directly.
--    (Owners keep access through their existing FOR ALL policy from migration 001.)
REVOKE SELECT ON public.briefs FROM anon;

-- 4. brief_views audit table (from migration 002) is written exclusively by the
--    service_role connection (bypasses RLS) — no anonymous insert policy is added.

COMMIT;
