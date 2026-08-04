-- Boss code + Team member slots (no-email signup for kids / field workers)

ALTER TABLE public.chkchk_user_roles
  ADD COLUMN IF NOT EXISTS boss_code text;

CREATE UNIQUE INDEX IF NOT EXISTS chkchk_user_roles_boss_code_unique
  ON public.chkchk_user_roles (boss_code)
  WHERE boss_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.chkchk_team_slots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_number  text NOT NULL,
  display_name   text NOT NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'active')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boss_user_id, worker_number)
);

CREATE INDEX IF NOT EXISTS chkchk_team_slots_boss_idx
  ON public.chkchk_team_slots (boss_user_id);

ALTER TABLE public.chkchk_team_slots ENABLE ROW LEVEL SECURITY;

-- Boss manages own roster
CREATE POLICY "boss_manage_team_slots"
  ON public.chkchk_team_slots FOR ALL
  TO authenticated
  USING (boss_user_id = auth.uid())
  WITH CHECK (boss_user_id = auth.uid());

-- Team member can read own slot
CREATE POLICY "member_read_own_slot"
  ON public.chkchk_team_slots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chkchk_team_slots TO authenticated;

-- Generate a unique 4-digit Boss ID
CREATE OR REPLACE FUNCTION public.chkchk_generate_boss_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_tries int := 0;
BEGIN
  LOOP
    v_tries := v_tries + 1;
    IF v_tries > 100 THEN
      RAISE EXCEPTION 'Could not generate Boss ID';
    END IF;
    v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.chkchk_user_roles WHERE boss_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

-- Ensure Boss has a code (call after Boss signup)
CREATE OR REPLACE FUNCTION public.chkchk_ensure_boss_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_code text;
BEGIN
  SELECT role, boss_code INTO v_role, v_code
  FROM public.chkchk_user_roles
  WHERE user_id = auth.uid();

  IF v_role IS DISTINCT FROM 'assigner' THEN
    RAISE EXCEPTION 'Only Boss accounts have a Boss ID';
  END IF;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  v_code := public.chkchk_generate_boss_code();
  UPDATE public.chkchk_user_roles
  SET boss_code = v_code
  WHERE user_id = auth.uid();

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_ensure_boss_code() TO authenticated;

-- Boss adds a team member slot → returns worker number
CREATE OR REPLACE FUNCTION public.chkchk_create_team_slot(p_display_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_boss uuid := auth.uid();
  v_num text;
  v_tries int := 0;
  v_row public.chkchk_team_slots;
BEGIN
  SELECT role INTO v_role FROM public.chkchk_user_roles WHERE user_id = v_boss;
  IF v_role IS DISTINCT FROM 'assigner' THEN
    RAISE EXCEPTION 'Only Boss accounts can add team members';
  END IF;

  PERFORM public.chkchk_ensure_boss_code();

  IF NULLIF(trim(p_display_name), '') IS NULL THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  LOOP
    v_tries := v_tries + 1;
    IF v_tries > 100 THEN
      RAISE EXCEPTION 'Could not generate worker number';
    END IF;
    v_num := lpad((floor(random() * 9000000) + 1000000)::int::text, 7, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.chkchk_team_slots
      WHERE boss_user_id = v_boss AND worker_number = v_num
    );
  END LOOP;

  INSERT INTO public.chkchk_team_slots (boss_user_id, worker_number, display_name)
  VALUES (v_boss, v_num, trim(p_display_name))
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'worker_number', v_row.worker_number,
    'display_name', v_row.display_name,
    'status', v_row.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_create_team_slot(text) TO authenticated;

-- Boss lists roster
CREATE OR REPLACE FUNCTION public.chkchk_list_team_slots()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', s.id,
      'worker_number', s.worker_number,
      'display_name', s.display_name,
      'user_id', s.user_id,
      'status', s.status,
      'created_at', s.created_at
    ) ORDER BY s.created_at DESC
  ), '[]'::json)
  FROM public.chkchk_team_slots s
  WHERE s.boss_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_list_team_slots() TO authenticated;

-- Validate slot before signup (anon OK)
CREATE OR REPLACE FUNCTION public.chkchk_validate_team_slot(
  p_boss_code text,
  p_worker_number text
)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'valid', true,
    'display_name', s.display_name
  )
  FROM public.chkchk_team_slots s
  JOIN public.chkchk_user_roles r ON r.user_id = s.boss_user_id
  WHERE r.boss_code = trim(p_boss_code)
    AND s.worker_number = trim(p_worker_number)
    AND s.status = 'pending'
    AND s.user_id IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_validate_team_slot(text, text) TO anon, authenticated;

-- Lookup boss user id by code (for edge function)
CREATE OR REPLACE FUNCTION public.chkchk_lookup_boss_by_code(p_boss_code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id
  FROM public.chkchk_user_roles
  WHERE boss_code = trim(p_boss_code)
    AND role = 'assigner'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.chkchk_lookup_boss_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chkchk_lookup_boss_by_code(text) TO service_role;

-- Claim slot after auth user created (service role from edge function)
CREATE OR REPLACE FUNCTION public.chkchk_claim_team_slot(
  p_boss_code text,
  p_worker_number text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_boss uuid;
  v_row public.chkchk_team_slots;
BEGIN
  v_boss := public.chkchk_lookup_boss_by_code(p_boss_code);
  IF v_boss IS NULL THEN
    RAISE EXCEPTION 'Invalid Boss ID';
  END IF;

  SELECT * INTO v_row
  FROM public.chkchk_team_slots
  WHERE boss_user_id = v_boss
    AND worker_number = trim(p_worker_number)
    AND status = 'pending'
    AND user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already claimed worker number';
  END IF;

  UPDATE public.chkchk_team_slots
  SET user_id = p_user_id, status = 'active'
  WHERE id = v_row.id;

  INSERT INTO public.chkchk_user_roles (user_id, role, display_name)
  VALUES (p_user_id, 'assignee', v_row.display_name)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'assignee', display_name = EXCLUDED.display_name;

  RETURN json_build_object(
    'display_name', v_row.display_name,
    'worker_number', v_row.worker_number,
    'boss_code', trim(p_boss_code)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chkchk_claim_team_slot(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chkchk_claim_team_slot(text, text, uuid) TO service_role;

-- Lookup team member by boss code + worker number (for login display)
CREATE OR REPLACE FUNCTION public.chkchk_lookup_user_by_team_credentials(
  p_boss_code text,
  p_worker_number text
)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id
  FROM public.chkchk_team_slots s
  JOIN public.chkchk_user_roles r ON r.user_id = s.boss_user_id
  WHERE r.boss_code = trim(p_boss_code)
    AND s.worker_number = trim(p_worker_number)
    AND s.status = 'active'
    AND s.user_id IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_lookup_user_by_team_credentials(text, text) TO authenticated;

-- Invite collaborator by user id (Boss roster)
CREATE OR REPLACE FUNCTION public.chkchk_invite_roster_member(
  p_checklist_id uuid,
  p_slot_id uuid,
  p_role text DEFAULT 'assignee'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_member uuid;
  v_collab_id uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.chkchk_checklists
  WHERE id = p_checklist_id;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not the order owner';
  END IF;

  SELECT s.user_id INTO v_member
  FROM public.chkchk_team_slots s
  WHERE s.id = p_slot_id
    AND s.boss_user_id = auth.uid()
    AND s.status = 'active'
    AND s.user_id IS NOT NULL;

  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Team member not found or not signed up yet';
  END IF;

  INSERT INTO public.chkchk_collaborators (checklist_id, user_id, role)
  VALUES (p_checklist_id, v_member, p_role)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_collab_id;

  IF v_collab_id IS NULL THEN
    SELECT id INTO v_collab_id
    FROM public.chkchk_collaborators
    WHERE checklist_id = p_checklist_id AND user_id = v_member;
  END IF;

  RETURN v_member;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_invite_roster_member(uuid, uuid, text) TO authenticated;

-- Update get_my_role to include boss_code
DROP FUNCTION IF EXISTS public.chkchk_get_my_role();

CREATE OR REPLACE FUNCTION public.chkchk_get_my_role()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'role',         r.role,
    'display_name', COALESCE(NULLIF(TRIM(r.display_name), ''), SPLIT_PART(u.email, '@', 1)),
    'is_available', COALESCE(r.is_available, true),
    'boss_code',    r.boss_code,
    'worker_number', (
      SELECT s.worker_number
      FROM public.chkchk_team_slots s
      WHERE s.user_id = r.user_id AND s.status = 'active'
      LIMIT 1
    )
  )
  FROM public.chkchk_user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_my_role() TO authenticated;

-- Back-fill boss codes for existing assigners
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT user_id FROM public.chkchk_user_roles
    WHERE role = 'assigner' AND boss_code IS NULL
  LOOP
    UPDATE public.chkchk_user_roles
    SET boss_code = public.chkchk_generate_boss_code()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;
