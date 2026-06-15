-- Async Tally mapping jobs (written by Edge Functions via service role)
CREATE TABLE IF NOT EXISTS public.mapping_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'done', 'error')),
  message TEXT,
  payload JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX IF NOT EXISTS mapping_jobs_expires_at_idx
  ON public.mapping_jobs (expires_at);

ALTER TABLE public.mapping_jobs ENABLE ROW LEVEL SECURITY;

-- No RLS policies: client access is via Edge Functions only (service role).
