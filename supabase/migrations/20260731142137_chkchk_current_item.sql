-- Track which task Crew is currently working on (set when they open the task card).
-- Lead may reorder other tasks anytime; the current item stays locked in place.

alter table public.chkchk_checklists
  add column if not exists current_item_id uuid
    references public.chkchk_items (id) on delete set null;

create index if not exists chkchk_checklists_current_item_idx
  on public.chkchk_checklists (current_item_id);

comment on column public.chkchk_checklists.current_item_id is
  'Item the assignee is working on; set when Crew opens that task card.';

-- Assignees can mark current work; owners/editors already have checklist update.
create or replace function public.chkchk_set_current_item(
  p_checklist_id uuid,
  p_item_id uuid
)
returns public.chkchk_checklists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.chkchk_checklists;
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.chkchk_checklists c
    where c.id = p_checklist_id
      and (
        c.user_id = v_uid
        or exists (
          select 1 from public.chkchk_collaborators col
          where col.checklist_id = c.id
            and col.user_id = v_uid
            and col.role in ('assignee', 'editor')
        )
      )
  ) into v_ok;

  if not v_ok then
    raise exception 'Not allowed to set current item';
  end if;

  if p_item_id is not null then
    if not exists (
      select 1 from public.chkchk_items i
      where i.id = p_item_id
        and i.checklist_id = p_checklist_id
        and i.completed = false
    ) then
      raise exception 'Item is not an open task on this checklist';
    end if;
  end if;

  update public.chkchk_checklists
  set current_item_id = p_item_id,
      updated_at = now()
  where id = p_checklist_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.chkchk_set_current_item(uuid, uuid) from public;
grant execute on function public.chkchk_set_current_item(uuid, uuid) to authenticated;
