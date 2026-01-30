import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, PaginatedUsers } from '../../services/user';

/**
 * Benutzerverwaltung für Site-Manager.
 * Zeigt paginierte Benutzerliste mit Suche und Sortierung.
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {

  // ============ STATE ============
  /** Benutzerliste */
  users: User[] = [];
  // ============ PAGINATION STATE ============
  /** Aktuelle Seite */
  currentPage: number = 1;
  /** Einträge pro Seite */
  pageSize: number = 10;
  /** Gesamtseiten */
  totalPages: number = 1;
  /** Gesamtanzahl Benutzer */
  totalItems: number = 0;

  // ============ FILTER STATE ============
  /** Suchbegriff */
  searchTerm: string = '';
  /** Sortierfeld */
  sortField: string = 'id';
  /** Sortierrichtung */
  sortOrder: string = 'ASC';

  constructor(
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  // ============ LIFECYCLE ============
  /** Lädt Benutzer beim Start (nur Browser) */
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUsers();
    }
  }

  // ============ LOAD METHODS ============
  /** Lädt Benutzer mit aktuellen Filter-/Sortieroptionen */
  loadUsers() {
    this.userService.getUsers(
      this.currentPage,
      this.pageSize,
      this.searchTerm,
      this.sortField,
      this.sortOrder
    ).subscribe({
      next: (response: PaginatedUsers) => {
        this.users = response.data;
        this.totalPages = response.totalPages;
        this.totalItems = response.totalItems;
      },
      error: (err) => console.error('Fehler:', err)
    });
  }

  // ============ FILTER/SORT METHODS ============
  /** Führt Suche aus (setzt auf Seite 1) */
  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  /** Sortiert nach Feld (toggle ASC/DESC) */
  onSort(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortField = field;
      this.sortOrder = 'ASC';
    }
    this.loadUsers();
  }

  /** Gibt Sortier-Icon für Spalte zurück */
  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  // ============ PAGINATION METHODS ============
  /** Geht zur vorherigen Seite */
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  /** Geht zur nächsten Seite */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  // ============ STATUS METHODS ============
  /** Wechselt Benutzerstatus (aktiv/blockiert) */
  toggleStatus(user: User) {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    if (confirm(`Möchtest du ${user.email} wirklich auf "${newStatus}" setzen?`)) {
      this.userService.updateStatus(user.id, newStatus).subscribe(() => {
        user.status = newStatus;
      });
    }
  }
}
