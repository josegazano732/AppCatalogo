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
      name: 'YM x1000g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x1000g para comercios y puntos de venta',
      stock: 100,
      price: 2553.1,
      wholesale_price: 2553.1,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-2',
      name: 'YM x1000g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x1000g para comercios y puntos de venta',
      stock: 100,
      price: 2480.5,
      wholesale_price: 2480.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-3',
      name: 'YM x1000g Mate y Playa TRAD.',
      description: 'Yerba mate Mate y Playa tradicional x1000g para comercios y puntos de venta',
      stock: 100,
      price: 2553.1,
      wholesale_price: 2553.1,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x1000g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-4',
      name: 'YM x500g Caricias de Mate SUAVE',
      description: 'Yerba mate Caricias de Mate suave x500g para comercios y puntos de venta',
      stock: 100,
      price: 1306.8,
      wholesale_price: 1306.8,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate SUAVE.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-5',
      name: 'YM x500g Caricias de Mate TRADICIONAL',
      description: 'Yerba mate Caricias de Mate tradicional x500g para comercios y puntos de venta',
      stock: 100,
      price: 1270.5,
      wholesale_price: 1270.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Caricias de Mate TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-6',
      name: 'YM x500g Mate y Playa TRADICIONAL',
      description: 'Yerba mate Mate y Playa tradicional x500g para comercios y puntos de venta',
      stock: 100,
      price: 1306.8,
      wholesale_price: 1306.8,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa TRADICIONAL.jpeg',
      unit_of_measure: 'unidad'
    },
    {
      id: 'commerce-pos-7',
      name: 'YM x500g Mate y Playa Terere',
      description: 'Yerba mate Mate y Playa terere x500g para comercios y puntos de venta',
      stock: 100,
      price: 1391.5,
      wholesale_price: 1391.5,
      category_name: 'Yerba Mate',
      image: 'assets/products/YM x500g Mate y Playa Terere.jpeg',
      unit_of_measure: 'unidad'
    }
  ];

  getProducts(): Observable<Product[]> {
    return of(this.cloneProducts(this.baseProducts));
  }

  getCommercePosProducts(): Observable<Product[]> {
    return of(this.cloneProducts([...this.baseProducts, ...this.commercePosExtraProducts]));
  }

  private cloneProducts(products: Product[]): Product[] {
    return products.map((product: Product) => ({
      ...product,
      image_urls: product.image_urls ? [...product.image_urls] : undefined
    }));
  }
}
