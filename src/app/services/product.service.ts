import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly baseProducts: Product[] = [
    {
      id: '1',
      name: 'YM DON JULIAN 10x500g PACK',
      description: 'Yerba mate DON JULIAN pack mayorista 10x500g',
      stock: 100,
      price: 15250,
      wholesale_price: 15250,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '2',
      name: 'YM DON JULIAN Pack 10x1kg PACK',
      description: 'Yerba mate DON JULIAN pack mayorista 10x1kg',
      stock: 100,
      price: 29887,
      wholesale_price: 29887,
      category_name: 'Yerba Mate',
      image: 'assets/products/don-julian-nueva.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '3',
      name: 'YM MATEITE 10x500g PACK',
      description: 'Yerba mate MATEITE pack mayorista 10x500g',
      stock: 100,
      price: 16700,
      wholesale_price: 16700,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '4',
      name: 'YM MATEITE 10x1kg PACK',
      description: 'Yerba mate MATEITE pack mayorista 10x1kg',
      stock: 100,
      price: 32791,
      wholesale_price: 32791,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM Mateite.jpeg',
      unit_of_measure: 'pack'
    },
    {
      id: '5',
      name: 'YM YERBELLA 10x500g PACK',
      description: 'Yerba mate YERBELLA pack mayorista 10x500g',
      stock: 100,
      price: 38000,
      wholesale_price: 38000,
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
      price: 30000,
      wholesale_price: 30000,
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
      stock: 100,
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
      price: 2480.5,
      wholesale_price: 2480.5,
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
      price: 3500,
      wholesale_price: 3500,
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
      price: 1270.5,
      wholesale_price: 1270.5,
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

  getProducts(): Observable<Product[]> {
    return of(this.cloneProducts(this.baseProducts));
  }

  getCommercePosProducts(): Observable<Product[]> {
    return of(this.cloneProducts([...this.baseProducts, ...this.commercePosExtraProducts]));
  }

  getWholesaleCatalogProducts(): Observable<Product[]> {
    return of(this.cloneProducts(this.wholesaleCatalogProducts));
  }

  getRetailCatalogProducts(): Observable<Product[]> {
    return of(this.cloneProducts(this.retailCatalogProducts));
  }

  getHolowatyCatalogProducts(): Observable<Product[]> {
    return of(this.cloneProducts(this.holowatyCatalogProducts));
  }

  private cloneProducts(products: Product[]): Product[] {
    return products.map((product: Product) => ({
      ...product,
      image_urls: product.image_urls ? [...product.image_urls] : undefined
    }));
  }
}
