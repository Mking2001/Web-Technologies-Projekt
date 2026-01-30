import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, OrderReport, PaginatedOrders, DashboardStats } from '../../services/overview';

/**
 * Dashboard-Übersicht für Site-Manager.
 * Zeigt Statistiken und paginierte Bestellberichte.
 */
@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss'
})
export class Overview implements OnInit {

  // ============ STATE ============
  /** Bestellberichte */
  orders: OrderReport[] = [];

  /** Dashboard-Statistiken */
  stats: DashboardStats = {
    users: 0,
    restaurants: 0,
    orders: 0,
    revenue: 0
  };

  // ============ PAGINATION STATE ============
  /** Aktuelle Seite */
  currentPage: number = 1;
  /** Einträge pro Seite */
  pageSize: number = 5;
  /** Gesamtseiten */
  totalPages: number = 1;
  /** Gesamtanzahl */
  totalItems: number = 0;

  // ============ FILTER STATE ============
  /** Suchbegriff */
  searchTerm: string = '';
  /** Sortierfeld */
  sortField: string = 'created_at';
  /** Sortierrichtung */
  sortOrder: string = 'DESC';

  constructor(private dashboardService: DashboardService) { }

  // ============ LIFECYCLE ============
  /** Lädt Bestellungen und Statistiken */
  ngOnInit() {
    this.loadOrders();
    this.loadStats();
  }

  // ============ LOAD METHODS ============
  /** Lädt Dashboard-Statistiken */
  loadStats() {
    this.dashboardService.getStats().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Fehler Statistik:', err)
    });
  }

  /** Lädt paginierte Bestellberichte */
  loadOrders() {
    this.dashboardService.getOrderReports(
      this.currentPage,
      this.pageSize,
      this.searchTerm,
      this.sortField,
      this.sortOrder
    ).subscribe({
      next: (response) => {
        this.orders = response.data;
        this.totalPages = response.totalPages;
        this.totalItems = response.totalItems;
      },
      error: (err) => console.error('Fehler Orders:', err)
    });
  }

  // ============ FILTER/SORT METHODS ============
  /** Führt Suche aus (setzt auf Seite 1) */
  onSearch() {
    this.currentPage = 1;
    this.loadOrders();
  }

  /** Sortiert nach Feld (toggle ASC/DESC) */
  onSort(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortField = field;
      this.sortOrder = 'DESC';
    }
    this.loadOrders();
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
      this.loadOrders();
    }
  }

  /** Geht zur nächsten Seite */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadOrders();
    }
  }
}