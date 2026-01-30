import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // HttpHeaders wichtig!

/**
 * Meine Bestellungen Komponente.
 * Zeigt Bestellhistorie des eingeloggten Benutzers.
 */
@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-orders.html',
  styleUrls: ['./my-orders.scss']
})
export class MyOrdersComponent implements OnInit {

  // ============ INJECTIONS ============
  private http = inject(HttpClient);
  private router = inject(Router);

  // ============ STATE ============
  /** Liste aller Bestellungen */
  orders = signal<any[]>([]);
  /** Ladezustand */
  isLoading = signal(true);
  /** Fehlermeldung */
  errorMessage = signal('');

  // ============ LIFECYCLE ============
  /** Lädt Bestellungen beim Start */
  ngOnInit() {
    this.loadOrders();
  }

  // ============ LOAD METHODS ============
  /** Lädt alle Bestellungen des Benutzers */
  loadOrders() {
    this.isLoading.set(true);

    const token = localStorage.getItem('token');

    if (!token) {
      this.errorMessage.set('Bitte einloggen');
      this.isLoading.set(false);
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>('http://localhost:3000/api/customer/orders', { headers }).subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Bestellungen:', err);
        this.errorMessage.set('Konnte Bestellungen nicht laden.');
        this.isLoading.set(false);
      }
    });
  }

  // ============ NAVIGATION ============
  /** Navigiert zur Live-Verfolgung einer Bestellung */
  goToTracking(orderId: number) {
    this.router.navigate(['/customer/order-tracking', orderId]);
  }

  /** Navigiert zurück zur Restaurant-Liste */
  goBack() {
    this.router.navigate(['/customer/restaurant-list']);
  }
}