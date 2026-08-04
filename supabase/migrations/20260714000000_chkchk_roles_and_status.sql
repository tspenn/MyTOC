-- ChkChk: user roles, card status, and assignee RBAC

-- ---------------------------------------------------------------------------
-- 1. User roles table  (assigner = project owner, assignee = contractor)
-- ---------------------------------------------------------------------------

create table public.chkchk_user_roles (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  role     text not null check (role in ('assigner', 'assignee')),
  phone    text,
  created_at timestamptz not null default now()
);

alter table public.chkchk_user_roles enable row level security;

-- Each user can read/write their own row
create policy "chkchk_user_roles_self_select"
  on public.chkchk_user_roles for select
  to authenticated using (user_id = auth.uid());

create policy "chkchk_user_roles_insert"
  on public.chkchk_user_roles for insert
  to authenticated with check (user_id = auth.uid());

create policy "chkchk_user_roles_update"
  on public.chkchk_user_roles for update
  to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Assigner can see roles/phones of assignees on their own checklists
create policy "chkchk_user_roles_assigner_read"
  on public.chkchk_user_roles for select
  to authenticated
  using (
    exists (
      select 1
      from public.chkchk_collaborators col
      join public.chkchk_checklists c on c.id = col.checklist_id
      where col.user_id = chkchk_user_roles.user_id
        and c.user_id  = auth.uid()
        and col.role   = 'assignee'
    )
  );

grant select, insert, update on public.chkchk_user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Add status to checklists
-- ---------------------------------------------------------------------------

alter table public.chkchk_checklists
  add column status text not null default 'active'
  check (status in ('active', 'awaiting_confirmation', 'archived'));

create index chkchk_checklists_status_idx
  on public.chkchk_checklists (status);

-- ---------------------------------------------------------------------------
-- 3. Expand collaborator role to include 'assignee'
-- ---------------------------------------------------------------------------

do $$
declare
  v_con text;
begin
  select conname into v_con
  from   pg_constraint
  where  conrelid = 'public.chkchk_collaborators'::regclass
    and  contype  = 'c'
    and  pg_get_constraintdef(oid) like '%role%';

  if v_con is not null then
    execute 'alter table public.chkchk_collaborators drop constraint ' || quote_ident(v_con);
  end if;
end;
$$;

alter table public.chkchk_collaborators
  add constraint chkchk_collaborators_role_check
  check (role in ('viewer', 'editor', 'assignee'));

-- ---------------------------------------------------------------------------
-- 4. Prevent self-assignment
-- ---------------------------------------------------------------------------

create or replace function public.chkchk_prevent_self_assign()
returns trigger language plpgsql as $$
begin
  if new.user_id = (
    select user_id from public.chkchk_checklists where id = new.checklist_id
  ) then
    raise exception 'Cannot assign a checklist to its owner';
  end if;
  return new;
end;
$$;

create trigger chkchk_collaborators_no_self_assign
  before insert or update on public.chkchk_collaborators
  for each row execute function public.chkchk_prevent_self_assign();

-- ---------------------------------------------------------------------------
-- 5. New RLS helper functions
-- ---------------------------------------------------------------------------

create or replace function public.chkchk_is_assignee_of_checklist(target_checklist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chkchk_collaborators
    where  checklist_id = target_checklist_id
      and  user_id      = auth.uid()
      and  role         = 'assignee'
  );
$$;

-- owner OR editor OR assignee
create or replace function public.chkchk_can_interact_with_checklist(target_checklist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chkchk_checklists
    where  id      = target_checklist_id
      and  user_id = auth.uid()
  )
  or exists (
    select 1 from public.chkchk_collaborators
    where  checklist_id = target_checklist_id
      and  user_id      = auth.uid()
      and  role in ('editor', 'assignee')
  );
$$;

create or replace function public.chkchk_can_interact_with_item(target_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.chkchk_can_interact_with_checklist(
    public.chkchk_checklist_id_for_item(target_item_id)
  );
$$;

revoke all on function public.chkchk_is_assignee_of_checklist(uuid)      from public;
revoke all on function public.chkchk_can_interact_with_checklist(uuid)    from public;
revoke all on function public.chkchk_can_interact_with_item(uuid)         from public;

grant execute on function public.chkchk_is_assignee_of_checklist(uuid)    to authenticated;
grant execute on function public.chkchk_can_interact_with_checklist(uuid)  to authenticated;
grant execute on function public.chkchk_can_interact_with_item(uuid)       to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Update item UPDATE policy: allow assignees to toggle completed
-- ---------------------------------------------------------------------------

drop policy if exists "chkchk_items_update" on public.chkchk_items;

create policy "chkchk_items_update"
  on public.chkchk_items for update
  to authenticated
  using (
    public.chkchk_can_edit_checklist(checklist_id)
    or public.chkchk_is_assignee_of_checklist(checklist_id)
  )
  with check (
    public.chkchk_can_edit_checklist(checklist_id)
    or public.chkchk_is_assignee_of_checklist(checklist_id)
  );

-- ---------------------------------------------------------------------------
-- 7. Allow assignees to post/edit their own comments
-- ---------------------------------------------------------------------------

drop policy if exists "chkchk_comments_insert" on public.chkchk_comments;
create policy "chkchk_comments_insert"
  on public.chkchk_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.chkchk_can_interact_with_item(item_id)
  );

drop policy if exists "chkchk_comments_update" on public.chkchk_comments;
create policy "chkchk_comments_update"
  on public.chkchk_comments for update
  to authenticated
  using  (user_id = auth.uid() and public.chkchk_can_interact_with_item(item_id))
  with check (user_id = auth.uid() and public.chkchk_can_interact_with_item(item_id));

-- ---------------------------------------------------------------------------
-- 8. RPCs for status transitions (SECURITY DEFINER enforces ownership)
-- ---------------------------------------------------------------------------

-- Assignee marks card complete → awaiting_confirmation
create or replace function public.chkchk_mark_card_complete(p_checklist_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.chkchk_collaborators
    where  checklist_id = p_checklist_id
      and  user_id      = auth.uid()
      and  role         = 'assignee'
  ) then
    raise exception 'Not an assignee for this card';
  end if;

  update public.chkchk_checklists
  set    status = 'awaiting_confirmation', updated_at = now()
  where  id     = p_checklist_id
    and  status = 'active';
end;
$$;

-- Owner confirms → archived
create or replace function public.chkchk_confirm_card(p_checklist_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.chkchk_checklists
    where  id      = p_checklist_id
      and  user_id = auth.uid()
  ) then
    raise exception 'Not the card owner';
  end if;

  update public.chkchk_checklists
  set    status = 'archived', updated_at = now()
  where  id     = p_checklist_id;
end;
$$;

-- Owner rejects → active
create or replace function public.chkchk_reject_card(p_checklist_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.chkchk_checklists
    where  id      = p_checklist_id
      and  user_id = auth.uid()
  ) then
    raise exception 'Not the card owner';
  end if;

  update public.chkchk_checklists
  set    status = 'active', updated_at = now()
  where  id     = p_checklist_id;
end;
$$;

-- Read current user's app role
create or replace function public.chkchk_get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.chkchk_user_roles where user_id = auth.uid();
$$;

-- Assigned cards for the current assignee (active + awaiting_confirmation only)
create or replace function public.chkchk_get_assigned_cards()
returns table (
  id          uuid,
  user_id     uuid,
  title       text,
  description text,
  status      text,
  created_at  timestamptz,
  updated_at  timestamptz,
  item_count  bigint
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.user_id, c.title, c.description,
    c.status, c.created_at, c.updated_at,
    count(i.id) as item_count
  from   public.chkchk_checklists   c
  join   public.chkchk_collaborators col on col.checklist_id = c.id
  left join public.chkchk_items      i   on i.checklist_id   = c.id
  where  col.user_id = auth.uid()
    and  col.role    = 'assignee'
    and  c.status in ('active', 'awaiting_confirmation')
  group by c.id
  order by c.updated_at desc;
$$;

revoke all on function public.chkchk_mark_card_complete(uuid) from public;
revoke all on function public.chkchk_confirm_card(uuid)        from public;
revoke all on function public.chkchk_reject_card(uuid)         from public;
revoke all on function public.chkchk_get_my_role()             from public;
revoke all on function public.chkchk_get_assigned_cards()      from public;

grant execute on function public.chkchk_mark_card_complete(uuid) to authenticated;
grant execute on function public.chkchk_confirm_card(uuid)        to authenticated;
grant execute on function public.chkchk_reject_card(uuid)         to authenticated;
grant execute on function public.chkchk_get_my_role()             to authenticated;
grant execute on function public.chkchk_get_assigned_cards()      to authenticated;
