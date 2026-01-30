import { Component, OnInit, signal, inject, OnDestroy, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

/** Punkt-Interface für Grid-Koordinaten */
interface Point { x: number, y: number }

/**
 * Order-Tracking Komponente.
 * Zeigt Live-Verfolgung der Bestellung auf einer generierten Karte.
 * Simuliert Fahrerbewegung basierend auf Server-Zeitstempeln.
 */
@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.scss']
})
export class OrderTrackingComponent implements OnInit, OnDestroy {

  // ============ INJECTIONS ============

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  orderId = this.route.snapshot.params['id'];

  // ============ STATE ============
  /** Aktueller Bestellstatus */
  orderStatus = signal<string>('loading');
  isSimulating = false;
  pollingInterval: any;
  moveInterval: any;

  /** Grid-Größe für Karten-Generierung */
  gridSize = 12;
  /** 2D-Grid der Karte */
  grid = signal<string[][]>([]);
  restaurantPos: Point = { x: 1, y: 1 };
  customerPos: Point = { x: 10, y: 10 };
  riderPos = signal<Point>({ x: 1, y: 1 });
  deliveryPath = signal<Point[]>([]);
  currentPathIndex = 0;

  /** Verbleibende Zeit in Minuten */
  timeLeft = signal(0);
  /** Ob Bestellung geliefert wurde */
  isDelivered = signal(false);
  /** Zubereitungszeit */
  prepTime = signal(0);
  /** Lieferzeit */
  deliveryTime = signal(0);
  /** Geschätzte Gesamtminuten */
  estimatedMinutes = signal(0);

  // ============ CONSTANTS ============
  /** Millisekunden pro Bewegungsschritt */
  readonly STEP_DURATION_MS = 1000;
  /** Simulierte Minuten pro Schritt */
  readonly SIMULATED_MINUTES_PER_STEP = 1;

  private seed = parseInt(this.orderId) || 12345;

  // ============ COMPUTED ============
  /** Set aller Pfadpunkte für schnellen Lookup */
  pathSet = computed(() => {
    const set = new Set<string>();
    this.deliveryPath().forEach(p => set.add(`${p.x},${p.y}`));
    return set;
  });

  // ============ LIFECYCLE ============
  /** Initialisiert Karte und startet Status-Polling */
  ngOnInit() {
    this.initializeMapAndPath();
    this.startPolling();
  }

  /** Räumt alle Intervalle beim Zerstören auf */
  ngOnDestroy() {
    this.stopAllIntervals();
  }

  // ============ MAP GENERATION ============
  /** Deterministischer Zufallsgenerator basierend auf Order-ID */
  private seededRandom(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /** Generiert Karte und berechnet Pfad mit BFS */
  initializeMapAndPath() {
    this.seed = parseInt(this.orderId) || 12345;
    let pathFound = false;
    let attempts = 0;

    while (!pathFound && attempts < 100) {
      this.generateSeededMap();
      const calculatedPath = this.findPathBFS(this.restaurantPos, this.customerPos);

      if (calculatedPath.length > 0) {
        this.deliveryPath.set(calculatedPath);
        pathFound = true;
        this.timeLeft.set(calculatedPath.length * this.SIMULATED_MINUTES_PER_STEP);
      } else {
        this.seed++;
        attempts++;
      }
    }
    this.riderPos.set(this.restaurantPos);
  }

  /** Generiert deterministisches Grid mit Straßen und Gebäuden */
  generateSeededMap() {
    let newGrid: string[][] = Array(this.gridSize).fill(null).map(() =>
      Array(this.gridSize).fill(null).map(() => this.seededRandom() > 0.75 ? 'building' : 'road')
    );
    newGrid[this.restaurantPos.y][this.restaurantPos.x] = 'road';
    newGrid[this.customerPos.y][this.customerPos.x] = 'road';
    this.grid.set(newGrid);
  }

  // ============ POLLING ============
  /** Startet Intervall zum Abrufen des Bestellstatus */
  startPolling() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.checkOrderStatus();
    this.pollingInterval = setInterval(() => {
      this.checkOrderStatus();
    }, 3000);
  }

  /** Ruft aktuellen Bestellstatus vom Server ab */
  checkOrderStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:3000/api/customer/orders/${this.orderId}`, { headers }).subscribe({
      next: (order) => {
        console.log("--- DEBUG CHECK ---");
        console.log("Order Status:", order.status);
        console.log("Prep Time:", order.prep_time);
        console.log("Estimated Delivery:", order.estimated_delivery);

        if (this.orderStatus() !== order.status) {
          this.orderStatus.set(order.status);
        }

        if (order.prep_time) {
          this.prepTime.set(parseInt(order.prep_time));
        }
        if (order.estimated_delivery) {
          const estimatedTime = new Date(order.estimated_delivery).getTime();
          const now = Date.now();
          const minutesLeft = Math.max(0, Math.ceil((estimatedTime - now) / 60000));
          this.estimatedMinutes.set(minutesLeft);
          this.deliveryTime.set(Math.max(0, minutesLeft - this.prepTime()));
        }

        if (order.status === 'delivered') {
          this.forceFinish();
        }
        else if (order.status === 'on_the_way') {
          this.syncSimulation(order.dispatched_at);
        }
      },
      error: (err) => console.error(err)
    });
  }

  // ============ SIMULATION ============
  /** Synchronisiert Fahrer-Position basierend auf Server-Startzeit */
  syncSimulation(dispatchedAtString: string) {
    if (!dispatchedAtString) {
      console.warn("KEIN DATUM VORHANDEN! Fahre bei 0 los.");
      if (!this.isSimulating && this.orderStatus() === 'on_the_way') {
        this.startSimulationLoop();
      }
      return;
    }

    const dispatchedTime = new Date(dispatchedAtString).getTime();
    const now = Date.now();
    const diffMs = now - dispatchedTime;

    console.log("Zeit Client (jetzt):", new Date(now).toISOString());
    console.log("Zeit Server (Start):", dispatchedAtString);
    console.log("Differenz in ms:", diffMs);

    const safeDiffMs = Math.max(0, diffMs);
    const stepsTaken = Math.floor(safeDiffMs / this.STEP_DURATION_MS);

    console.log("Berechnete Schritte:", stepsTaken);

    const path = this.deliveryPath();

    if (Math.abs(this.currentPathIndex - stepsTaken) > 2 || !this.isSimulating) {
      if (stepsTaken >= path.length) {
        console.log("Ziel erreicht (laut Zeit)");
        this.completeOrder();
      } else {
        console.log("Springe zu Schritt:", stepsTaken);
        this.currentPathIndex = stepsTaken;
        this.riderPos.set(path[this.currentPathIndex]);

        const stepsLeft = path.length - stepsTaken;
        this.timeLeft.set(stepsLeft * this.SIMULATED_MINUTES_PER_STEP);

        if (!this.isSimulating) {
          this.startSimulationLoop();
        }
      }
    }
  }

  /** Startet die Bewegungs-Animation des Fahrers */
  startSimulationLoop() {
    this.isSimulating = true;

    if (this.moveInterval) clearInterval(this.moveInterval);

    this.moveInterval = setInterval(() => {
      this.currentPathIndex++;
      const path = this.deliveryPath();

      if (this.currentPathIndex < path.length) {
        this.riderPos.set(path[this.currentPathIndex]);

        const stepsLeft = path.length - this.currentPathIndex;
        this.timeLeft.set(stepsLeft * this.SIMULATED_MINUTES_PER_STEP);

      } else {
        this.completeOrder();
      }
    }, this.STEP_DURATION_MS);
  }

  /** Erzwingt sofortiges Ende der Lieferung */
  forceFinish() {
    this.stopAllIntervals();
    this.isDelivered.set(true);
    this.orderStatus.set('delivered');
    this.riderPos.set(this.customerPos);
    this.timeLeft.set(0);
  }

  /** Beendet Bestellung und aktualisiert Status beim Server */
  completeOrder() {
    this.stopAllIntervals();
    if (!this.isDelivered()) {
      this.isDelivered.set(true);
      this.orderStatus.set('delivered');
      this.riderPos.set(this.customerPos);

      const token = localStorage.getItem('token');
      if (token) {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        this.http.patch(`http://localhost:3000/api/orders/${this.orderId}/status`,
          { status: 'delivered' }, { headers }).subscribe();
      }
    }
  }

  /** Stoppt alle laufenden Intervalle */
  stopAllIntervals() {
    if (this.moveInterval) clearInterval(this.moveInterval);
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.isSimulating = false;
  }

  // ============ PATH FINDING ============
  /** Findet kürzesten Pfad mittels Breitensuche (BFS) */
  findPathBFS(start: Point, end: Point): Point[] {
    const grid = this.grid();
    const queue: Point[] = [start];
    const visited = new Set<string>();
    const parentMap = new Map<string, Point>();
    visited.add(`${start.x},${start.y}`);
    const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === end.x && current.y === end.y) return this.reconstructPath(parentMap, end);
      for (const dir of directions) {
        const next: Point = { x: current.x + dir.x, y: current.y + dir.y };
        const key = `${next.x},${next.y}`;
        if (next.x >= 0 && next.x < this.gridSize && next.y >= 0 && next.y < this.gridSize &&
          grid[next.y][next.x] === 'road' && !visited.has(key)) {
          visited.add(key);
          parentMap.set(key, current);
          queue.push(next);
        }
      }
    }
    return [];
  }

  /** Rekonstruiert Pfad von Start zu Ziel */
  reconstructPath(parentMap: Map<string, Point>, end: Point): Point[] {
    const path: Point[] = [];
    let current: Point | undefined = end;
    while (current) {
      path.unshift(current);
      current = parentMap.get(`${current.x},${current.y}`);
    }
    return path;
  }

  // ============ NAVIGATION ============
  /** Navigiert zurück zur Bestellliste */
  goBack() {
    this.router.navigate(['/customer/orders']);
  }
}