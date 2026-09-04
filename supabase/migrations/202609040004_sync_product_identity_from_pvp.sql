begin;

with public_sale_identity as (
  select distinct on (product.commercial_key)
    product.commercial_key,
    product.sku,
    product.brand
  from public.catalogs as catalog
  join public.catalog_prices as catalog_price
    on catalog_price.catalog_id = catalog.id
    and catalog_price.is_active
  join public.products as product
    on product.id = catalog_price.product_id
  where catalog.is_public_sale
    and catalog.is_active
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

create or replace function public.sync_product_identity_from_pvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.commercial_key is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  if exists (
    select 1
    from public.catalog_prices as catalog_price
    join public.catalogs as catalog
      on catalog.id = catalog_price.catalog_id
    where catalog_price.product_id = new.id
      and catalog_price.is_active
      and catalog.is_active
      and catalog.is_public_sale
  ) then
    update public.products
    set
      sku = new.sku,
      brand = new.brand,
      updated_at = now()
    where commercial_key = new.commercial_key
      and id <> new.id
      and (sku is distinct from new.sku or brand is distinct from new.brand);
  end if;

  return new;
end;
$$;

drop trigger if exists products_sync_identity_from_pvp on public.products;
create trigger products_sync_identity_from_pvp
after insert or update of sku, brand, commercial_key
on public.products
for each row
execute function public.sync_product_identity_from_pvp();

create or replace function public.sync_linked_product_identity_from_pvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_product public.products%rowtype;
begin
  if not new.is_active or pg_trigger_depth() > 1 then
    return new;
  end if;

  if not exists (
    select 1
    from public.catalogs
    where id = new.catalog_id
      and is_active
      and is_public_sale
  ) then
    return new;
  end if;

  select *
  into source_product
  from public.products
  where id = new.product_id;

  if source_product.commercial_key is not null then
    update public.products
    set
      sku = source_product.sku,
      brand = source_product.brand,
      updated_at = now()
    where commercial_key = source_product.commercial_key
      and id <> source_product.id
      and (sku is distinct from source_product.sku or brand is distinct from source_product.brand);
  end if;

  return new;
end;
$$;

drop trigger if exists catalog_prices_sync_identity_from_pvp on public.catalog_prices;
create trigger catalog_prices_sync_identity_from_pvp
after insert or update of catalog_id, product_id, is_active
on public.catalog_prices
for each row
execute function public.sync_linked_product_identity_from_pvp();

commit;