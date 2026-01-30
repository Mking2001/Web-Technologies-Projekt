import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

/**
 * Berichte-Komponente für Site-Manager.
 * Zeigt Analytics und Aktivitätsprotokolle.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit {

  // ============ STATE ============
  /** Analytics-Daten (Umsatz, Logins) */
  analyticsData: any = { revenue: [], logins: [] };

  /** Aktivitätsprotokolle */
  logs: any[] = [];

  // ============ PAGINATION STATE ============
  /** Aktuelle Seite */
  currentPage = 1;
  /** Einträge pro Seite */
  pageSize = 10;
  /** Gesamtseiten */
  totalPages = 1;
  /** Gesamtanzahl */
  totalItems = 0;

  /** Suchbegriff */
  searchTerm = '';

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  // ============ LIFECYCLE ============
  /** Lädt Analytics und Logs (nur Browser) */
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAnalytics();
      this.loadLogs();
    }
  }

  // ============ LOAD METHODS ============
  /** Lädt Analytics-Daten */
  loadAnalytics() {
    this.http.get<any>('http://localhost:3000/api/reports/analytics').subscribe({
      next: (data) => this.analyticsData = data,
      error: (err) => console.error(err)
    });
  }

  /** Lädt paginierte Aktivitätsprotokolle */
  loadLogs() {
    const url = `http://localhost:3000/api/reports/activity?page=${this.currentPage}&limit=${this.pageSize}&search=${this.searchTerm}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.logs = res.data;
        this.totalPages = res.totalPages;
        this.totalItems = res.totalItems;
      }
    });
  }

  // ============ FILTER METHODS ============
  /** Führt Suche aus */
  onSearch() {
    this.currentPage = 1;
    this.loadLogs();
  }

  // ============ PAGINATION METHODS ============
  /** Geht zur vorherigen Seite */
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  /** Geht zur nächsten Seite */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }
}