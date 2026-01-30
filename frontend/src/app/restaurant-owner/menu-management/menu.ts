import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // ChangeDetectorRef hinzugefügt
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../services/user';
import { MenuService } from '../../services/menu.service';

/**
 * Menü-Verwaltung für Restaurant-Owner.
 * Verwaltet Kategorien und Gerichte.
 */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})
export class MenuManagementComponent implements OnInit {

  // ============ STATE ============
  /** Restaurant-Name */
  restaurantName: string = '';
  /** Formular sichtbar */
  showForm: boolean = false;
  /** Neue Kategorie Name */
  newCategoryName: string = '';

  /** Alle Gerichte */
  menuItems: any[] = [];
  /** Alle Kategorien */
  categories: any[] = [];

  /** Formular für neues Gericht */
  newItem = {
    name: '',
    description: '',
    price: null as number | null,
    category_id: null as number | null
  };

  constructor(
    private userService: UserService,
    private menuService: MenuService,
    private cdr: ChangeDetectorRef
  ) { }

  // ============ LIFECYCLE ============
  /** Lädt Restaurant-Name und Menü-Daten */
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

    this.loadCategories();
    this.loadMenu();
  }

  // ============ LOAD METHODS ============
  /** Lädt alle Kategorien */
  loadCategories(): void {
    this.menuService.getCategories().subscribe({
      next: (data: any[]) => {
        this.categories = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Laden der Kategorien:', err)
    });
  }

  /** Lädt alle Gerichte */
  loadMenu(): void {
    this.menuService.getDishes().subscribe({
      next: (data: any[]) => {
        this.menuItems = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Laden des Menüs:', err)
    });
  }

  // ============ CRUD METHODS ============
  /** Erstellt neue Kategorie */
  addCategory(): void {
    if (!this.newCategoryName.trim()) {
      alert('Bitte gib einen Kategorienamen ein.');
      return;
    }

    this.menuService.addCategory(this.newCategoryName).subscribe({
      next: () => {
        this.loadCategories();
        this.newCategoryName = '';
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Fehler beim Erstellen der Kategorie:', err)
    });
  }

  /** Schaltet Formular-Sichtbarkeit um */
  toggleForm(): void {
    this.showForm = !this.showForm;
    this.cdr.detectChanges();
  }

  /** Speichert neues Gericht */
  addDish(): void {
    if (this.newItem.name && this.newItem.price && this.newItem.category_id) {
      this.menuService.addDish(this.newItem).subscribe({
        next: (savedDish: any) => {
          this.loadMenu();
          this.newItem = { name: '', description: '', price: null, category_id: null };
          this.showForm = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Speicherfehler:', err);
          alert('Fehler beim Speichern in der Datenbank.');
        }
      });
    } else {
      alert('Bitte füllen Sie alle Felder aus (Name, Preis und Kategorie).');
    }
  }

  /** Löscht Gericht nach Bestätigung */
  deleteDish(id: number): void {
    if (confirm('Möchten Sie dieses Gericht wirklich unwiderruflich löschen?')) {
      this.menuService.deleteDish(id).subscribe({
        next: () => {
          this.menuItems = this.menuItems.filter((i: any) => i.id !== id);
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Fehler beim Löschen:', err)
      });
    }
  }

  // ============ AUTH ============
  /** Loggt Benutzer aus */
  onLogout(): void {
    this.userService.logout();
  }
}