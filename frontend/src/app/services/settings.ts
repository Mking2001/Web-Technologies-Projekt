import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

/** Globale Plattform-Einstellungen */
export interface GlobalSettings {
    platform_fee_percent: number;
    delivery_fee_base: number;
    allowed_delivery_zones?: any;
}

/** Promo-Code Interface */
export interface PromoCode {
    code: string;
    discount_percent: number;
}

/**
 * Einstellungen-Service.
 * Verwaltet globale Plattformeinstellungen und Promo-Codes.
 */
@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private apiUrl = 'http://localhost:3000/api';

    constructor(private http: HttpClient) { }

    // ============ SETTINGS ============
    /** Lädt globale Einstellungen */
    getSettings(): Observable<GlobalSettings> {
        return this.http.get<GlobalSettings>(`${this.apiUrl}/settings`);
    }

    /** Speichert globale Einstellungen */
    updateSettings(settings: GlobalSettings): Observable<any> {
        return this.http.put(`${this.apiUrl}/settings`, settings);
    }

    // ============ PROMO CODES ============
    /** Lädt alle Promo-Codes */
    getPromoCodes(): Observable<PromoCode[]> {
        return this.http.get<PromoCode[]>(`${this.apiUrl}/promocodes`);
    }

    /** Erstellt neuen Promo-Code */
    addPromoCode(code: string, percent: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/promocodes`, { code, discount_percent: percent });
    }

    /** Löscht Promo-Code */
    deletePromoCode(code: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/promocodes/${code}`);
    }
}