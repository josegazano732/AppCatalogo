import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { CartItem } from '../models/cart-item.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly storageKey = 'appmate_cart';
  private readonly cartSubject = new BehaviorSubject<CartItem[]>(this.loadCart());

  getCart(): Observable<CartItem[]> {
    return this.cartSubject.asObservable();
  }

  getCartValue(): CartItem[] {
    return this.cartSubject.value;
  }

  addToCart(item: CartItem): void {
    const currentCart = [...this.cartSubject.value];
    const existing = currentCart.find((cartItem) => cartItem.id === item.id);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      currentCart.push({ ...item });
    }

    this.persistCart(currentCart);
  }

  updateQuantity(productId: string, quantity: number): void {
    const updated = this.cartSubject.value
      .map((item) => {
        if (item.id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity
        };
      })
      .filter((item) => item.quantity > 0);

    this.persistCart(updated);
  }

  clearCart(): void {
    this.persistCart([]);
  }

  private persistCart(cart: CartItem[]): void {
    this.cartSubject.next(cart);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cart));
    } catch {
      // En entornos sin localStorage solo mantenemos estado en memoria.
    }
  }

  private loadCart(): CartItem[] {
    try {
      const rawCart = localStorage.getItem(this.storageKey);
      if (!rawCart) {
        return [];
      }

      const parsed = JSON.parse(rawCart) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
