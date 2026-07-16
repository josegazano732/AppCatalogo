begin;

create table if not exists public.admin_email_allowlist (
  email text primary key check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);

alter table public.admin_email_allowlist enable row level security;
revoke all on public.admin_email_allowlist from anon, authenticated;

insert into public.admin_email_allowlist (email)
values ('gazanojoseluis7@gmail.com')
on conflict (email) do nothing;

create or replace function public.sync_catalog_admin_from_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (
    select 1
    from public.admin_email_allowlist
    where email = lower(trim(new.email))
  ) then
    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_catalog_admin_after_auth_user_change on auth.users;
create trigger sync_catalog_admin_after_auth_user_change
after insert or update of email on auth.users
for each row execute function public.sync_catalog_admin_from_email();

insert into public.admin_users (user_id)
select user_account.id
from auth.users as user_account
join public.admin_email_allowlist as allowed
  on allowed.email = lower(trim(user_account.email))
on conflict (user_id) do nothing;

revoke all on function public.sync_catalog_admin_from_email() from public, anon, authenticated;

commit;