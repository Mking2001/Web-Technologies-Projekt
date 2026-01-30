import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, GlobalSettings, PromoCode } from '../../services/settings';

/**
 * Globale Einstellungen für Site-Manager.
 * Verwaltet Plattform-Gebühren, Lieferzonen und Promo-Codes.
 */
@Component({
  selector: 'app-global-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-settings.html',
  styleUrl: './global-settings.scss',
})
export class GlobalSettingsComponent implements OnInit {

  // ============ STATE ============
  /** Plattform-Einstellungen */
  settings: GlobalSettings = {
    platform_fee_percent: 0,
    delivery_fee_base: 0,
    allowed_delivery_zones: {}
  };

  /** Alle Promo-Codes */
  promoCodes: PromoCode[] = [];
  /** Neuer Code: String */
  newCodeStr: string = '';
  /** Neuer Code: Rabatt-Prozent */
  newCodePercent: number | null = null;

  /** Lieferzonen als JSON-String (für Editor) */
  zonesJsonString: string = '';

  constructor(private settingsService: SettingsService) { }

  // ============ LIFECYCLE ============
  /** Lädt Einstellungen und Promo-Codes */
  ngOnInit() {
    this.loadSettings();
    this.loadPromoCodes();
  }

  // ============ SETTINGS METHODS ============
  /** Lädt globale Einstellungen vom Server */
  loadSettings() {
    this.settingsService.getSettings().subscribe({
      next: (data) => {
        console.log('VOM SERVER EMPFANGEN:', data);
        this.settings = data;
        this.zonesJsonString = JSON.stringify(data.allowed_delivery_zones, null, 4);
      },
      error: (err) => console.error('Fehler', err)
    });
  }

  /** Speichert Einstellungen (parsed JSON für Zonen) */
  saveSettings() {
    try {
      const parsedZones = JSON.parse(this.zonesJsonString);

      if (!this.settings) {
        this.settings = {
          platform_fee_percent: 0,
          delivery_fee_base: 0,
          allowed_delivery_zones: {}
        };
      }

      this.settings.allowed_delivery_zones = parsedZones;

      this.settingsService.updateSettings(this.settings).subscribe({
        next: () => alert('Alles gespeichert! '),
        error: (err) => {
          console.error('Server Fehler:', err);
          alert('Fehler beim Speichern: ' + (err.error?.error || err.message));
        }
      });
    } catch (e: any) {
      console.error('JSON Parse Error:', e);
      alert('ACHTUNG: Das JSON für die Zonen ist ungültig!\n\nFehler: ' + e.message);
    }
  }

  // ============ PROMO CODE METHODS ============
  /** Lädt alle Promo-Codes */
  loadPromoCodes() {
    this.settingsService.getPromoCodes().subscribe(data => this.promoCodes = data);
  }

  /** Erstellt neuen Promo-Code */
  addCode() {
    if (this.newCodeStr && this.newCodePercent) {
      this.settingsService.addPromoCode(this.newCodeStr, this.newCodePercent).subscribe({
        next: () => {
          this.loadPromoCodes();
          this.newCodeStr = '';
          this.newCodePercent = null;
        },
        error: () => alert('Fehler: Code existiert wohl schon.')
      });
    }
  }

  /** Löscht Promo-Code nach Bestätigung */
  deleteCode(code: string) {
    if (confirm('Code löschen?')) {
      this.settingsService.deletePromoCode(code).subscribe(() => this.loadPromoCodes());
    }
  }
}

