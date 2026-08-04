-- ChkChk schema: isolated checklist tables with RLS for owner/collaborator access.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.chkchk_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chkchk_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.chkchk_checklists (id) on delete cascade,
  task text not null,
  completed boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chkchk_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.chkchk_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.chkchk_attachments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.chkchk_items (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_size bigint not null check (file_size >= 0),
  created_at timestamptz not null default now()
);

create table public.chkchk_collaborators (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.chkchk_checklists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  invited_at timestamptz not null default now(),
  unique (checklist_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index chkchk_checklists_user_id_idx on public.chkchk_checklists (user_id);
create index chkchk_items_checklist_id_idx on public.chkchk_items (checklist_id);
create index chkchk_comments_item_id_idx on public.chkchk_comments (item_id);
create index chkchk_comments_user_id_idx on public.chkchk_comments (user_id);
create index chkchk_attachments_item_id_idx on public.chkchk_attachments (item_id);
create index chkchk_collaborators_checklist_id_idx on public.chkchk_collaborators (checklist_id);
create index chkchk_collaborators_user_id_idx on public.chkchk_collaborators (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.chkchk_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chkchk_checklists_set_updated_at
before update on public.chkchk_checklists
for each row execute function public.chkchk_set_updated_at();

create trigger chkchk_items_set_updated_at
before update on public.chkchk_items
for each row execute function public.chkchk_set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions for RLS
-- ---------------------------------------------------------------------------

create or replace function public.chkchk_can_view_checklist(target_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chkchk_checklists c
    where c.id = target_checklist_id
      and c.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.chkchk_collaborators col
    where col.checklist_id = target_checklist_id
      and col.user_id = auth.uid()
  );
$$;

create or replace function public.chkchk_can_edit_checklist(target_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chkchk_checklists c
    where c.id = target_checklist_id
      and c.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.chkchk_collaborators col
    where col.checklist_id = target_checklist_id
      and col.user_id = auth.uid()
      and col.role = 'editor'
  );
$$;

create or replace function public.chkchk_checklist_id_for_item(target_item_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select i.checklist_id
  from public.chkchk_items i
  where i.id = target_item_id;
$$;

create or replace function public.chkchk_can_view_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.chkchk_can_view_checklist(public.chkchk_checklist_id_for_item(target_item_id));
$$;

create or replace function public.chkchk_can_edit_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.chkchk_can_edit_checklist(public.chkchk_checklist_id_for_item(target_item_id));
$$;

create or replace function public.chkchk_owns_checklist(target_checklist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chkchk_checklists c
    where c.id = target_checklist_id
      and c.user_id = auth.uid()
  );
$$;

revoke all on function public.chkchk_can_view_checklist(uuid) from public;
revoke all on function public.chkchk_can_edit_checklist(uuid) from public;
revoke all on function public.chkchk_checklist_id_for_item(uuid) from public;
revoke all on function public.chkchk_can_view_item(uuid) from public;
revoke all on function public.chkchk_can_edit_item(uuid) from public;
revoke all on function public.chkchk_owns_checklist(uuid) from public;

grant execute on function public.chkchk_can_view_checklist(uuid) to authenticated;
grant execute on function public.chkchk_can_edit_checklist(uuid) to authenticated;
grant execute on function public.chkchk_checklist_id_for_item(uuid) to authenticated;
grant execute on function public.chkchk_can_view_item(uuid) to authenticated;
grant execute on function public.chkchk_can_edit_item(uuid) to authenticated;
grant execute on function public.chkchk_owns_checklist(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.chkchk_checklists enable row level security;
alter table public.chkchk_items enable row level security;
alter table public.chkchk_comments enable row level security;
alter table public.chkchk_attachments enable row level security;
alter table public.chkchk_collaborators enable row level security;

create policy "chkchk_checklists_select"
on public.chkchk_checklists
for select
to authenticated
using (public.chkchk_can_view_checklist(id));

create policy "chkchk_checklists_insert"
on public.chkchk_checklists
for insert
to authenticated
with check (user_id = auth.uid());

create policy "chkchk_checklists_update"
on public.chkchk_checklists
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "chkchk_checklists_delete"
on public.chkchk_checklists
for delete
to authenticated
using (user_id = auth.uid());

create policy "chkchk_items_select"
on public.chkchk_items
for select
to authenticated
using (public.chkchk_can_view_checklist(checklist_id));

create policy "chkchk_items_insert"
on public.chkchk_items
for insert
to authenticated
with check (public.chkchk_can_edit_checklist(checklist_id));

create policy "chkchk_items_update"
on public.chkchk_items
for update
to authenticated
using (public.chkchk_can_edit_checklist(checklist_id))
with check (public.chkchk_can_edit_checklist(checklist_id));

create policy "chkchk_items_delete"
on public.chkchk_items
for delete
to authenticated
using (public.chkchk_can_edit_checklist(checklist_id));

create policy "chkchk_comments_select"
on public.chkchk_comments
for select
to authenticated
using (public.chkchk_can_view_item(item_id));

create policy "chkchk_comments_insert"
on public.chkchk_comments
for insert
to authenticated
with check (user_id = auth.uid() and public.chkchk_can_edit_item(item_id));

create policy "chkchk_comments_update"
on public.chkchk_comments
for update
to authenticated
using (user_id = auth.uid() and public.chkchk_can_edit_item(item_id))
with check (user_id = auth.uid() and public.chkchk_can_edit_item(item_id));

create policy "chkchk_comments_delete"
on public.chkchk_comments
for delete
to authenticated
using (
  (user_id = auth.uid() and public.chkchk_can_view_item(item_id))
  or public.chkchk_can_edit_item(item_id)
);

create policy "chkchk_attachments_select"
on public.chkchk_attachments
for select
to authenticated
using (public.chkchk_can_view_item(item_id));

create policy "chkchk_attachments_insert"
on public.chkchk_attachments
for insert
to authenticated
with check (public.chkchk_can_edit_item(item_id));

create policy "chkchk_attachments_update"
on public.chkchk_attachments
for update
to authenticated
using (public.chkchk_can_edit_item(item_id))
with check (public.chkchk_can_edit_item(item_id));

create policy "chkchk_attachments_delete"
on public.chkchk_attachments
for delete
to authenticated
using (public.chkchk_can_edit_item(item_id));

create policy "chkchk_collaborators_select"
on public.chkchk_collaborators
for select
to authenticated
using (
  user_id = auth.uid()
  or public.chkchk_owns_checklist(checklist_id)
);

create policy "chkchk_collaborators_insert"
on public.chkchk_collaborators
for insert
to authenticated
with check (public.chkchk_owns_checklist(checklist_id));

create policy "chkchk_collaborators_update"
on public.chkchk_collaborators
for update
to authenticated
using (public.chkchk_owns_checklist(checklist_id))
with check (public.chkchk_owns_checklist(checklist_id));

create policy "chkchk_collaborators_delete"
on public.chkchk_collaborators
for delete
to authenticated
using (
  public.chkchk_owns_checklist(checklist_id)
  or user_id = auth.uid()
);

grant select, insert, update, delete on public.chkchk_checklists to authenticated;
grant select, insert, update, delete on public.chkchk_items to authenticated;
grant select, insert, update, delete on public.chkchk_comments to authenticated;
grant select, insert, update, delete on public.chkchk_attachments to authenticated;
grant select, insert, update, delete on public.chkchk_collaborators to authenticated;
