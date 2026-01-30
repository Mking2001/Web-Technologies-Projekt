import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Bestell-Service.
 * API-Aufrufe für Restaurant-Owner Bestellungen.
 */
@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private apiUrl = 'http://localhost:3000/api/orders';

  constructor(private http: HttpClient) { }

  // ============ ORDER METHODS ============
  /** Lädt alle Bestellungen (authentifiziert) */
  getOrders(): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    return this.http.get<any[]>(this.apiUrl, { headers });
  }

  /** Aktualisiert Bestellstatus mit optionaler Zubereitungszeit und Zone */
  updateOrderStatus(orderId: number, status: string, prepTime?: number, customerZone?: string): Observable<any> {
    const body: any = { status };
    if (prepTime) body.prepTime = prepTime;
    if (customerZone) body.customerZone = customerZone;

    return this.http.patch(`${this.apiUrl}/${orderId}/status`, body);
  }

  /** Holt Lieferzeit für bestimmte Zone */
  getDeliveryTime(zone: string): Observable<any> {
    return this.http.get(`http://localhost:3000/api/delivery-time/${zone}`);
  }
}