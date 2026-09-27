-- Tejas Migration 005 — Maintenance
-- Nightly purge of expired/revoked share briefs (data minimization, DPDP-2023).
-- Requires the pg_cron extension — on Supabase enable it in
-- Database → Extensions if not already enabled.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Policy: revoked briefs are deleted on the next nightly run;
-- expired briefs are retained 30 days for audit purposes, then purged.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tejas-purge-expired-briefs') THEN
    PERFORM cron.schedule(
      'tejas-purge-expired-briefs',
      '17 3 * * *',
      $cron$DELETE FROM public.briefs WHERE revoked = true OR expiry_date < now() - interval '30 days'$cron$
    );
  END IF;
END
$$;
