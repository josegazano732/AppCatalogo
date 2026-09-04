begin;

alter table public.catalogs
  add column if not exists is_public_sale boolean not null default false;

alter table public.products
  add column if not exists commercial_key text;

update public.catalogs
set is_public_sale = (id = 'retail');

create unique index if not exists catalogs_one_public_sale_idx
  on public.catalogs (is_public_sale)
  where is_public_sale;

create index if not exists products_commercial_key_idx
  on public.products (commercial_key)
  where commercial_key is not null;

with normalized_products as (
  select
    id,
    lower(name) as normalized_name,
    lower(coalesce(category_name, '')) as normalized_category
  from public.products
  where commercial_key is null
), product_keys as (
  select
    id,
    case
      when normalized_category like '%mate cocido%' then 'mate-cocido|don-julian'
      else concat_ws('|',
        case
          when normalized_name like '%caricias de mate%' then 'caricias-de-mate'
          when normalized_name like '%mate y playa%' then 'mate-y-playa'
          when normalized_name like '%don julian%' then 'don-julian'
          when normalized_name like '%mateite%' and normalized_name like '%premium%' then 'mateite-premium'
          when normalized_name like '%mateite%' then 'mateite'
          when normalized_name like '%yerbella%' then 'yerbella'
        end,
        case
          when normalized_name ~ '(1000g|1\s*kg)' then '1000g'
          when normalized_name ~ '500\s*g?' then '500g'
          else 'otra'
        end,
        case
          when normalized_name like '%despalada%' then 'despalada'
          when normalized_name like '%suave%' then 'suave'
          when normalized_name like '%terere%' then 'terere'
          when normalized_name like '%organica%' or normalized_name like '%yerbella%' then 'organica'
          when normalized_name like '%tradicional%' or normalized_name like '%trad.%' then 'tradicional'
          else 'clasica'
        end
      )
    end as commercial_key
  from normalized_products
  where normalized_category like '%mate cocido%'
    or normalized_name like '%caricias de mate%'
    or normalized_name like '%mate y playa%'
    or normalized_name like '%don julian%'
    or normalized_name like '%mateite%'
    or normalized_name like '%yerbella%'
)
update public.products as product
set commercial_key = product_keys.commercial_key
from product_keys
where product.id = product_keys.id
  and product_keys.commercial_key is not null;

create or replace function public.set_public_sale_catalog(target_catalog_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_catalog_admin() then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.catalogs where id = target_catalog_id and is_active) then
    raise exception 'El catalogo no existe o esta inactivo';
  end if;

  update public.catalogs
  set is_public_sale = false, updated_at = now()
  where is_public_sale;

  update public.catalogs
  set is_public_sale = true, updated_at = now()
  where id = target_catalog_id;

  with public_sale_identity as (
    select distinct on (product.commercial_key)
      product.commercial_key,
      product.sku,
      product.brand
    from public.catalog_prices as catalog_price
    join public.products as product
      on product.id = catalog_price.product_id
    where catalog_price.catalog_id = target_catalog_id
      and catalog_price.is_active
      and product.commercial_key is not null
    order by product.commercial_key, catalog_price.sort_order, product.id
  )
  update public.products as target
  set
    sku = source.sku,
    brand = source.brand,
    updated_at = now()
  from public_sale_identity as source
  where target.commercial_key = source.commercial_key
    and (target.sku is distinct from source.sku or target.brand is distinct from source.brand);
end;
$$;

revoke all on function public.set_public_sale_catalog(text) from public;
grant execute on function public.set_public_sale_catalog(text) to authenticated;

commit;