-- Team Command complimentary / admin tier: allow 3 Leads (matches MyTOC Team Command)
CREATE OR REPLACE FUNCTION public.chkchk_max_team_leads(p_team_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE COALESCE(s.plan_tier, 'captain')
    WHEN 'coach' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'team' THEN 3
    ELSE 1
  END
  FROM public.chkchk_teams t
  LEFT JOIN public.chkchk_subscriptions s ON s.user_id = t.primary_user_id
  WHERE t.id = p_team_id
  LIMIT 1;
$$;
