import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Empfehlungs-Service.
 * Lädt Top-Restaurants für Kunden.
 */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private apiUrl = 'http://localhost:3000/api/recommendations';

  constructor(private http: HttpClient) { }

  /** Lädt Top-bewertete Restaurants */
  getTopRestaurants(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}