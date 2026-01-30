import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CartService } from '../../services/cart.service';

/**
 * Interface für Belohnungen die gegen Treuepunkte eingelöst werden können.
 */
interface Reward {
  id: number;
  name: string;
  points: number;
  type: string;
  value: number;
}

/**
 * Warenkorb-Komponente.
 * Verwaltet Artikel, Gutscheine, Rewards und den Checkout-Prozess.
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartComponent implements OnInit {

  // ============ INJECTIONS ============

  public cartService = inject(CartService);
  private router = inject(Router);
  private http = inject(HttpClient);

  // ============ STATE SIGNALS ============
  /** Eingegebener Gutscheincode */
  voucherCode = signal('');
  /** Berechneter Gutscheinrabatt in Euro */
  appliedVoucher = signal<number>(0);
  /** Prozentualer Rabatt des angewendeten Codes/Rewards */
  discountPercent = signal<number>(0);
  /** Fehlermeldung bei ungültigem Gutschein */
  voucherError = signal('');

  /** Aktuelle Treuepunkte des Benutzers */
  userPoints = signal<number>(0);
  /** Verfügbare Belohnungen des Restaurants */
  availableRewards = signal<Reward[]>([]);
  /** Aktuell eingelöste Belohnung */
  appliedReward = signal<Reward | null>(null);
  /** Rabattbetrag durch Belohnung */
  rewardDiscount = signal<number>(0);

  // ============ COMPUTED PROPERTIES ============
  /** Berechnet Liefergebühr: Kostenlos ab 30€ Bestellwert */
  deliveryFee = computed(() => {
    return this.cartService.subTotal() > 30 ? 0 : 2.99;
  });

  /** Berechnet Gesamtpreis: Zwischensumme - Rabatte + Lieferung */
  totalPrice = computed(() => {
    const sub = this.cartService.subTotal();
    const discountAmount = this.appliedVoucher() + this.rewardDiscount();
    const total = (sub - discountAmount) + this.deliveryFee();
    return total > 0 ? total : 0;
  });

  // ============ LIFECYCLE ============
  /** Lädt Benutzerpunkte und verfügbare Rewards beim Start */
  ngOnInit(): void {
    this.loadUserPoints();
    this.loadRewards();
  }

  // ============ LOAD METHODS ============
  /** Lädt die aktuellen Treuepunkte des Benutzers vom Server */
  loadUserPoints(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<{ points: number }>('http://localhost:3000/api/user/points', { headers })
      .subscribe({
        next: (res) => this.userPoints.set(res.points),
        error: () => console.log('Punkte konnten nicht geladen werden')
      });
  }

  /** Lädt verfügbare Belohnungen des Restaurants im Warenkorb */
  loadRewards(): void {
    const items = this.cartService.items();
    if (items.length === 0) return;

    const restaurantId = (items[0] as any).restaurantId;
    if (!restaurantId) return;

    this.http.get<Reward[]>(`http://localhost:3000/api/restaurants/${restaurantId}/rewards`)
      .subscribe({
        next: (rewards) => this.availableRewards.set(rewards),
        error: () => console.log('Rewards konnten nicht geladen werden')
      });
  }

  // ============ REWARD METHODS ============
  /** Prüft ob Benutzer genug Punkte für eine Belohnung hat */
  canAfford(reward: Reward): boolean {
    return this.userPoints() >= reward.points;
  }

  /** Löst eine Belohnung gegen Treuepunkte ein */
  redeemReward(reward: Reward): void {
    if (this.userPoints() < reward.points) {
      alert(`Nicht genug Punkte! Du brauchst ${reward.points} Punkte, hast aber nur ${this.userPoints()}.`);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Bitte einloggen um Rewards einzulösen.');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.post<any>('http://localhost:3000/api/rewards/redeem',
      { rewardId: reward.id },
      { headers }
    ).subscribe({
      next: (res) => {
        this.userPoints.set(res.newBalance);
        this.appliedReward.set(reward);

        if (res.rewardType === 'discount_percent') {
          this.discountPercent.set(res.rewardValue);
          this.recalcDiscount();
        } else if (res.rewardType === 'discount_fixed') {
          this.rewardDiscount.set(res.rewardValue);
        }

        alert(`${reward.name} eingelöst! -${reward.points} Punkte`);
      },
      error: (err) => {
        alert(err.error?.error || 'Fehler beim Einlösen');
      }
    });
  }

  // ============ CART MANIPULATION ============
  /** Erhöht die Menge eines Artikels um 1 */
  increaseQty(id: number) {
    this.cartService.updateQuantity(id, 1);
    this.recalcDiscount();
  }

  /** Verringert die Menge eines Artikels um 1 */
  decreaseQty(id: number) {
    this.cartService.updateQuantity(id, -1);
    this.recalcDiscount();
  }

  /** Entfernt einen Artikel nach Bestätigung aus dem Warenkorb */
  removeItem(id: number) {
    if (confirm('Möchten Sie diesen Artikel wirklich entfernen?')) {
      this.cartService.removeItem(id);
      this.recalcDiscount();
    }
  }

  // ============ VOUCHER METHODS ============
  /** Berechnet den Rabattbetrag basierend auf dem Prozentsatz neu */
  recalcDiscount() {
    if (this.discountPercent() > 0) {
      const sub = this.cartService.subTotal();
      const discountAmount = (sub * this.discountPercent()) / 100;
      this.appliedVoucher.set(discountAmount);
    } else {
      this.appliedVoucher.set(0);
    }
  }

  /** Verifiziert Gutscheincode beim Server und wendet Rabatt an */
  applyVoucher() {
    const code = this.voucherCode().trim();
    if (!code) return;

    this.http.post<any>('http://localhost:3000/api/promocodes/verify', { code })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.discountPercent.set(res.discountPercent);
            this.voucherError.set('');
            this.recalcDiscount();
          }
        },
        error: () => {
          this.appliedVoucher.set(0);
          this.discountPercent.set(0);
          this.voucherError.set('Ungültiger Code');
        }
      });
  }

  // ============ CHECKOUT ============
  /** Führt Checkout durch und leitet zum Order-Tracking weiter */
  async checkout() {
    if (this.cartService.count() === 0) return;

    const token = localStorage.getItem('token');

    if (!token) {
      alert('Bitte loggen Sie sich zuerst ein, um zu bestellen.');
      return;
    }

    try {
      const response: any = await this.cartService.checkout(token);

      this.appliedVoucher.set(0);
      this.discountPercent.set(0);
      this.rewardDiscount.set(0);
      this.appliedReward.set(null);

      if (response && response.orderId) {
        this.router.navigate(['/customer/order-tracking', response.orderId]);
      } else {
        this.router.navigate(['/customer/orders']);
      }

    } catch (error) {
      console.error('Fehler beim Checkout:', error);
      alert('Es gab ein Problem bei der Bestellung.');
    }
  }
}