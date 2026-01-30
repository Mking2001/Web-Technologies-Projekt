import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../services/user';
import { MenuService } from '../../services/menu.service';
import { DashboardService, TopDish } from '../../services/overview';

/**
 * Statistiken und Belohnungen für Restaurant-Owner.
 * Zeigt Bestellungen, Umsatz, Top-Gerichte und verwaltet Rewards.
 */
@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss'
})
export class OrderManagementComponent implements OnInit {

  // ============ STATE ============
  /** Restaurant-Name */
  restaurantName: string = '';

  /** Statistik-Daten */
  stats = {
    todayOrderCount: 0,
    weeklyRevenue: 0,
    topDishes: [] as TopDish[]
  };

  /** Alle Belohnungen */
  rewards: any[] = [];

  // ============ REWARD FORM STATE ============
  /** Belohnungsformular sichtbar */
  showRewardForm: boolean = false;
  /** Neue Belohnung */
  newReward = {
    name: '',
    points: null as number | null,
    type: 'fixed_amount',
    value: 0
  };

  constructor(
    private userService: UserService,
    private menuService: MenuService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) { }

  // ============ LIFECYCLE ============
  /** Lädt Restaurant-Name, Analytics und Rewards */
  ngOnInit(): void {

    this.menuService.restaurantName$.subscribe(name => {
      this.restaurantName = name;

      if (name === 'Hol & Lauf Partner') {
        this.menuService.getProfile().subscribe({
          next: (profile) => {
            if (profile && profile.name) {
              this.menuService.updateName(profile.name);
              this.cdr.detectChanges();
            }
          }
        });
      }
      this.cdr.detectChanges();
    });

    this.loadAnalytics();
    this.loadRewards();
  }

  // ============ LOAD METHODS ============
  /** Lädt Statistiken und Top-Gerichte */
  loadAnalytics(): void {
    this.menuService.getRestaurantStats().subscribe({
      next: (data: any) => {
        this.stats.todayOrderCount = data.orderCount;
        this.stats.weeklyRevenue = data.revenue;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Laden der Analytics:', err)
    });

    this.dashboardService.getTopDishes().subscribe({
      next: (dishes: TopDish[]) => {
        this.stats.topDishes = dishes;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Laden der Top-Gerichte:', err)
    });
  }

  /** Lädt alle Belohnungen */
  loadRewards(): void {
    this.menuService.getRewards().subscribe({
      next: (data: any[]) => {
        this.rewards = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Laden der Belohnungen:', err)
    });
  }

  // ============ REWARD CRUD ============
  /** Schaltet Belohnungsformular um */
  toggleRewardForm(): void {
    this.showRewardForm = !this.showRewardForm;
    this.cdr.detectChanges();
  }

  /** Erstellt neue Belohnung */
  createReward(): void {
    if (this.newReward.name && this.newReward.points) {
      this.menuService.addReward(this.newReward).subscribe({
        next: () => {
          this.loadRewards();
          this.newReward = { name: '', points: null, type: 'fixed_amount', value: 0 };
          this.showRewardForm = false;
          this.cdr.detectChanges();
        },
        error: (err) => alert('Fehler beim Speichern: ' + err.message)
      });
    }
  }

  /** Löscht Belohnung nach Bestätigung */
  deleteReward(id: number): void {
    if (confirm('Möchten Sie diese Belohnung wirklich entfernen?')) {
      this.menuService.deleteReward(id).subscribe({
        next: () => {
          this.rewards = this.rewards.filter(r => r.id !== id);
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Fehler beim Löschen der Belohnung:', err)
      });
    }
  }

  // ============ AUTH ============
  /** Loggt Benutzer aus */
  onLogout(): void {
    this.userService.logout();
  }
}