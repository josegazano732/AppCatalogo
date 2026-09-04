begin;

update public.products
set commercial_key = 'yerbella|500g|organica', updated_at = now()
where lower(name) like '%yerbella%'
  and lower(name) ~ '500\s*g?';

update public.products
set commercial_key = 'mateite-premium|500g|clasica', updated_at = now()
where lower(name) like '%mateite%'
  and lower(name) like '%premium%'
  and lower(name) ~ '500\s*g?';

commit;