import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';

import { Product } from '../models/product.model';
import { SupabaseService } from './supabase.service';

export type PriceCatalogId = 'whatsapp' | 'commerce-pos' | 'distributor-pallet' | 'wholesale' | 'retail' | 'holowaty';

export interface PriceCatalog {
  id: PriceCatalogId;
  name: string;
  description: string;
  route: string;
  priceLabel: string;
}

export interface ProductPriceUpdate {
  productId: string;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly priceOverridesStorageKey = 'app-catalogo-price-overrides-v1';
  private readonly holowatyListPrices: Record<string, number> = {
    'YERUPE Yerba Mate 500 g': 1260,
    'ALAZAN Yerba Mate 500 g': 1134,
    'SELLO ROJO Yerba Mate 500 g': 1066,
    'SELLO NEGRO Yerba Mate 500 g': 916,
    'YERUPE Yerba Mate 1 kg': 2520,
    'ALAZAN Yerba Mate 1 kg': 2238,
    'SELLO ROJO Yerba Mate 1 kg': 2116,
    'SELLO NEGRO Yerba Mate 1 kg': 1786
  };
  private readonly distributorPackPrices: Record<string, number> = {
    '1': 12705,
    '2': 24805,
    '3': 13915,
    '4': 27225,
    '5': 34993.2,
    '6': 15800,
    '7': 35000
  };
  private readonly priceCatalogs: PriceCatalog[] = [
    {
      id: 'whatsapp',
      name: 'Catalogo WhatsApp',
      description: 'Lista principal de packs para pedidos por WhatsApp.',
      route: '/',
      priceLabel: 'Precio por pack'
    },
    {
      id: 'commerce-pos',
      name: 'Comercios y puntos de venta',
      description: 'Packs destinados a comercios y puntos de venta.',
      route: '/catalogo-comercios-punto-de-ventas',
      priceLabel: 'Precio por pack'
    },
    {
      id: 'distributor-pallet',
      name: 'Distribuidora por pallet',
      description: 'Precio base por pack usado para calcular cada pallet.',
      route: '/catalogo-distribuidora-pallet',
      priceLabel: 'Precio base por pack'
    },
    {
      id: 'wholesale',
      name: 'Catalogo mayorista',
      description: 'Lista mayorista por unidad y presentacion.',
      route: '/catalogo-mayorista',
      priceLabel: 'Precio mayorista'
    },
    {
      id: 'retail',
      name: 'Catalogo minorista',
      description: 'Precios finales del canal minorista.',
      route: '/catalogo-minorista',
      priceLabel: 'Precio minorista'
    },
    {
      id: 'holowaty',
      name: 'Lista Holowaty',
      description: 'Precio de lista usado para calcular descuentos y netos.',
      route: '/holowaty',
      priceLabel: 'Precio de lista'
    }
  ];

  private readonly baseProducts: Product[] = [
    {
      id: '1',
      name: 'YM DON JULIAN 10x500g PACK',
      description: 'Yerba mate DON JULIAN pack mayorista 10x500g',
      stock: 100,
      price: 18000,
      wholesale_price: 18000,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '2',
      name: 'YM DON JULIAN Pack 10x1kg PACK',
      description: 'Yerba mate DON JULIAN pack mayorista 10x1kg',
      stock: 100,
      price: 33500,
      wholesale_price: 33500,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '3',
      name: 'YM MATEITE 10x500g PACK',
      description: 'Yerba mate MATEITE pack mayorista 10x500g',
      stock: 100,
      price: 18600,
      wholesale_price: 18600,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '4',
      name: 'YM MATEITE 10x1kg PACK',
      description: 'Yerba mate MATEITE pack mayorista 10x1kg',
      stock: 100,
      price: 37000,
      wholesale_price: 37000,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '5',
      name: 'YM YERBELLA 10x500g PACK',
      description: 'Yerba mate YERBELLA pack mayorista 10x500g',
      stock: 100,
      price: 40000,
      wholesale_price: 40000,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Yerbella x500.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '6',
      name: 'MC Mate cocido DON JULIAN x20 PACK',
      description: 'Mate cocido DON JULIAN x20 en formato pack',
      stock: 100,
      price: 17000,
      wholesale_price: 17000,
      category_name: 'Mate Cocido',
      image: 'assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '7',
      name: 'YM MATEITE PREMIUM 10x500g PACK',
      description: 'Yerba mate MATEITE PREMIUM pack mayorista 10x500g',
      stock: 100,
      price: 35000,
      wholesale_price: 35000,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM MATEITE PREMIUM.jpeg',
      unit_of_measure: 'pack'
    }
  ];

  // Lineas adicionales exclusivas para el catalogo de comercios y punto de ventas.
  // Las imagenes se completan cuando esten disponibles.
  private readonly commercePosExtraProducts: Product[] = [
    {
      id: 'commerce-pos-1',
      name: 'YM 10x1000g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x1000g para comercios y puntos de venta',
      stock: 101,
      price: 25531,
      wholesale_price: 25531,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-2',
      name: 'YM 10x1000g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x1000g para comercios y puntos de venta',
      stock: 100,
      price: 24805,
      wholesale_price: 24805,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-3',
      name: 'YM 10x1000g Mate y Playa TRAD.',
      description: 'Yerba mate Mate y Playa tradicional x1000g para comercios y puntos de venta',
      stock: 100,
      price: 25531,
      wholesale_price: 25531,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-4',
      name: 'YM 10x500g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x500g para comercios y puntos de venta',
      stock: 100,
      price: 13068,
      wholesale_price: 13068,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-5',
      name: 'YM 10x500g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x500g para comercios y puntos de venta',
      stock: 100,
      price: 12705,
      wholesale_price: 12705,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-6',
      name: 'YM 10x500g Mate y Playa TRADICIONAL',
      description: 'Yerba mate Mate y Playa tradicional x500g para comercios y puntos de venta',
      stock: 100,
      price: 13068,
      wholesale_price: 13068,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: 'commerce-pos-7',
      name: 'YM 10x500g Mate y Playa Terere',
      description: 'Yerba mate Mate y Playa terere x500g para comercios y puntos de venta',
      stock: 100,
      price: 13915,
      wholesale_price: 13915,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa Terere.jpeg',
      unit_of_measure: 'pack'
    }
  ];

  private readonly wholesaleCatalogProducts: Product[] = [
    {
      id: 'wholesale-1',
      name: 'MC Mate cocido DON JULIAN x20 PACK',
      description: 'Mate cocido Don Julian 25 unidades x 2 g para catalogo mayorista',
      stock: 100,
      price: 790,
      wholesale_price: 790,
      category_name: 'Mate Cocido',
      image: 'assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-2',
      name: 'YM 10x1000g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x1000g para catalogo mayorista',
      stock: 100,
      price: 2117.5,
      wholesale_price: 2117.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-3',
      name: 'YM x1000g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x1000g para catalogo mayorista',
      stock: 100,
      price: 2069.1,
      wholesale_price: 2069.1,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-4',
      name: 'YM 10x1000g Don Julian',
      description: 'Yerba mate Don Julian x1000g para catalogo mayorista',
      stock: 100,
      price: 2843.5,
      wholesale_price: 2843.50,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-5',
      name: 'YM 10x1000g Mate y Playa TRAD.',
      description: 'Yerba mate Mate y Playa tradicional x1000g para catalogo mayorista',
      stock: 100,
      price: 2117.5,
      wholesale_price: 2117.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-6',
      name: 'YM 10x1000g Mateite',
      description: 'Yerba mate Mateite x1000g para catalogo mayorista',
      stock: 100,
      price: 2722.5,
      wholesale_price: 2722.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-7',
      name: 'YM 10x500g Yerbella ORGANICA',
      description: 'Yerba mate Yerbella organica x500g para catalogo mayorista',
      stock: 100,
      price: 3811.50,
      wholesale_price: 3811.50,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Yerbella x500.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-8',
      name: 'YM 10x500g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x500g para catalogo mayorista',
      stock: 100,
      price: 1089,
      wholesale_price: 1089,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-9',
      name: 'YM 10x500g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x500g para catalogo mayorista',
      stock: 100,
      price: 1064.8,
      wholesale_price: 1064.8,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-10',
      name: 'YM 10x500g Don Julian',
      description: 'Yerba mate Don Julian x500g para catalogo mayorista',
      stock: 100,
      price: 1452.00,
      wholesale_price: 1452.00,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-11',
      name: 'YM 10x500g Mate y Playa TRADICIONAL',
      description: 'Yerba mate Mate y Playa tradicional x500g para catalogo mayorista',
      stock: 100,
      price: 1089,
      wholesale_price: 1089,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-12',
      name: 'YM 10x500g Mate y Playa Terere',
      description: 'Yerba mate Mate y Playa terere x500g para catalogo mayorista',
      stock: 100,
      price: 1149.5,
      wholesale_price: 1149.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa Terere.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'wholesale-13',
      name: 'YM 10x500g Mateite',
      description: 'Yerba mate Mateite x500g para catalogo mayorista',
      stock: 100,
      price: 1391.5,
      wholesale_price: 1391.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'unidad'
    }
  ];

  private readonly retailCatalogProducts: Product[] = [
    {
      id: 'retail-1',
      name: 'Mate cocido Don Julian 25Ux2 G.',
      description: 'Mate cocido Don Julian 25 unidades x 2 g para catalogo minorista',
      stock: 100,
      price: 1100,
      wholesale_price: 1100,
      category_name: 'Mate Cocido',
      image: 'assets/products/MC Mate cocido DON JULIAN x20 PACK.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-2',
      name: 'YM x1000g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x1000g para catalogo minorista',
      stock: 100,
      price: 3000,
      wholesale_price: 3000,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-3',
      name: 'YM x1000g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x1000g para catalogo minorista',
      stock: 100,
      price: 2900,
      wholesale_price: 2900,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-4',
      name: 'YM x1000g Don Julian',
      description: 'Yerba mate Don Julian x1000g para catalogo minorista',
      stock: 100,
      price: 3500,
      wholesale_price: 3500,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-5',
      name: 'YM x1000g Mate y Playa TRAD.',
      description: 'Yerba mate Mate y Playa tradicional x1000g para catalogo minorista',
      stock: 100,
      price: 2900,
      wholesale_price: 2900,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-6',
      name: 'YM x1000g Mateite',
      description: 'Yerba mate Mateite x1000g para catalogo minorista',
      stock: 100,
      price: 3800,
      wholesale_price: 3800,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-7',
      name: 'YM x500 Yerbella ORGANICA',
      description: 'Yerba mate Yerbella organica x500g para catalogo minorista',
      stock: 100,
      price: 3800.00,
      wholesale_price: 3800.00,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Yerbella x500.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-8',
      name: 'YM x500g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x500g para catalogo minorista',
      stock: 100,
      price: 1600,
      wholesale_price: 1600,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-9',
      name: 'YM x500g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x500g para catalogo minorista',
      stock: 100,
      price: 1500,
      wholesale_price: 1500,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-10',
      name: 'YM x500g Don Julian',
      description: 'Yerba mate Don Julian x500g para catalogo minorista',
      stock: 100,
      price: 1800,
      wholesale_price: 1800,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-11',
      name: 'YM x500g Mate y Playa TRADICIONAL',
      description: 'Yerba mate Mate y Playa tradicional x500g para catalogo minorista',
      stock: 100,
      price: 1500,
      wholesale_price: 1500,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-12',
      name: 'YM x500g Mate y Playa Terere',
      description: 'Yerba mate Mate y Playa terere x500g para catalogo minorista',
      stock: 100,
      price: 1600,
      wholesale_price: 1600,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa Terere.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-13',
      name: 'YM x500g Mateite',
      description: 'Yerba mate Mateite x500g para catalogo minorista',
      stock: 100,
      price: 2000,
      wholesale_price: 2000,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'retail-14',
      name: 'YM x500g Mateite PREMIUM',
      description: 'Yerba mate Mateite Premium x500g para catalogo minorista',
      stock: 100,
      price: 4200,
      wholesale_price: 4200,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM MATEITE PREMIUM.jpeg',
      unit_of_measure: 'unidad'
    }
  ];

  private readonly holowatyCatalogProducts: Product[] = [
    {
      id: 'holowaty-1001',
      sku: '1001',
      brand: 'YERUPE',
      name: 'YERUPE Yerba Mate 500 g',
      description: 'Yerba mate YERUPE de 500 g.',
      stock: 100,
      price: 1030.92,
      wholesale_price: 1030.92,
      net_price: 852,
      unit_net_price: 852,
      price_per_kilo: 1704,
      pallet_units: 112,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/YERUPE Yerba Mate 500 g.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1002',
      sku: '1002',
      brand: 'YERUPE',
      name: 'YERUPE Yerba Mate 1 kg',
      description: 'Yerba mate YERUPE de 1 kg.',
      stock: 100,
      price: 2057,
      wholesale_price: 2057,
      net_price: 1700,
      unit_net_price: 1700,
      price_per_kilo: 1700,
      pallet_units: 60,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/YERUPE Yerba Mate 1 kg.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1003',
      sku: '1003',
      brand: 'ALAZAN',
      name: 'ALAZAN Yerba Mate 500 g',
      description: 'Yerba mate ALAZAN de 500 g.',
      stock: 100,
      price: 925.65,
      wholesale_price: 925.65,
      net_price: 765,
      unit_net_price: 765,
      price_per_kilo: 1530,
      pallet_units: 112,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/ALAZAN Yerba Mate 500 g.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1004',
      sku: '1004',
      brand: 'ALAZAN',
      name: 'ALAZAN Yerba Mate 1 kg',
      description: 'Yerba mate ALAZAN de 1 kg.',
      stock: 100,
      price: 1827.1,
      wholesale_price: 1827.1,
      net_price: 1510,
      unit_net_price: 1510,
      price_per_kilo: 1510,
      pallet_units: 60,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/ALAZAN Yerba Mate 1 kg.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1005',
      sku: '1005',
      brand: 'SELLO ROJO',
      name: 'SELLO ROJO Yerba Mate 500 g',
      description: 'Yerba mate SELLO ROJO de 500 g.',
      stock: 100,
      price: 869.99,
      wholesale_price: 869.99,
      net_price: 719,
      unit_net_price: 719,
      price_per_kilo: 1438,
      pallet_units: 112,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/SELLO ROJO Yerba Mate 500 g.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1006',
      sku: '1006',
      brand: 'SELLO ROJO',
      name: 'SELLO ROJO Yerba Mate 1 kg',
      description: 'Yerba mate SELLO ROJO de 1 kg.',
      stock: 100,
      price: 1727.88,
      wholesale_price: 1727.88,
      net_price: 1428,
      unit_net_price: 1428,
      price_per_kilo: 1428,
      pallet_units: 60,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/SELLO ROJO Yerba Mate 1 kg.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1007',
      sku: '1007',
      brand: 'SELLO NEGRO',
      name: 'SELLO NEGRO Yerba Mate 500 g',
      description: 'Yerba mate SELLO NEGRO de 500 g.',
      stock: 100,
      price: 748.99,
      wholesale_price: 748.99,
      net_price: 619,
      unit_net_price: 619,
      price_per_kilo: 1238,
      pallet_units: 112,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/SELLO NEGRO Yerba Mate 500 g.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'holowaty-1008',
      sku: '1008',
      brand: 'SELLO NEGRO',
      name: 'SELLO NEGRO Yerba Mate 1 kg',
      description: 'Yerba mate SELLO NEGRO de 1 kg.',
      stock: 100,
      price: 1458.05,
      wholesale_price: 1458.05,
      net_price: 1205,
      unit_net_price: 1205,
      price_per_kilo: 1205,
      pallet_units: 60,
      tax_rate: 0.21,
      category_name: 'Yerba Mate',
      image: 'assets/products/holowaty/SELLO NEGRO Yerba Mate 1 kg.jpeg',
      unit_of_measure: 'unidad'
    }
  ];

  constructor(private readonly supabase: SupabaseService) {}

  getProducts(): Observable<Product[]> {
    return this.getCatalogProducts('whatsapp');
  }

  getCommercePosProducts(): Observable<Product[]> {
    return this.getCatalogProducts('commerce-pos');
  }

  getDistributorCatalogProducts(): Observable<Product[]> {
    return this.getCatalogProducts('distributor-pallet');
  }

  getWholesaleCatalogProducts(): Observable<Product[]> {
    return this.getCatalogProducts('wholesale');
  }

  getRetailCatalogProducts(): Observable<Product[]> {
    return this.getCatalogProducts('retail');
  }

  getHolowatyCatalogProducts(): Observable<Product[]> {
    return this.getCatalogProducts('holowaty');
  }

  getPriceCatalogs(): PriceCatalog[] {
    return this.priceCatalogs.map((catalog: PriceCatalog) => ({ ...catalog }));
  }

  getPriceCatalogProducts(catalogId: PriceCatalogId): Observable<Product[]> {
    return this.getCatalogProducts(catalogId);
  }

  saveCatalogPrices(catalogId: PriceCatalogId, updates: ProductPriceUpdate[]): Observable<Product[]> {
    return from(this.supabase.isSchemaAvailable()).pipe(
      switchMap((schemaAvailable: boolean) => {
        if (!schemaAvailable) {
          return of(this.saveLocalCatalogPrices(catalogId, updates));
        }

        return from(this.supabase.saveCatalogPrices(catalogId, updates)).pipe(
          map(() => this.saveLocalCatalogPrices(catalogId, updates))
        );
      })
    );
  }

  private saveLocalCatalogPrices(catalogId: PriceCatalogId, updates: ProductPriceUpdate[]): Product[] {
    const overrides = this.readPriceOverrides();
    const catalogOverrides = { ...(overrides[catalogId] ?? {}) };

    updates.forEach((update: ProductPriceUpdate) => {
      if (Number.isFinite(update.price) && update.price > 0) {
        catalogOverrides[update.productId] = Number(update.price.toFixed(2));
      }
    });

    overrides[catalogId] = catalogOverrides;
    localStorage.setItem(this.priceOverridesStorageKey, JSON.stringify(overrides));

    return this.getCatalogProductsSnapshot(catalogId);
  }

  private getCatalogProducts(catalogId: PriceCatalogId): Observable<Product[]> {
    const localProducts = this.getCatalogProductsSnapshot(catalogId);

    return from(this.supabase.getCatalogPrices(catalogId)).pipe(
      map((remotePrices: Record<string, number>) => this.applyRemotePrices(localProducts, catalogId, remotePrices)),
      catchError(() => of(localProducts))
    );
  }

  private applyRemotePrices(
    products: Product[],
    catalogId: PriceCatalogId,
    remotePrices: Record<string, number>
  ): Product[] {
    return products.map((product: Product) => {
      const remotePrice = remotePrices[product.id];

      if (!Number.isFinite(remotePrice) || remotePrice <= 0) {
        return product;
      }

      if (catalogId === 'holowaty') {
        return { ...product, list_price: remotePrice };
      }

      return { ...product, price: remotePrice, wholesale_price: remotePrice };
    });
  }

  private getCatalogProductsSnapshot(catalogId: PriceCatalogId): Product[] {
    let products: Product[];

    switch (catalogId) {
      case 'commerce-pos':
        products = [...this.baseProducts, ...this.commercePosExtraProducts];
        break;
      case 'wholesale':
        products = this.wholesaleCatalogProducts;
        break;
      case 'retail':
        products = this.retailCatalogProducts;
        break;
      case 'holowaty':
        products = this.holowatyCatalogProducts;
        break;
      case 'distributor-pallet':
        products = this.baseProducts.map((product: Product) => ({
          ...product,
          price: this.distributorPackPrices[product.id] ?? product.price,
          wholesale_price: this.distributorPackPrices[product.id] ?? product.wholesale_price
        }));
        break;
      default:
        products = this.baseProducts;
    }

    const catalogOverrides = this.readPriceOverrides()[catalogId] ?? {};

    return this.cloneProducts(products).map((product: Product) => {
      const overriddenPrice = catalogOverrides[product.id];

      if (typeof overriddenPrice !== 'number') {
        return catalogId === 'holowaty'
          ? { ...product, list_price: this.holowatyListPrices[product.name] ?? product.list_price }
          : product;
      }

      if (catalogId === 'holowaty') {
        return { ...product, list_price: overriddenPrice };
      }

      return { ...product, price: overriddenPrice, wholesale_price: overriddenPrice };
    });
  }

  private readPriceOverrides(): Partial<Record<PriceCatalogId, Record<string, number>>> {
    const storedOverrides = localStorage.getItem(this.priceOverridesStorageKey);

    if (!storedOverrides) {
      return {};
    }

    try {
      return JSON.parse(storedOverrides) as Partial<Record<PriceCatalogId, Record<string, number>>>;
    } catch {
      return {};
    }
  }

  private cloneProducts(products: Product[]): Product[] {
    return products.map((product: Product) => ({
      ...product,
      image_urls: product.image_urls ? [...product.image_urls] : undefined
    }));
  }
}
