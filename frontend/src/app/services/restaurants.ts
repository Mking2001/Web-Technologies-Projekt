import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Restaurant-Daten Interface */
export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  owner_email?: string;
  is_active?: boolean;
  created_at?: string;

  // UI-spezifische Felder
  rating?: number;
  ratingCount?: number;
  minOrder?: number;
  deliveryFee?: number;
  deliveryTime?: string;
  bannerUrl?: string;
  tags?: string[];
}

/** Gericht-Interface */
export interface Dish {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  popular?: boolean;
  is_active?: boolean;
}

/** Menü-Kategorie mit Gerichten */
export interface MenuCategory {
  id: string;
  name: string;
  dishes: Dish[];
}

/**
 * Restaurant-Service.
 * API-Aufrufe für Restaurants, Menüs und Bewertungen.
 */
@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  // ============ PUBLIC METHODS ============
  /** Lädt alle aktiven Restaurants */
  getRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.apiUrl}/restaurants`);
  }

  /** Lädt einzelnes Restaurant nach ID */
  getRestaurantById(id: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.apiUrl}/restaurants/${id}`);
  }

  /** Lädt Menü eines Restaurants */
  getMenuByRestaurantId(id: string): Observable<MenuCategory[]> {
    return this.http.get<MenuCategory[]>(`${this.apiUrl}/restaurants/${id}/menu`);
  }

  // ============ ADMIN METHODS ============
  /** Lädt alle Restaurants für Admin */
  getAdminRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.apiUrl}/admin/restaurants`);
  }

  /** Genehmigt ein Restaurant */
  approveRestaurant(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/restaurants/${id}/approve`, {});
  }

  /** Lehnt ein Restaurant ab / löscht es */
  rejectRestaurant(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/restaurants/${id}`);
  }

  // ============ REVIEW METHODS ============
  /** Lädt Bewertungen eines Restaurants */
  getReviews(restaurantId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/restaurants/${restaurantId}/reviews`);
  }

  /** Erstellt neue Bewertung (authentifiziert) */
  postReview(restaurantId: number, data: { rating: number, comment: string }) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.post(`${this.apiUrl}/restaurants/${restaurantId}/reviews`, data, { headers });
  }
}