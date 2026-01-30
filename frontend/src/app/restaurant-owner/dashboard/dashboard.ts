import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';
import { OrderService } from '../../services/order.service';
import { MenuService } from '../../services/menu.service';

/** Lieferzeiten pro Zone in Minuten */
const DELIVERY_TIMES: { [key: string]: number } = {
  'Nordstadt': 15,
  'Hauptstadt': 10,
  'Südstadt': 25,
  '10001': 15,
  '10002': 10,
  '10003': 25,
  'default': 20
};

/** PLZ zu Zonennamen Mapping */
const ZONE_NAMES: { [key: string]: string } = {
  '10001': 'Nordstadt',
  '10002': 'Hauptstadt',
  '10003': 'Südstadt'
};

/**
 * Dashboard für Restaurant-Owner.
 * Verwaltet eingehende, zubereitende und fertige Bestellungen.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DecimalPipe, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // ============ STATE ============
  /** Restaurant-Name */
  restaurantName: string = '';
  /** Alle Bestellungen */
  allOrders: any[] = [];
  /** Auto-Refresh Interval */
  intervalId: any;

  /** Zubereitungszeiten pro Bestellung */
  prepTimes: { [orderId: number]: number } = {};

  constructor(
    private userService: UserService,
    private orderService: OrderService,
    private menuService: MenuService
  ) { }

  // ============ LIFECYCLE ============
  /** Startet Polling für Bestellungen */
  ngOnInit(): void {
    this.menuService.restaurantName$.subscribe(name => {
      this.restaurantName = name;
    });
    this.loadOrders();
    this.intervalId = setInterval(() => this.loadOrders(), 30000);
  }

  /** Stoppt Polling */
  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // ============ LOAD METHODS ============
  /** Lädt alle Bestellungen und berechnet Lieferzeiten */
  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (data: any[]) => {
        this.allOrders = data.map(order => ({
          ...order,
          calculatedPoints: Math.floor(order.total_amount / 10),

          deliveryTime: this.getDeliveryTimeForZone(order.customer_zone),

          customer_zone_name: this.getZoneName(order.customer_zone)
        })).filter(o => o.status !== 'delivered');


        this.allOrders.forEach(order => {
          if (!this.prepTimes[order.id]) {
            this.prepTimes[order.id] = 15;
          }
        });
      },
      error: (err: any) => console.error('Dashboard Fehler:', err)
    });
  }

  // ============ HELPER METHODS ============
  /** Wandelt PLZ/Zone in lesbaren Namen um */
  getZoneName(zoneOrZip: string): string {
    return ZONE_NAMES[zoneOrZip] || zoneOrZip || 'Unbekannt';
  }

  /** Holt Lieferzeit für Zone */
  getDeliveryTimeForZone(zone: string): number {
    return DELIVERY_TIMES[zone] || DELIVERY_TIMES['default'];
  }

  /** Berechnet Gesamtzeit (Zubereitung + Lieferung) */
  getTotalTime(orderId: number, zone: string): number {
    const prepTime = this.prepTimes[orderId] || 15;
    const deliveryTime = this.getDeliveryTimeForZone(zone);
    return prepTime + deliveryTime;
  }

  // ============ COMPUTED ============
  /** Neue Bestellungen */
  get incomingOrders() { return this.allOrders.filter(o => o.status === 'new'); }
  /** Bestellungen in Zubereitung */
  get preparingOrders() { return this.allOrders.filter(o => o.status === 'preparing'); }
  /** Fertige Bestellungen */
  get readyOrders() { return this.allOrders.filter(o => o.status === 'ready' || o.status === 'dispatched'); }

  // ============ ORDER ACTIONS ============
  /** Nimmt Bestellung an und setzt Status auf 'preparing' */
  acceptOrder(orderId: number, customerZone: string): void {
    const prepTime = this.prepTimes[orderId] || 15;

    if (prepTime < 5) {
      alert('Zubereitungszeit muss mindestens 5 Minuten sein!');
      return;
    }

    this.orderService.updateOrderStatus(orderId, 'preparing', prepTime, customerZone).subscribe({
      next: () => {
        console.log(`Bestellung ${orderId} angenommen: ${prepTime}min Zubereitung + Lieferung nach ${customerZone}`);
        this.loadOrders();
      },
      error: (err) => console.error('Fehler beim Annehmen:', err)
    });
  }

  /** Markiert Bestellung als fertig */
  markAsReady(orderId: number): void {
    this.orderService.updateOrderStatus(orderId, 'ready').subscribe(() => {
      this.loadOrders();
    });
  }

  /** Loggt Benutzer aus */
  onLogout(): void {
    this.userService.logout();
  }

  /** Versendet Bestellung (on_the_way) */
  dispatchOrder(orderId: number): void {
    this.orderService.updateOrderStatus(orderId, 'on_the_way').subscribe(() => {
      this.loadOrders();
    });
  }

  /** Lehnt Bestellung ab */
  rejectOrder(orderId: number): void {
    if (confirm('Möchtest du diese Bestellung wirklich ablehnen?')) {
      this.orderService.updateOrderStatus(orderId, 'cancelled').subscribe({
        next: () => {
          this.loadOrders();
        },
        error: (err) => console.error('Fehler beim Ablehnen:', err)
      });
    }
  }
}