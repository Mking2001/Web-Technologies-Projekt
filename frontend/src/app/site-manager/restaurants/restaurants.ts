import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantService, Restaurant } from '../../services/restaurants';

/**
 * Restaurant-Verwaltung für Site-Manager.
 * Genehmigt/Ablehnt neue Restaurants.
 */
@Component({
  selector: 'app-restaurants',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurants.html',
  styleUrl: './restaurants.scss',
})
export class Restaurants implements OnInit {

  // ============ STATE ============
  /** Ausstehende Restaurants */
  pendingRestaurants: Restaurant[] = [];
  /** Aktive Restaurants */
  activeRestaurants: Restaurant[] = [];

  // ============ PAGINATION STATE ============
  /** Aktuelle Seite */
  currentPage: number = 1;
  /** Einträge pro Seite */
  pageSize: number = 10;

  constructor(private restaurantService: RestaurantService) { }

  // ============ LIFECYCLE ============
  /** Lädt alle Restaurants */
  ngOnInit() {
    this.loadRestaurants();
  }

  // ============ LOAD METHODS ============
  /** Lädt Restaurants und trennt nach Status */
  loadRestaurants() {
    this.restaurantService.getAdminRestaurants().subscribe({
      next: (data: Restaurant[]) => {
        this.pendingRestaurants = data.filter(r => !r.is_active);
        this.activeRestaurants = data.filter(r => r.is_active);
      },
      error: (err: any) => console.error('Fehler (Admin):', err)
    });
  }

  // ============ APPROVAL METHODS ============
  /** Genehmigt Restaurant */
  approve(id: number) {
    this.restaurantService.approveRestaurant(id).subscribe(() => {
      this.loadRestaurants();
    });
  }

  /** Lehnt Restaurant ab und löscht es */
  reject(id: number) {
    if (confirm('Möchtest du dieses Restaurant wirklich ablehnen und löschen?')) {
      this.restaurantService.rejectRestaurant(id).subscribe(() => {
        this.loadRestaurants();
      });
    }
  }

  // ============ PAGINATION ============
  /** Berechnet Gesamtseiten */
  get totalPages(): number {
    return Math.ceil(this.activeRestaurants.length / this.pageSize);
  }

  /** Geht zur vorherigen Seite */
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  /** Geht zur nächsten Seite */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}