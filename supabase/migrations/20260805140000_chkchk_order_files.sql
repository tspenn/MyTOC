-- Order / task files: Team Members and Leads can upload work files (receipts, invoices, media).

-- Allow order-level files (checklist_id) as well as task-level (item_id)
ALTER TABLE public.chkchk_attachments
  ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.chkchk_attachments
  ADD COLUMN IF NOT EXISTS checklist_id uuid REFERENCES public.chkchk_checklists (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.chkchk_attachments a
SET checklist_id = i.checklist_id
FROM public.chkchk_items i
WHERE a.item_id = i.id
  AND a.checklist_id IS NULL;

ALTER TABLE public.chkchk_attachments
  DROP CONSTRAINT IF EXISTS chkchk_attachments_target_check;

ALTER TABLE public.chkchk_attachments
  ADD CONSTRAINT chkchk_attachments_target_check
  CHECK (item_id IS NOT NULL OR checklist_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS chkchk_attachments_checklist_id_idx
  ON public.chkchk_attachments (checklist_id);

CREATE OR REPLACE FUNCTION public.chkchk_can_upload_to_checklist(target_checklist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.chkchk_can_view_checklist(target_checklist_id)
    AND (
      public.chkchk_can_edit_checklist(target_checklist_id)
      OR EXISTS (
        SELECT 1
        FROM public.chkchk_collaborators c
        WHERE c.checklist_id = target_checklist_id
          AND c.user_id = auth.uid()
          AND c.role IN ('assignee', 'editor')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_can_upload_to_checklist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chkchk_can_upload_to_item(target_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.chkchk_can_upload_to_checklist(
    public.chkchk_checklist_id_for_item(target_item_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.chkchk_can_upload_to_item(uuid) TO authenticated;

DROP POLICY IF EXISTS "chkchk_attachments_select" ON public.chkchk_attachments;
CREATE POLICY "chkchk_attachments_select"
  ON public.chkchk_attachments
  FOR SELECT
  TO authenticated
  USING (
    (item_id IS NOT NULL AND public.chkchk_can_view_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_view_checklist(checklist_id))
  );

DROP POLICY IF EXISTS "chkchk_attachments_insert" ON public.chkchk_attachments;
CREATE POLICY "chkchk_attachments_insert"
  ON public.chkchk_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      (item_id IS NOT NULL AND public.chkchk_can_upload_to_item(item_id))
      OR (checklist_id IS NOT NULL AND public.chkchk_can_upload_to_checklist(checklist_id))
    )
  );

DROP POLICY IF EXISTS "chkchk_attachments_update" ON public.chkchk_attachments;
CREATE POLICY "chkchk_attachments_update"
  ON public.chkchk_attachments
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (item_id IS NOT NULL AND public.chkchk_can_edit_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_edit_checklist(checklist_id))
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR (item_id IS NOT NULL AND public.chkchk_can_edit_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_edit_checklist(checklist_id))
  );

DROP POLICY IF EXISTS "chkchk_attachments_delete" ON public.chkchk_attachments;
CREATE POLICY "chkchk_attachments_delete"
  ON public.chkchk_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (item_id IS NOT NULL AND public.chkchk_can_edit_item(item_id))
    OR (checklist_id IS NOT NULL AND public.chkchk_can_edit_checklist(checklist_id))
  );
