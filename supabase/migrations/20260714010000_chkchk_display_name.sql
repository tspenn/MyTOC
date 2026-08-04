-- Add display_name to user roles
ALTER TABLE public.chkchk_user_roles
  ADD COLUMN IF NOT EXISTS display_name text;

-- RPC: get display names for a list of user IDs
-- Falls back to email prefix when display_name is not set
CREATE OR REPLACE FUNCTION public.chkchk_get_display_names(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    u.id                                                        AS user_id,
    COALESCE(
      NULLIF(TRIM(r.display_name), ''),
      SPLIT_PART(u.email, '@', 1)
    )                                                           AS name
  FROM auth.users u
  LEFT JOIN public.chkchk_user_roles r ON r.user_id = u.id
  WHERE u.id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_display_names(uuid[]) TO authenticated;

-- Update chkchk_get_my_role to also return display_name
CREATE OR REPLACE FUNCTION public.chkchk_get_my_role()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'role',         r.role,
    'display_name', COALESCE(NULLIF(TRIM(r.display_name), ''), SPLIT_PART(u.email, '@', 1))
  )
  FROM public.chkchk_user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_my_role() TO authenticated;
