import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Warenkorb-Artikel Interface */
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  restaurantName: string;
  restaurantId: number;
  description?: string;
}

/**
 * Warenkorb-Service.
 * Verwaltet Artikel, Mengen und Checkout-Prozess.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {

  // ============ STATE ============
  /** Alle Artikel im Warenkorb */
  readonly items = signal<CartItem[]>([]);

  // ============ COMPUTED ============
  /** Gesamtanzahl aller Artikel */
  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  /** Zwischensumme aller Artikel */
  readonly subTotal = computed(() =>
    this.items().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );

  constructor(private http: HttpClient) { }

  // ============ CART METHODS ============
  /**
   * Fügt Gericht zum Warenkorb hinzu.
   * Warnt bei Artikeln aus verschiedenen Restaurants.
   */
  addToCart(dish: any, restaurantName: string, restaurantId: number) {
    this.items.update(currentItems => {
      if (currentItems.length > 0 && currentItems[0].restaurantId !== restaurantId) {
        if (!confirm('Du hast bereits Artikel von einem anderen Restaurant im Warenkorb. Warenkorb leeren und neu beginnen?')) {
          return currentItems;
        }
        return [{
          id: dish.id,
          name: dish.name,
          price: dish.price,
          description: dish.description || '',
          imageUrl: dish.imageUrl,
          quantity: 1,
          restaurantName: restaurantName,
          restaurantId: restaurantId
        }];
      }

      const existingItem = currentItems.find(i => i.id === dish.id);

      if (existingItem) {
        return currentItems.map(i =>
          i.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        const newItem: CartItem = {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          description: dish.description || '',
          imageUrl: dish.imageUrl,
          quantity: 1,
          restaurantName: restaurantName,
          restaurantId: restaurantId
        };
        return [...currentItems, newItem];
      }
    });
  }

  /** Entfernt Artikel aus Warenkorb */
  removeItem(itemId: number) {
    this.items.update(currentItems => currentItems.filter(i => i.id !== itemId));
  }

  /** Ändert Menge eines Artikels (min. 1) */
  updateQuantity(itemId: number, delta: number) {
    this.items.update(currentItems => {
      return currentItems.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty > 0 ? newQty : 1 };
        }
        return item;
      });
    });
  }

  /** Leert den gesamten Warenkorb */
  clearCart() {
    this.items.set([]);
  }

  // ============ CHECKOUT ============
  /** Sendet Bestellung an Server und leert Warenkorb */
  async checkout(token: string) {
    const currentItems = this.items();
    const orderData = {
      restaurantId: currentItems[0].restaurantId,
      items: currentItems,
      totalAmount: this.subTotal()
    };

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const res = await firstValueFrom(this.http.post<any>('http://localhost:3000/api/orders', orderData, { headers }));
    this.clearCart();
    return res;
  }
}