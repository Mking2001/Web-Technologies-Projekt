import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserService } from '../../services/user';
import { MenuService } from '../../services/menu.service';

/**
 * Restaurant-Profil Verwaltung.
 * Bearbeitet Name, Beschreibung, Adresse, Öffnungszeiten.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class RestaurantProfileComponent implements OnInit {

  // ============ STATE ============
  /** Restaurant-Name (aus Service) */
  restaurantName: string = '';

  /** Profil-Formular Daten */
  profile: any = {
    name: '',
    description: '',
    address: '',
    phone: '',
    opening_days: '',
    opening_hours: '',
    delivery_zone: '',
    zip_code: ''
  };

  /** Verfügbare Lieferzonen */
  availableZones: any[] = [];

  constructor(
    private userService: UserService,
    private menuService: MenuService
  ) { }

  // ============ LIFECYCLE ============
  /** Lädt Profil und Lieferzonen */
  ngOnInit(): void {
    this.loadProfile();
    this.loadDeliveryZones();

    this.menuService.restaurantName$.subscribe(name => {
      this.restaurantName = name;
    });
  }

  // ============ LOAD METHODS ============
  /** Lädt verfügbare Lieferzonen */
  loadDeliveryZones(): void {
    this.menuService.getDeliveryZones().subscribe({
      next: (zones: any[]) => {
        this.availableZones = zones;
      },
      error: (err) => console.error('Fehler beim Laden der Lieferzonen:', err)
    });
  }

  /** Lädt Restaurant-Profil */
  loadProfile(): void {
    this.menuService.getProfile().subscribe({
      next: (data: any) => {
        if (data) {

          let hoursData = data.opening_hours;

          if (typeof hoursData === 'string') {
            try {
              hoursData = JSON.parse(hoursData);
            } catch (e) {
              hoursData = {};
            }
          }

          this.profile = {
            ...data,

            opening_days: hoursData?.days || '',
            opening_hours: hoursData?.hours || '',

            delivery_zone: data.zone || ''
          };

          this.menuService.updateName(data.name);
        }
      },
      error: (err) => console.error('Fehler beim Laden des Profils:', err)
    });
  }

  // ============ SAVE METHODS ============
  /** Speichert Profil-Änderungen */
  saveProfile(): void {

    this.menuService.updateProfile(this.profile).subscribe({
      next: (res: any) => {
        this.menuService.updateName(this.profile.name);
        alert('Profil erfolgreich gespeichert!');
      },
      error: (err) => {
        console.error('Fehler beim Speichern:', err);
        alert('Fehler beim Speichern des Profils.');
      }
    });
  }

  // ============ AUTH ============
  /** Loggt Benutzer aus */
  onLogout(): void {
    this.userService.logout();
  }
}