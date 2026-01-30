import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

/**
 * Menü-Service für Restaurant-Owner.
 * Verwaltet Gerichte, Kategorien, Profil und Rewards.
 */
@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private apiUrl = 'http://localhost:3000/api';

  // ============ NAME STATE ============
  /** BehaviorSubject für reaktiven Restaurant-Namen */
  private restaurantNameSubject = new BehaviorSubject<string>('Hol & Lauf Partner');
  /** Observable für Restaurant-Name */
  restaurantName$ = this.restaurantNameSubject.asObservable();

  constructor(private http: HttpClient) { }

  /** Aktualisiert Restaurant-Namen im State */
  updateName(newName: string): void {
    this.restaurantNameSubject.next(newName);
  }

  // ============ DISHES CRUD ============
  /** Lädt alle Gerichte */
  getDishes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/menu`);
  }

  /** Erstellt neues Gericht */
  addDish(dish: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/menu`, dish);
  }

  /** Löscht Gericht */
  deleteDish(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/menu/${id}`);
  }

  // ============ CATEGORIES ============
  /** Lädt alle Kategorien */
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories`);
  }

  /** Erstellt neue Kategorie */
  addCategory(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/categories`, { name });
  }

  // ============ PROFILE ============
  /** Lädt Restaurant-Profil */
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/restaurant/profile`);
  }

  /** Aktualisiert Restaurant-Profil */
  updateProfile(profile: any): Observable<any> {
    const payload = {
      ...profile,
      zone: profile.delivery_zone
    };
    return this.http.put<any>(`${this.apiUrl}/restaurant/profile`, payload);
  }

  // ============ STATS ============
  /** Lädt Restaurant-Statistiken */
  getRestaurantStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/restaurant/stats`);
  }

  // ============ REWARDS ============
  /** Lädt alle Belohnungen */
  getRewards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rewards`);
  }

  /** Erstellt neue Belohnung */
  addReward(reward: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rewards`, reward);
  }

  /** Löscht Belohnung */
  deleteReward(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/rewards/${id}`);
  }

  // ============ DELIVERY ZONES ============
  /** Lädt verfügbare Lieferzonen */
  getDeliveryZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/delivery-zones`);
  }
}