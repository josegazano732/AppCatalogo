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

create index if not exists catalog_documents_catalog_id_idx on public.catalog_documents(catalog_id);
create index if not exists catalog_documents_updated_at_idx on public.catalog_documents(updated_at desc);

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

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set
  public = excluded.public;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');

commit;
