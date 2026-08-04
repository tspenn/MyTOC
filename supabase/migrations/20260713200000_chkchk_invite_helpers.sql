-- Helper for collaborator invites (deploy to Friday Canvas when ready)

create or replace function public.chkchk_lookup_user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;
$$;

revoke all on function public.chkchk_lookup_user_id_by_email(text) from public;
grant execute on function public.chkchk_lookup_user_id_by_email(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('chkchk-attachments', 'chkchk-attachments', true)
on conflict (id) do nothing;
