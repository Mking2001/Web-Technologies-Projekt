import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Dashboard-Statistiken */
export interface DashboardStats {
  users: number;
  restaurants: number;
  orders: number;
  revenue: number;
}

/** Top-Gericht Interface */
export interface TopDish {
  dish_name: string;
  order_count: number;
}

/** Bestellbericht Interface */
export interface OrderReport {
  id: number;
  customer: string;
  restaurant: string;
  total_amount: number;
  status: string;
  created_at: string;
}

/** Paginierte Bestellungen */
export interface PaginatedOrders {
  data: OrderReport[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Dashboard-Service für Site-Manager.
 * Statistiken, Top-Gerichte und Bestellberichte.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private statsUrl = 'http://localhost:3000/api/dashboard/stats';
  private reportsUrl = 'http://localhost:3000/api/reports/orders';
  private topDishesUrl = 'http://localhost:3000/api/stats/top-dishes';

  constructor(private http: HttpClient) { }

  /** Erstellt Auth-Header mit Token */
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /** Lädt Dashboard-Statistiken */
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.statsUrl, { headers: this.getHeaders() });
  }

  /** Lädt Top-Gerichte */
  getTopDishes(): Observable<TopDish[]> {
    return this.http.get<TopDish[]>(this.topDishesUrl, { headers: this.getHeaders() });
  }

  /** Lädt paginierte Bestellberichte */
  getOrderReports(
    page: number,
    limit: number,
    search: string = '',
    sortField: string = 'created_at',
    sortOrder: string = 'DESC'
  ): Observable<PaginatedOrders> {
    const url = `${this.reportsUrl}?page=${page}&limit=${limit}&search=${search}&sortField=${sortField}&sortOrder=${sortOrder}`;
    return this.http.get<PaginatedOrders>(url, { headers: this.getHeaders() });
  }
}