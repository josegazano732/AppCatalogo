begin;

with seed_products as (
  select *
  from jsonb_to_recordset($seed_products$[
  {
    "id": "1",
    "name": "YM DON JULIAN 10x500g PACK",
    "description": "Yerba mate DON JULIAN pack mayorista 10x500g",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "2",
    "name": "YM DON JULIAN Pack 10x1kg PACK",
    "description": "Yerba mate DON JULIAN pack mayorista 10x1kg",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "3",
    "name": "YM MATEITE 10x500g PACK",
    "description": "Yerba mate MATEITE pack mayorista 10x500g",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "4",
    "name": "YM MATEITE 10x1kg PACK",
    "description": "Yerba mate MATEITE pack mayorista 10x1kg",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "5",
    "name": "YM YERBELLA 10x500g PACK",
    "description": "Yerba mate YERBELLA pack mayorista 10x500g",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Yerbella x500.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "6",
    "name": "MC Mate cocido DON JULIAN x20 PACK",
    "description": "Mate cocido DON JULIAN x20 en formato pack",
    "category_name": "Mate Cocido",
    "image": "assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "7",
    "name": "YM MATEITE PREMIUM 10x500g PACK",
    "description": "Yerba mate MATEITE PREMIUM pack mayorista 10x500g",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM MATEITE PREMIUM.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-1",
    "name": "YM 10x1000g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x1000g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 101,
    "metadata": {}
  },
  {
    "id": "commerce-pos-2",
    "name": "YM 10x1000g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x1000g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-3",
    "name": "YM 10x1000g Mate y Playa TRAD.",
    "description": "Yerba mate Mate y Playa tradicional x1000g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-4",
    "name": "YM 10x500g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x500g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-5",
    "name": "YM 10x500g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x500g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-6",
    "name": "YM 10x500g Mate y Playa TRADICIONAL",
    "description": "Yerba mate Mate y Playa tradicional x500g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "commerce-pos-7",
    "name": "YM 10x500g Mate y Playa Terere",
    "description": "Yerba mate Mate y Playa terere x500g para comercios y puntos de venta",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa Terere.jpeg",
    "unit_of_measure": "pack",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-1",
    "name": "MC Mate cocido DON JULIAN x20 PACK",
    "description": "Mate cocido Don Julian 25 unidades x 2 g para catalogo mayorista",
    "category_name": "Mate Cocido",
    "image": "assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-2",
    "name": "YM 10x1000g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x1000g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-3",
    "name": "YM x1000g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x1000g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-4",
    "name": "YM 10x1000g Don Julian",
    "description": "Yerba mate Don Julian x1000g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-5",
    "name": "YM 10x1000g Mate y Playa TRAD.",
    "description": "Yerba mate Mate y Playa tradicional x1000g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-6",
    "name": "YM 10x1000g Mateite",
    "description": "Yerba mate Mateite x1000g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-7",
    "name": "YM 10x500g Yerbella ORGANICA",
    "description": "Yerba mate Yerbella organica x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Yerbella x500.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-8",
    "name": "YM 10x500g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-9",
    "name": "YM 10x500g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-10",
    "name": "YM 10x500g Don Julian",
    "description": "Yerba mate Don Julian x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-11",
    "name": "YM 10x500g Mate y Playa TRADICIONAL",
    "description": "Yerba mate Mate y Playa tradicional x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-12",
    "name": "YM 10x500g Mate y Playa Terere",
    "description": "Yerba mate Mate y Playa terere x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa Terere.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "wholesale-13",
    "name": "YM 10x500g Mateite",
    "description": "Yerba mate Mateite x500g para catalogo mayorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-1",
    "name": "Mate cocido Don Julian 25Ux2 G.",
    "description": "Mate cocido Don Julian 25 unidades x 2 g para catalogo minorista",
    "category_name": "Mate Cocido",
    "image": "assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-2",
    "name": "YM x1000g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x1000g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-3",
    "name": "YM x1000g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x1000g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-4",
    "name": "YM x1000g Don Julian",
    "description": "Yerba mate Don Julian x1000g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-5",
    "name": "YM x1000g Mate y Playa TRAD.",
    "description": "Yerba mate Mate y Playa tradicional x1000g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-6",
    "name": "YM x1000g Mateite",
    "description": "Yerba mate Mateite x1000g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-7",
    "name": "YM x500 Yerbella ORGANICA",
    "description": "Yerba mate Yerbella organica x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Yerbella x500.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-8",
    "name": "YM x500g Caricias de Mate SUAVE",
    "description": "Yerba mate Caricias de Mate suave x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate SUAVE.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-9",
    "name": "YM x500g Caricias de Mate TRADICIONAL",
    "description": "Yerba mate Caricias de Mate tradicional x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-10",
    "name": "YM x500g Don Julian",
    "description": "Yerba mate Don Julian x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/don-julian-nueva.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-11",
    "name": "YM x500g Mate y Playa TRADICIONAL",
    "description": "Yerba mate Mate y Playa tradicional x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-12",
    "name": "YM x500g Mate y Playa Terere",
    "description": "Yerba mate Mate y Playa terere x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM x500g Mate y Playa Terere.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-13",
    "name": "YM x500g Mateite",
    "description": "Yerba mate Mateite x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM Mateite.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "retail-14",
    "name": "YM x500g Mateite PREMIUM",
    "description": "Yerba mate Mateite Premium x500g para catalogo minorista",
    "category_name": "Yerba Mate",
    "image": "assets/products/YM MATEITE PREMIUM.jpeg",
    "unit_of_measure": "unidad",
    "sku": null,
    "brand": null,
    "stock": 100,
    "metadata": {}
  },
  {
    "id": "holowaty-1001",
    "name": "YERUPE Yerba Mate 500 g",
    "description": "Yerba mate YERUPE de 500 g.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/YERUPE Yerba Mate 500 g.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1001",
    "brand": "YERUPE",
    "stock": 100,
    "metadata": {
      "net_price": 852,
      "unit_net_price": 852,
      "price_per_kilo": 1704,
      "pallet_units": 112,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1002",
    "name": "YERUPE Yerba Mate 1 kg",
    "description": "Yerba mate YERUPE de 1 kg.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/YERUPE Yerba Mate 1 kg.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1002",
    "brand": "YERUPE",
    "stock": 100,
    "metadata": {
      "net_price": 1700,
      "unit_net_price": 1700,
      "price_per_kilo": 1700,
      "pallet_units": 60,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1003",
    "name": "ALAZAN Yerba Mate 500 g",
    "description": "Yerba mate ALAZAN de 500 g.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/ALAZAN Yerba Mate 500 g.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1003",
    "brand": "ALAZAN",
    "stock": 100,
    "metadata": {
      "net_price": 765,
      "unit_net_price": 765,
      "price_per_kilo": 1530,
      "pallet_units": 112,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1004",
    "name": "ALAZAN Yerba Mate 1 kg",
    "description": "Yerba mate ALAZAN de 1 kg.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/ALAZAN Yerba Mate 1 kg.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1004",
    "brand": "ALAZAN",
    "stock": 100,
    "metadata": {
      "net_price": 1510,
      "unit_net_price": 1510,
      "price_per_kilo": 1510,
      "pallet_units": 60,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1005",
    "name": "SELLO ROJO Yerba Mate 500 g",
    "description": "Yerba mate SELLO ROJO de 500 g.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/SELLO ROJO Yerba Mate 500 g.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1005",
    "brand": "SELLO ROJO",
    "stock": 100,
    "metadata": {
      "net_price": 719,
      "unit_net_price": 719,
      "price_per_kilo": 1438,
      "pallet_units": 112,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1006",
    "name": "SELLO ROJO Yerba Mate 1 kg",
    "description": "Yerba mate SELLO ROJO de 1 kg.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/SELLO ROJO Yerba Mate 1 kg.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1006",
    "brand": "SELLO ROJO",
    "stock": 100,
    "metadata": {
      "net_price": 1428,
      "unit_net_price": 1428,
      "price_per_kilo": 1428,
      "pallet_units": 60,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1007",
    "name": "SELLO NEGRO Yerba Mate 500 g",
    "description": "Yerba mate SELLO NEGRO de 500 g.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/SELLO NEGRO Yerba Mate 500 g.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1007",
    "brand": "SELLO NEGRO",
    "stock": 100,
    "metadata": {
      "net_price": 619,
      "unit_net_price": 619,
      "price_per_kilo": 1238,
      "pallet_units": 112,
      "tax_rate": 0.21
    }
  },
  {
    "id": "holowaty-1008",
    "name": "SELLO NEGRO Yerba Mate 1 kg",
    "description": "Yerba mate SELLO NEGRO de 1 kg.",
    "category_name": "Yerba Mate",
    "image": "assets/products/holowaty/SELLO NEGRO Yerba Mate 1 kg.jpeg",
    "unit_of_measure": "unidad",
    "sku": "1008",
    "brand": "SELLO NEGRO",
    "stock": 100,
    "metadata": {
      "net_price": 1205,
      "unit_net_price": 1205,
      "price_per_kilo": 1205,
      "pallet_units": 60,
      "tax_rate": 0.21
    }
  }
]$seed_products$::jsonb) as item (
    id text,
    name text,
    description text,
    category_name text,
    image text,
    unit_of_measure text,
    sku text,
    brand text,
    stock numeric,
    metadata jsonb
  )
)
insert into public.products (
  id,
  name,
  description,
  category_name,
  image,
  unit_of_measure,
  sku,
  brand,
  stock,
  metadata
)
select
  id,
  name,
  description,
  category_name,
  image,
  unit_of_measure,
  sku,
  brand,
  stock,
  metadata
from seed_products
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category_name = excluded.category_name,
  image = excluded.image,
  unit_of_measure = excluded.unit_of_measure,
  sku = excluded.sku,
  brand = excluded.brand,
  stock = excluded.stock,
  metadata = excluded.metadata;

with seed_prices as (
  select *
  from jsonb_to_recordset($seed_prices$[
  {
    "catalog_id": "whatsapp",
    "product_id": "1",
    "price": 18000,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "2",
    "price": 33500,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "3",
    "price": 18600,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "4",
    "price": 37000,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "5",
    "price": 40000,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "6",
    "price": 17000,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "whatsapp",
    "product_id": "7",
    "price": 35000,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "1",
    "price": 18000,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "2",
    "price": 33500,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "3",
    "price": 18600,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "4",
    "price": 37000,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "5",
    "price": 40000,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "6",
    "price": 17000,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "7",
    "price": 35000,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-1",
    "price": 25531,
    "sort_order": 7,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-2",
    "price": 24805,
    "sort_order": 8,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-3",
    "price": 25531,
    "sort_order": 9,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-4",
    "price": 13068,
    "sort_order": 10,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-5",
    "price": 12705,
    "sort_order": 11,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-6",
    "price": 13068,
    "sort_order": 12,
    "is_active": true
  },
  {
    "catalog_id": "commerce-pos",
    "product_id": "commerce-pos-7",
    "price": 13915,
    "sort_order": 13,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "1",
    "price": 12705,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "2",
    "price": 24805,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "3",
    "price": 13915,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "4",
    "price": 27225,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "5",
    "price": 34993.2,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "6",
    "price": 15800,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "distributor-pallet",
    "product_id": "7",
    "price": 35000,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-1",
    "price": 790,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-2",
    "price": 2117.5,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-3",
    "price": 2069.1,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-4",
    "price": 2843.5,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-5",
    "price": 2117.5,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-6",
    "price": 2722.5,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-7",
    "price": 3811.5,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-8",
    "price": 1089,
    "sort_order": 7,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-9",
    "price": 1064.8,
    "sort_order": 8,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-10",
    "price": 1452,
    "sort_order": 9,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-11",
    "price": 1089,
    "sort_order": 10,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-12",
    "price": 1149.5,
    "sort_order": 11,
    "is_active": true
  },
  {
    "catalog_id": "wholesale",
    "product_id": "wholesale-13",
    "price": 1391.5,
    "sort_order": 12,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-1",
    "price": 1100,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-2",
    "price": 3000,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-3",
    "price": 2900,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-4",
    "price": 3500,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-5",
    "price": 2900,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-6",
    "price": 3800,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-7",
    "price": 3800,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-8",
    "price": 1600,
    "sort_order": 7,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-9",
    "price": 1500,
    "sort_order": 8,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-10",
    "price": 1800,
    "sort_order": 9,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-11",
    "price": 1500,
    "sort_order": 10,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-12",
    "price": 1600,
    "sort_order": 11,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-13",
    "price": 2000,
    "sort_order": 12,
    "is_active": true
  },
  {
    "catalog_id": "retail",
    "product_id": "retail-14",
    "price": 4200,
    "sort_order": 13,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1001",
    "price": 1260,
    "sort_order": 0,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1002",
    "price": 2520,
    "sort_order": 1,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1003",
    "price": 1134,
    "sort_order": 2,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1004",
    "price": 2238,
    "sort_order": 3,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1005",
    "price": 1066,
    "sort_order": 4,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1006",
    "price": 2116,
    "sort_order": 5,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1007",
    "price": 916,
    "sort_order": 6,
    "is_active": true
  },
  {
    "catalog_id": "holowaty",
    "product_id": "holowaty-1008",
    "price": 1786,
    "sort_order": 7,
    "is_active": true
  }
]$seed_prices$::jsonb) as item (
    catalog_id text,
    product_id text,
    price numeric,
    sort_order integer,
    is_active boolean
  )
)
insert into public.catalog_prices (
  catalog_id,
  product_id,
  price,
  sort_order,
  is_active
)
select
  catalog_id,
  product_id,
  price,
  sort_order,
  is_active
from seed_prices
on conflict (catalog_id, product_id) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

commit;
