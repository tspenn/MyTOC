-- Add trial tracking to user roles
ALTER TABLE public.chkchk_user_roles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now();

-- Back-fill existing rows so they don't instantly expire
UPDATE public.chkchk_user_roles
  SET trial_started_at = now()
  WHERE trial_started_at IS NULL;

-- RPC: get trial status for the current user
CREATE OR REPLACE FUNCTION public.chkchk_get_trial_status()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'trial_started_at', trial_started_at,
    'days_remaining',   GREATEST(0, 14 - EXTRACT(DAY FROM now() - trial_started_at)::int),
    'is_expired',       (now() - trial_started_at) > INTERVAL '14 days'
  )
  FROM public.chkchk_user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_trial_status() TO authenticated;
