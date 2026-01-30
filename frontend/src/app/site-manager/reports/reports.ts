import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent implements OnInit {
  // Analytics Daten
  analyticsData: any = { revenue: [], logins: [] };

  // Activity Log Daten (Pagination)
  logs: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAnalytics();
      this.loadLogs();
    }
  }

  loadAnalytics() {
    this.http.get<any>('http://localhost:3000/api/reports/analytics').subscribe({
      next: (data) => this.analyticsData = data,
      error: (err) => console.error(err)
    });
  }

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

  onSearch() {
    this.currentPage = 1;
    this.loadLogs();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }
}