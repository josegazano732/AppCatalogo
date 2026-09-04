begin;

create or replace function public.set_catalog_active(
  target_catalog_id text,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_catalog_admin() then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.catalogs where id = target_catalog_id) then
    raise exception 'El catalogo no existe';
  end if;

  if not target_is_active
    and exists (
      select 1
      from public.catalogs
      where id = target_catalog_id
        and is_public_sale
    ) then
    raise exception 'La fuente PVP no puede desactivarse';
  end if;

  if not target_is_active
    and (select count(*) from public.catalogs where is_active) <= 1 then
    raise exception 'Debe quedar al menos un catalogo activo';
  end if;

  update public.catalogs
  set is_active = target_is_active
  where id = target_catalog_id;
end;
$$;

revoke all on function public.set_catalog_active(text, boolean) from public;
grant execute on function public.set_catalog_active(text, boolean) to authenticated;

commit;
