-- Lead availability toggle (Available / Unavailable)
ALTER TABLE public.chkchk_user_roles
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS public.chkchk_get_my_role();

CREATE OR REPLACE FUNCTION public.chkchk_get_my_role()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'role',         r.role,
    'display_name', COALESCE(NULLIF(TRIM(r.display_name), ''), SPLIT_PART(u.email, '@', 1)),
    'is_available', COALESCE(r.is_available, true)
  )
  FROM public.chkchk_user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_my_role() TO authenticated;
