-- Shared Lead teams, co-lead invites, and private lead notes on orders.

-- ---------------------------------------------------------------------------
-- Teams (one workspace per subscription household)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chkchk_teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_code       text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chkchk_teams_primary_user_idx
  ON public.chkchk_teams (primary_user_id);

CREATE TABLE IF NOT EXISTS public.chkchk_team_leads (
  team_id     uuid NOT NULL REFERENCES public.chkchk_teams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS chkchk_team_leads_team_idx
  ON public.chkchk_team_leads (team_id);

ALTER TABLE public.chkchk_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chkchk_team_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_leads_read_own_team"
  ON public.chkchk_teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chkchk_team_leads tl
      WHERE tl.team_id = chkchk_teams.id AND tl.user_id = auth.uid()
    )
  );

CREATE POLICY "team_leads_read_roster"
  ON public.chkchk_team_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chkchk_team_leads mine
      WHERE mine.team_id = chkchk_team_leads.team_id AND mine.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.chkchk_teams TO authenticated;
GRANT SELECT ON public.chkchk_team_leads TO authenticated;

-- Co-lead email invites (primary Lead copies link — no Twilio)
CREATE TABLE IF NOT EXISTS public.chkchk_co_lead_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.chkchk_teams(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (team_id, email)
);

ALTER TABLE public.chkchk_co_lead_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_lead_invites_team_leads_read"
  ON public.chkchk_co_lead_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chkchk_team_leads tl
      WHERE tl.team_id = chkchk_co_lead_invites.team_id AND tl.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.chkchk_co_lead_invites TO authenticated;

-- Private lead notes (Leads only — not visible to team members)
CREATE TABLE IF NOT EXISTS public.chkchk_lead_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  uuid NOT NULL REFERENCES public.chkchk_checklists(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text          text NOT NULL CHECK (char_length(trim(text)) > 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chkchk_lead_notes_checklist_idx
  ON public.chkchk_lead_notes (checklist_id);

ALTER TABLE public.chkchk_lead_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.chkchk_lead_notes TO authenticated;

-- Link orders and roster slots to teams
ALTER TABLE public.chkchk_checklists
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.chkchk_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chkchk_checklists_team_id_idx
  ON public.chkchk_checklists (team_id);

ALTER TABLE public.chkchk_team_slots
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.chkchk_teams(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.chkchk_get_user_team_id(p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.chkchk_team_leads WHERE user_id = p_user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_user_team_id(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_is_team_lead(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chkchk_team_leads WHERE user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_is_team_lead(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_team_id_for_checklist(p_checklist_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.chkchk_checklists WHERE id = p_checklist_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_team_id_for_checklist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_is_team_lead_for_checklist(
  p_checklist_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chkchk_checklists c
    JOIN public.chkchk_team_leads tl ON tl.team_id = c.team_id
    WHERE c.id = p_checklist_id
      AND tl.user_id = p_user_id
      AND c.team_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_is_team_lead_for_checklist(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_can_manage_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.chkchk_is_team_lead_for_checklist(target_checklist_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chkchk_checklists c
    WHERE c.id = target_checklist_id AND c.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.chkchk_can_manage_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chkchk_can_manage_checklist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_generate_lead_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_tries int := 0;
BEGIN
  LOOP
    v_tries := v_tries + 1;
    IF v_tries > 100 THEN
      RAISE EXCEPTION 'Could not generate Lead ID';
    END IF;
    v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.chkchk_teams WHERE lead_code = v_code
    ) AND NOT EXISTS (
      SELECT 1 FROM public.chkchk_user_roles WHERE boss_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_ensure_team_for_lead()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_team_id uuid;
  v_code text;
BEGIN
  SELECT role INTO v_role FROM public.chkchk_user_roles WHERE user_id = v_user;
  IF v_role IS DISTINCT FROM 'assigner' THEN
    RAISE EXCEPTION 'Only Lead accounts belong to a team workspace';
  END IF;

  SELECT team_id INTO v_team_id FROM public.chkchk_team_leads WHERE user_id = v_user;
  IF v_team_id IS NOT NULL THEN
    RETURN v_team_id;
  END IF;

  SELECT boss_code INTO v_code FROM public.chkchk_user_roles WHERE user_id = v_user;

  INSERT INTO public.chkchk_teams (primary_user_id, lead_code)
  VALUES (v_user, COALESCE(v_code, public.chkchk_generate_lead_code()))
  RETURNING id, lead_code INTO v_team_id, v_code;

  INSERT INTO public.chkchk_team_leads (team_id, user_id, is_primary)
  VALUES (v_team_id, v_user, true);

  UPDATE public.chkchk_user_roles SET boss_code = v_code WHERE user_id = v_user;

  UPDATE public.chkchk_checklists
  SET team_id = v_team_id
  WHERE user_id = v_user AND team_id IS NULL;

  UPDATE public.chkchk_team_slots
  SET team_id = v_team_id
  WHERE boss_user_id = v_user AND team_id IS NULL;

  RETURN v_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_ensure_team_for_lead() TO authenticated;

-- Patch shared access helpers
CREATE OR REPLACE FUNCTION public.chkchk_can_view_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.chkchk_is_team_lead_for_checklist(target_checklist_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chkchk_checklists c
    WHERE c.id = target_checklist_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.chkchk_collaborators col
    WHERE col.checklist_id = target_checklist_id AND col.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.chkchk_can_edit_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.chkchk_is_team_lead_for_checklist(target_checklist_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chkchk_checklists c
    WHERE c.id = target_checklist_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.chkchk_collaborators col
    WHERE col.checklist_id = target_checklist_id
      AND col.user_id = auth.uid()
      AND col.role = 'editor'
  );
$$;

CREATE OR REPLACE FUNCTION public.chkchk_owns_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.chkchk_can_manage_checklist(target_checklist_id);
$$;

-- Lead notes RLS
CREATE POLICY "lead_notes_team_leads_select"
  ON public.chkchk_lead_notes FOR SELECT
  TO authenticated
  USING (public.chkchk_is_team_lead_for_checklist(checklist_id, auth.uid()));

CREATE POLICY "lead_notes_team_leads_insert"
  ON public.chkchk_lead_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.chkchk_is_team_lead_for_checklist(checklist_id, auth.uid())
  );

-- Checklist policies: team leads manage team orders
DROP POLICY IF EXISTS "chkchk_checklists_update" ON public.chkchk_checklists;
CREATE POLICY "chkchk_checklists_update"
  ON public.chkchk_checklists FOR UPDATE
  TO authenticated
  USING (public.chkchk_can_manage_checklist(id))
  WITH CHECK (public.chkchk_can_manage_checklist(id));

DROP POLICY IF EXISTS "chkchk_checklists_delete" ON public.chkchk_checklists;
CREATE POLICY "chkchk_checklists_delete"
  ON public.chkchk_checklists FOR DELETE
  TO authenticated
  USING (public.chkchk_can_manage_checklist(id));

-- Auto-set team_id when a Lead creates an order
CREATE OR REPLACE FUNCTION public.chkchk_checklists_set_team_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    NEW.team_id := public.chkchk_get_user_team_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chkchk_checklists_set_team_id_trg ON public.chkchk_checklists;
CREATE TRIGGER chkchk_checklists_set_team_id_trg
  BEFORE INSERT ON public.chkchk_checklists
  FOR EACH ROW EXECUTE FUNCTION public.chkchk_checklists_set_team_id();

-- Confirm / reject: any team Lead on the order
CREATE OR REPLACE FUNCTION public.chkchk_confirm_card(p_checklist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chkchk_can_manage_checklist(p_checklist_id) THEN
    RAISE EXCEPTION 'Not authorized to confirm this order';
  END IF;

  UPDATE public.chkchk_checklists
  SET status = 'archived', updated_at = now()
  WHERE id = p_checklist_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_reject_card(p_checklist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chkchk_can_manage_checklist(p_checklist_id) THEN
    RAISE EXCEPTION 'Not authorized to reject this order';
  END IF;

  UPDATE public.chkchk_checklists
  SET status = 'active', updated_at = now()
  WHERE id = p_checklist_id;
END;
$$;

-- Lead notes RPCs
CREATE OR REPLACE FUNCTION public.chkchk_list_lead_notes(p_checklist_id uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', n.id,
      'checklist_id', n.checklist_id,
      'user_id', n.user_id,
      'text', n.text,
      'created_at', n.created_at
    ) ORDER BY n.created_at ASC
  ), '[]'::json)
  FROM public.chkchk_lead_notes n
  WHERE n.checklist_id = p_checklist_id
    AND public.chkchk_is_team_lead_for_checklist(p_checklist_id, auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_list_lead_notes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_add_lead_note(p_checklist_id uuid, p_text text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.chkchk_lead_notes;
BEGIN
  IF NOT public.chkchk_is_team_lead_for_checklist(p_checklist_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only team Leads can add lead notes';
  END IF;
  IF NULLIF(trim(p_text), '') IS NULL THEN
    RAISE EXCEPTION 'Note text is required';
  END IF;

  INSERT INTO public.chkchk_lead_notes (checklist_id, user_id, text)
  VALUES (p_checklist_id, auth.uid(), trim(p_text))
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'checklist_id', v_row.checklist_id,
    'user_id', v_row.user_id,
    'text', v_row.text,
    'created_at', v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_add_lead_note(uuid, text) TO authenticated;

-- Team dashboard checklists
CREATE OR REPLACE FUNCTION public.chkchk_get_team_checklists()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(row ORDER BY row.updated_at DESC), '[]'::json)
  FROM (
    SELECT
      c.id,
      c.user_id,
      c.team_id,
      c.title,
      c.description,
      c.status,
      c.current_item_id,
      c.created_at,
      c.updated_at,
      (SELECT count(*)::int FROM public.chkchk_items i WHERE i.checklist_id = c.id) AS item_count
    FROM public.chkchk_checklists c
    WHERE c.team_id = public.chkchk_get_user_team_id(auth.uid())
  ) row;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_team_checklists() TO authenticated;

-- Co-lead invite + accept
CREATE OR REPLACE FUNCTION public.chkchk_max_team_leads(p_team_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE COALESCE(s.plan_tier, 'captain')
    WHEN 'coach' THEN 2
    WHEN 'admin' THEN 2
    ELSE 1
  END
  FROM public.chkchk_teams t
  LEFT JOIN public.chkchk_subscriptions s ON s.user_id = t.primary_user_id
  WHERE t.id = p_team_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_invite_co_lead(p_email text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
  v_is_primary boolean;
  v_count int;
  v_max int;
  v_token text;
  v_invite public.chkchk_co_lead_invites;
BEGIN
  SELECT tl.team_id, tl.is_primary INTO v_team_id, v_is_primary
  FROM public.chkchk_team_leads tl
  WHERE tl.user_id = auth.uid();

  IF v_team_id IS NULL OR NOT v_is_primary THEN
    RAISE EXCEPTION 'Only the primary Lead can invite co-Leads';
  END IF;

  IF NULLIF(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT count(*) INTO v_count FROM public.chkchk_team_leads WHERE team_id = v_team_id;
  v_max := public.chkchk_max_team_leads(v_team_id);
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Lead seat limit reached for your plan';
  END IF;

  INSERT INTO public.chkchk_co_lead_invites (team_id, email, invited_by)
  VALUES (v_team_id, lower(trim(p_email)), auth.uid())
  ON CONFLICT (team_id, email) DO UPDATE
  SET token = encode(gen_random_bytes(16), 'hex'),
      created_at = now(),
      accepted_at = NULL,
      accepted_by = NULL
  RETURNING * INTO v_invite;

  RETURN json_build_object(
    'id', v_invite.id,
    'email', v_invite.email,
    'token', v_invite.token,
    'created_at', v_invite.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_invite_co_lead(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_validate_co_lead_invite(p_token text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'valid', true,
    'email', i.email,
    'team_id', i.team_id
  )
  FROM public.chkchk_co_lead_invites i
  WHERE i.token = trim(p_token)
    AND i.accepted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_validate_co_lead_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_accept_co_lead_invite(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.chkchk_co_lead_invites;
  v_count int;
  v_max int;
  v_name text;
BEGIN
  SELECT * INTO v_invite
  FROM public.chkchk_co_lead_invites
  WHERE token = trim(p_token) AND accepted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  IF EXISTS (SELECT 1 FROM public.chkchk_team_leads WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already on a Lead team';
  END IF;

  SELECT count(*) INTO v_count FROM public.chkchk_team_leads WHERE team_id = v_invite.team_id;
  v_max := public.chkchk_max_team_leads(v_invite.team_id);
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'This team has no open Lead seats';
  END IF;

  SELECT COALESCE(NULLIF(trim(display_name), ''), split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.chkchk_user_roles r ON r.user_id = u.id
  WHERE u.id = auth.uid();

  INSERT INTO public.chkchk_user_roles (user_id, role, display_name)
  VALUES (auth.uid(), 'assigner', v_name)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'assigner', display_name = COALESCE(EXCLUDED.display_name, chkchk_user_roles.display_name);

  INSERT INTO public.chkchk_team_leads (team_id, user_id, is_primary)
  VALUES (v_invite.team_id, auth.uid(), false);

  UPDATE public.chkchk_co_lead_invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN json_build_object('team_id', v_invite.team_id, 'ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_accept_co_lead_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_list_team_leads()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', tl.user_id,
      'display_name', COALESCE(NULLIF(trim(r.display_name), ''), split_part(u.email, '@', 1)),
      'is_primary', tl.is_primary,
      'joined_at', tl.joined_at
    ) ORDER BY tl.is_primary DESC, tl.joined_at ASC
  ), '[]'::json)
  FROM public.chkchk_team_leads tl
  JOIN auth.users u ON u.id = tl.user_id
  LEFT JOIN public.chkchk_user_roles r ON r.user_id = tl.user_id
  WHERE tl.team_id = public.chkchk_get_user_team_id(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_list_team_leads() TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_list_co_lead_invites()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', i.id,
      'email', i.email,
      'token', i.token,
      'created_at', i.created_at
    ) ORDER BY i.created_at DESC
  ), '[]'::json)
  FROM public.chkchk_co_lead_invites i
  WHERE i.team_id = public.chkchk_get_user_team_id(auth.uid())
    AND i.accepted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.chkchk_team_leads tl
      WHERE tl.team_id = i.team_id AND tl.user_id = auth.uid() AND tl.is_primary
    );
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_list_co_lead_invites() TO authenticated;

-- Patch team slot + lead code RPCs to use team workspace
CREATE OR REPLACE FUNCTION public.chkchk_ensure_boss_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
  v_code text;
BEGIN
  v_team_id := public.chkchk_ensure_team_for_lead();
  SELECT lead_code INTO v_code FROM public.chkchk_teams WHERE id = v_team_id;
  UPDATE public.chkchk_user_roles SET boss_code = v_code WHERE user_id = auth.uid();
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_create_team_slot(p_display_name text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
  v_num text;
  v_tries int := 0;
  v_row public.chkchk_team_slots;
BEGIN
  IF NOT public.chkchk_is_team_lead(auth.uid()) THEN
    RAISE EXCEPTION 'Only Lead accounts can add team members';
  END IF;

  v_team_id := public.chkchk_ensure_team_for_lead();
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
      WHERE team_id = v_team_id AND worker_number = v_num
    );
  END LOOP;

  INSERT INTO public.chkchk_team_slots (boss_user_id, team_id, worker_number, display_name)
  VALUES (auth.uid(), v_team_id, v_num, trim(p_display_name))
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'worker_number', v_row.worker_number,
    'display_name', v_row.display_name,
    'status', v_row.status
  );
END;
$$;

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
  WHERE s.team_id = public.chkchk_get_user_team_id(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.chkchk_validate_team_slot(p_boss_code text, p_worker_number text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object('valid', true, 'display_name', s.display_name)
  FROM public.chkchk_team_slots s
  JOIN public.chkchk_teams t ON t.id = s.team_id
  WHERE t.lead_code = trim(p_boss_code)
    AND s.worker_number = trim(p_worker_number)
    AND s.status = 'pending'
    AND s.user_id IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_lookup_boss_by_code(p_boss_code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT primary_user_id
  FROM public.chkchk_teams
  WHERE lead_code = trim(p_boss_code)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.chkchk_claim_team_slot(
  p_boss_code text,
  p_worker_number text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
  v_boss uuid;
  v_row public.chkchk_team_slots;
BEGIN
  SELECT id, primary_user_id INTO v_team_id, v_boss
  FROM public.chkchk_teams
  WHERE lead_code = trim(p_boss_code)
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Lead ID';
  END IF;

  SELECT * INTO v_row
  FROM public.chkchk_team_slots
  WHERE team_id = v_team_id
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

CREATE OR REPLACE FUNCTION public.chkchk_invite_roster_member(
  p_checklist_id uuid,
  p_slot_id uuid,
  p_role text DEFAULT 'assignee'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member uuid;
BEGIN
  IF NOT public.chkchk_can_manage_checklist(p_checklist_id) THEN
    RAISE EXCEPTION 'Not authorized for this order';
  END IF;

  SELECT s.user_id INTO v_member
  FROM public.chkchk_team_slots s
  JOIN public.chkchk_checklists c ON c.id = p_checklist_id
  WHERE s.id = p_slot_id
    AND s.team_id = c.team_id
    AND s.status = 'active'
    AND s.user_id IS NOT NULL;

  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Team member not found or not signed up yet';
  END IF;

  INSERT INTO public.chkchk_collaborators (checklist_id, user_id, role)
  VALUES (p_checklist_id, v_member, p_role)
  ON CONFLICT DO NOTHING;

  RETURN v_member;
END;
$$;

-- Extend get_my_role with team context
DROP FUNCTION IF EXISTS public.chkchk_get_my_role();

CREATE OR REPLACE FUNCTION public.chkchk_get_my_role()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'role', r.role,
    'display_name', COALESCE(NULLIF(TRIM(r.display_name), ''), SPLIT_PART(u.email, '@', 1)),
    'is_available', COALESCE(r.is_available, true),
    'boss_code', COALESCE(t.lead_code, r.boss_code),
    'worker_number', (
      SELECT s.worker_number
      FROM public.chkchk_team_slots s
      WHERE s.user_id = r.user_id AND s.status = 'active'
      LIMIT 1
    ),
    'team_id', tl.team_id,
    'is_primary_lead', COALESCE(tl.is_primary, false)
  )
  FROM public.chkchk_user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.chkchk_team_leads tl ON tl.user_id = r.user_id
  LEFT JOIN public.chkchk_teams t ON t.id = tl.team_id
  WHERE r.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_get_my_role() TO authenticated;

-- Team slots RLS: any team Lead manages team roster
DROP POLICY IF EXISTS "boss_manage_team_slots" ON public.chkchk_team_slots;
CREATE POLICY "team_leads_manage_team_slots"
  ON public.chkchk_team_slots FOR ALL
  TO authenticated
  USING (
    team_id = public.chkchk_get_user_team_id(auth.uid())
    OR boss_user_id = auth.uid()
  )
  WITH CHECK (
    team_id = public.chkchk_get_user_team_id(auth.uid())
    OR boss_user_id = auth.uid()
  );

-- Back-fill teams for existing Leads
DO $$
DECLARE
  r record;
  v_team_id uuid;
  v_code text;
BEGIN
  FOR r IN
    SELECT user_id, boss_code
    FROM public.chkchk_user_roles
    WHERE role = 'assigner'
      AND user_id NOT IN (SELECT user_id FROM public.chkchk_team_leads)
  LOOP
    v_code := COALESCE(r.boss_code, public.chkchk_generate_lead_code());

    INSERT INTO public.chkchk_teams (primary_user_id, lead_code)
    VALUES (r.user_id, v_code)
    RETURNING id INTO v_team_id;

    INSERT INTO public.chkchk_team_leads (team_id, user_id, is_primary)
    VALUES (v_team_id, r.user_id, true);

    UPDATE public.chkchk_user_roles SET boss_code = v_code WHERE user_id = r.user_id;

    UPDATE public.chkchk_checklists SET team_id = v_team_id
    WHERE user_id = r.user_id AND team_id IS NULL;

    UPDATE public.chkchk_team_slots SET team_id = v_team_id
    WHERE boss_user_id = r.user_id AND team_id IS NULL;
  END LOOP;
END;
$$;
