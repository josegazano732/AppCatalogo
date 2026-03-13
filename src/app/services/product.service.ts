import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly products: Product[] = [
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
    }
  ];

  getProducts(): Observable<Product[]> {
    return of(this.products);
  }
}
