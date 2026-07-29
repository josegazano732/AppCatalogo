begin;

create table if not exists public.catalog_documents (
  id uuid primary key default gen_random_uuid(),
  catalog_id text not null references public.catalogs(id) on update cascade on delete cascade,
  file_name text not null,
  file_path text,
  public_url text not null,
  mime_type text not null default 'application/pdf',
  updated_at timestamptz not null default now()
);

alter table public.catalog_documents add column if not exists id uuid;
update public.catalog_documents set id = gen_random_uuid() where id is null;
alter table public.catalog_documents alter column id set default gen_random_uuid();
alter table public.catalog_documents alter column id set not null;
alter table public.catalog_documents alter column catalog_id set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'catalog_documents_pkey'
      and conrelid = 'public.catalog_documents'::regclass
  ) then
    alter table public.catalog_documents drop constraint catalog_documents_pkey;
  end if;
end $$;

alter table public.catalog_documents add constraint catalog_documents_pkey primary key (id);

create index if not exists catalog_documents_catalog_id_idx on public.catalog_documents(catalog_id);
create index if not exists catalog_documents_updated_at_idx on public.catalog_documents(updated_at desc);

commit;
