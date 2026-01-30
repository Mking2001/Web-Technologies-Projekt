import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

/** Benutzer-Interface */
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  loyalty_points?: number;
}

/** Paginierte Benutzer-Antwort */
export interface PaginatedUsers {
  data: User[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Benutzer-Service.
 * Authentifizierung und Benutzerverwaltung.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private router: Router) { }

  // ============ AUTH METHODS ============
  /** Loggt Benutzer ein und speichert Token */
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem('token', res.token);
        }
      })
    );
  }

  /** Registriert neuen Benutzer */
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  // ============ ADMIN METHODS ============
  /** Lädt paginierte Benutzerliste (Admin) */
  getUsers(
    page: number,
    limit: number,
    search: string = '',
    sortField: string = 'id',
    sortOrder: string = 'ASC'
  ): Observable<PaginatedUsers> {
    const url = `${this.apiUrl}/users?page=${page}&limit=${limit}&search=${search}&sortField=${sortField}&sortOrder=${sortOrder}`;
    return this.http.get<PaginatedUsers>(url);
  }

  /** Ändert Benutzerstatus (Admin) */
  updateStatus(id: number, newStatus: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/status`, { status: newStatus });
  }

  /** Loggt Benutzer aus und leitet zum Login */
  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}