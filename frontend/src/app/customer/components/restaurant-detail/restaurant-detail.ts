import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { RestaurantService, Restaurant, MenuCategory, Dish } from '../../../services/restaurants';

/**
 * Restaurant-Detail Komponente.
 * Zeigt Menü, Bewertungen und ermöglicht Bestellungen.
 */
@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './restaurant-detail.html',
  styleUrls: ['./restaurant-detail.scss']
})
export class RestaurantDetailComponent implements OnInit {

  // ============ INJECTIONS ============

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public cartService = inject(CartService);
  private restaurantService = inject(RestaurantService);

  // ============ STATE ============
  /** Aktuelles Restaurant */
  restaurant = signal<Restaurant | null>(null);
  /** Menü-Kategorien mit Gerichten */
  menu = signal<MenuCategory[]>([]);
  /** Bewertungen des Restaurants */
  reviews = signal<any[]>([]);

  // ============ REVIEW FORM STATE ============
  /** Neue Bewertung: Sterne (1-5) */
  newRating = signal(0);
  /** Neue Bewertung: Kommentar */
  newComment = signal('');
  /** Formular wird abgeschickt */
  isSubmitting = signal(false);

  /** Ladezustand */
  isLoading = signal(true);
  /** Fehlermeldung */
  errorMessage = signal('');

  // ============ LIFECYCLE ============
  /** Lädt Restaurant-Daten basierend auf Route-Parameter */
  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadRestaurantData(id);
      } else {
        this.errorMessage.set('Keine Restaurant-ID gefunden.');
        this.isLoading.set(false);
      }
    });
  }

  // ============ NAVIGATION ============
  /** Navigiert zum Warenkorb */
  goToCart() {
    this.router.navigate(['/customer/cart']);
  }

  // ============ LOAD METHODS ============
  /** Lädt Restaurant-Details, Menü und Bewertungen */
  loadRestaurantData(id: string) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.restaurantService.getRestaurantById(id).subscribe({
      next: (data) => this.restaurant.set(data),
      error: (err) => {
        console.error(err);
        this.errorMessage.set('Fehler beim Laden.');
        this.isLoading.set(false);
      }
    });


    this.restaurantService.getMenuByRestaurantId(id).subscribe({
      next: (data) => this.menu.set(data),
      error: (err) => console.error(err)
    });


    this.loadReviews(parseInt(id));
  }

  /** Lädt Bewertungen für ein Restaurant */
  loadReviews(id: number) {
    this.restaurantService.getReviews(id).subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  // ============ REVIEW METHODS ============
  /** Sendet neue Bewertung an Server */
  submitReview() {
    const r = this.restaurant();
    if (!r) return;

    if (this.newRating() === 0) {
      alert('Bitte wählen Sie mindestens einen Stern aus.');
      return;
    }

    this.isSubmitting.set(true);

    const payload = {
      rating: this.newRating(),
      comment: this.newComment()
    };

    this.restaurantService.postReview(r.id, payload).subscribe({
      next: (res: any) => {
        this.newRating.set(0);
        this.newComment.set('');
        this.isSubmitting.set(false);

        this.loadReviews(r.id);

        this.restaurant.update(current => {
          if (current) {
            return {
              ...current,
              rating: parseFloat(res.newRating),
              ratingCount: parseInt(res.newCount)
            };
          }
          return current;
        });

      },
      error: (err) => {
        console.error(err);
        alert('Fehler beim Speichern. Bist du eingeloggt?');
        this.isSubmitting.set(false);
      }
    });
  }


  /** Setzt Sternebewertung */
  setRating(stars: number) {
    this.newRating.set(stars);
  }

  /** Erzeugt Array für Sterne-Anzeige */
  getStars(rating: number) {
    return Array(Math.round(rating)).fill(0);
  }

  // ============ CART METHODS ============
  /** Fügt Gericht zum Warenkorb hinzu */
  addToCart(dish: Dish) {
    const currentRestaurant = this.restaurant();
    if (currentRestaurant) {
      this.cartService.addToCart(dish, currentRestaurant.name, currentRestaurant.id);
    }
  }

  /** Entfernt Gericht aus Warenkorb */
  removeItem(dishId: number) {
    this.cartService.removeItem(dishId);
  }

  /** Scrollt zu Menü-Kategorie */
  scrollToCategory(categoryId: string) {
    document.getElementById(categoryId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Navigiert zurück zur Restaurant-Liste */
  goBack() {
    this.router.navigate(['/customer']);
  }
}