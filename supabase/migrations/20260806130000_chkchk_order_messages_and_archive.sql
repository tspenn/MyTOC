-- Order-level messages (no task required) + archive by team Lead

ALTER TABLE public.chkchk_comments
  ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.chkchk_comments
  ADD COLUMN IF NOT EXISTS checklist_id uuid REFERENCES public.chkchk_checklists (id) ON DELETE CASCADE;

UPDATE public.chkchk_comments c
SET checklist_id = i.checklist_id
FROM public.chkchk_items i
WHERE c.item_id = i.id
  AND c.checklist_id IS NULL;

ALTER TABLE public.chkchk_comments
  DROP CONSTRAINT IF EXISTS chkchk_comments_target_check;

ALTER TABLE public.chkchk_comments
  ADD CONSTRAINT chkchk_comments_target_check
  CHECK (item_id IS NOT NULL OR checklist_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS chkchk_comments_checklist_id_idx
  ON public.chkchk_comments (checklist_id);

-- Leads on the shared team can interact (message / archive)
CREATE OR REPLACE FUNCTION public.chkchk_can_interact_with_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.chkchk_can_edit_checklist(target_checklist_id)
    OR EXISTS (
      SELECT 1 FROM public.chkchk_collaborators
      WHERE checklist_id = target_checklist_id
        AND user_id = auth.uid()
        AND role IN ('editor', 'assignee')
    );
$$;

DROP POLICY IF EXISTS "chkchk_comments_select" ON public.chkchk_comments;
CREATE POLICY "chkchk_comments_select"
  ON public.chkchk_comments
  FOR SELECT
  TO authenticated
  USING (
    (item_id IS NOT NULL AND public.chkchk_can_view_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_view_checklist(checklist_id))
  );

DROP POLICY IF EXISTS "chkchk_comments_insert" ON public.chkchk_comments;
CREATE POLICY "chkchk_comments_insert"
  ON public.chkchk_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (item_id IS NOT NULL AND public.chkchk_can_interact_with_item(item_id))
      OR (checklist_id IS NOT NULL AND public.chkchk_can_interact_with_checklist(checklist_id))
    )
  );

DROP POLICY IF EXISTS "chkchk_comments_update" ON public.chkchk_comments;
CREATE POLICY "chkchk_comments_update"
  ON public.chkchk_comments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      (item_id IS NOT NULL AND public.chkchk_can_interact_with_item(item_id))
      OR (checklist_id IS NOT NULL AND public.chkchk_can_interact_with_checklist(checklist_id))
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (item_id IS NOT NULL AND public.chkchk_can_interact_with_item(item_id))
      OR (checklist_id IS NOT NULL AND public.chkchk_can_interact_with_checklist(checklist_id))
    )
  );

DROP POLICY IF EXISTS "chkchk_comments_delete" ON public.chkchk_comments;
CREATE POLICY "chkchk_comments_delete"
  ON public.chkchk_comments
  FOR DELETE
  TO authenticated
  USING (
    (
      user_id = auth.uid()
      AND (
        (item_id IS NOT NULL AND public.chkchk_can_view_item(item_id))
        OR (checklist_id IS NOT NULL AND public.chkchk_can_view_checklist(checklist_id))
      )
    )
    OR (item_id IS NOT NULL AND public.chkchk_can_edit_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_edit_checklist(checklist_id))
  );

-- Archive already uses chkchk_confirm_card + chkchk_can_manage_checklist
-- (owner or team Lead). Detail UI calls that RPC to close out the order.
