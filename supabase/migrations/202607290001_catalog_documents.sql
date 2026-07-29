begin;

create table if not exists public.catalog_documents (
  catalog_id text primary key references public.catalogs(id) on update cascade on delete cascade,
  file_name text not null,
  file_path text,
  public_url text not null,
  mime_type text not null default 'application/pdf',
  updated_at timestamptz not null default now()
);

alter table public.catalog_documents enable row level security;

drop policy if exists "Public can read catalog documents" on public.catalog_documents;
create policy "Public can read catalog documents"
on public.catalog_documents for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage catalog documents" on public.catalog_documents;
create policy "Admins manage catalog documents"
on public.catalog_documents for all
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

grant select on public.catalog_documents to anon, authenticated;
grant select, insert, update, delete on public.catalog_documents to authenticated;

commit;
