export interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
  price: number;
  wholesale_price?: number | null;
  pvp_reference_price?: number;
  image?: string;
  image_urls?: string[];
  category_name?: string;
  category?: string;
  unit_of_measure?: string;
  sku?: string;
  commercial_key?: string;
  brand?: string;
  pallet_units?: number;
  price_per_kilo?: number;
  list_price?: number;
  unit_net_price?: number;
  net_price?: number;
  tax_rate?: number;
}
