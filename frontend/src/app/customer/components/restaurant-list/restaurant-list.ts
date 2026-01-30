import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

import { RestaurantService, Restaurant } from '../../../services/restaurants';
import { RecommendationService } from '../../services/recommendation.service';

/** Placeholder-Bilder für Restaurants ohne eigenes Banner */
const RESTAURANT_PLACEHOLDERS = [
  'https://picsum.photos/seed/piz1/800/400',
  'https://picsum.photos/seed/bur2/800/400',
  'https://picsum.photos/seed/pas3/800/400',
  'https://picsum.photos/seed/sus4/800/400',
  'https://picsum.photos/seed/sal5/800/400',
  'https://picsum.photos/seed/ste6/800/400'
];

/**
 * Restaurant-Liste Komponente.
 * Zeigt alle aktiven Restaurants mit Empfehlungen und Suchfilter.
 */
@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './restaurant-list.html',
  styleUrls: ['./restaurant-list.scss']
})
export class RestaurantListComponent implements OnInit {

  // ============ INJECTIONS ============

  private restaurantService = inject(RestaurantService);
  private recommendationService = inject(RecommendationService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  // ============ STATE SIGNALS ============
  /** Alle geladenen Restaurants */
  restaurants = signal<Restaurant[]>([]);
  /** Gefilterte Restaurants nach Suche */
  filteredRestaurants = signal<Restaurant[]>([]);
  /** Top-Empfehlungen */
  recommendations = signal<any[]>([]);
  /** Aktueller Suchbegriff */
  searchTerm = signal('');
  /** Ladezustand */
  isLoading = signal(true);

  // ============ DELIVERY STATE ============
  /** Berechnete Liefergebühr für den Benutzer */
  userDeliveryFee: number | null = null;
  /** PLZ des Benutzers */
  userZip: string = '';
  /** Ob Lieferung möglich ist */
  isDeliverable: boolean = true;

  // ============ LIFECYCLE ============
  /** Initialisierung: Lädt Lieferinfo und Restaurant-Daten */
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserDeliveryInfo();
    }
    this.loadData();
  }

  // ============ NAVIGATION ============
  /** Navigiert zur Bestellhistorie */
  goToOrders() {
    this.router.navigate(['/customer/orders']);
  }

  /** Loggt den Benutzer aus und leitet zum Login weiter */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  // ============ LOAD METHODS ============
  /** Lädt benutzerspezifische Lieferkosten basierend auf PLZ */
  loadUserDeliveryInfo() {
    if (isPlatformBrowser(this.platformId)) {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      if (!token) {
        console.warn('Kein Token gefunden! User ist wohl Gast.');
        return;
      }

      this.http.get<any>('http://localhost:3000/api/delivery-fee').subscribe({
        next: (res) => {
          this.userDeliveryFee = res.fee;
          this.userZip = res.zip;
          this.isDeliverable = res.isDeliverable;
          console.log('Lieferkosten geladen:', this.userDeliveryFee);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Lieferkosten:', err);
          this.userDeliveryFee = null;
        }
      });
    }
  }

  /** Lädt Empfehlungen und Restaurant-Liste vom Server */
  async loadData() {
    this.isLoading.set(true);

    this.recommendationService.getTopRestaurants().subscribe({
      next: (data) => {
        const mappedRecs = data.map((r: any) => {
          const placeholder = RESTAURANT_PLACEHOLDERS[r.id % RESTAURANT_PLACEHOLDERS.length];
          return {
            ...r,
            bannerUrl: r.bannerUrl || placeholder
          };
        });
        this.recommendations.set(mappedRecs);
      },
      error: (err) => console.error('Empfehlungs-Fehler:', err)
    });

    this.restaurantService.getRestaurants().subscribe({
      next: (data: any[]) => {
        const mappedRestaurants: Restaurant[] = data
          .filter(r => r.is_active)
          .map(r => {
            const placeholder = RESTAURANT_PLACEHOLDERS[r.id % RESTAURANT_PLACEHOLDERS.length];

            return {
              id: r.id,
              name: r.name,
              rating: r.rating || 0,
              ratingCount: r.ratingCount || 0,
              cuisine: 'International',
              minOrder: r.minOrder || 0,
              deliveryFee: this.userDeliveryFee !== null ? this.userDeliveryFee : (r.deliveryFee || 2.99),
              deliveryTime: r.deliveryTime || '30-45 min',
              bannerUrl: r.bannerUrl || placeholder,
              tags: r.tags || [],
              totalOrders: r.totalOrders || 0
            } as any;
          });

        this.restaurants.set(mappedRestaurants);
        this.filteredRestaurants.set(mappedRestaurants);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Restaurants:', err);
        this.isLoading.set(false);
      }
    });
  }

  // ============ FILTER METHODS ============
  /** Filtert Restaurants nach Suchbegriff (Name oder Tags) */
  filterRestaurants() {
    const term = this.searchTerm().toLowerCase();
    this.filteredRestaurants.update(() =>
      this.restaurants().filter(r =>
        r.name.toLowerCase().includes(term) ||
        (r.tags && r.tags.some(tag => tag.toLowerCase().includes(term)))
      )
    );
  }
}