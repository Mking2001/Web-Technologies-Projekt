import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';


import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { UserService } from '../services/user';
import { MatSelectModule } from '@angular/material/select';

/**
 * Registrierungs-Komponente.
 * Erstellt neue Benutzerkonten (Kunde oder Restaurant-Owner).
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSelectModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {

  // ============ FORM STATE ============
  /** Vorname */
  firstName = '';
  /** Nachname */
  lastName = '';
  /** E-Mail */
  email = '';
  /** Passwort */
  password = '';
  /** Passwort-Bestätigung */
  confirmPassword = '';

  /** Benutzerrolle */
  role: 'customer' | 'restaurant_owner' = 'customer';

  /** Ausgewählte PLZ */
  selectedZip = '';
  /** Verfügbare Lieferzonen */
  availableZones: any[] = [];
  /** Passwort-Sichtbarkeit */
  hidePassword = true;
  /** Bestätigungs-Passwort-Sichtbarkeit */
  hideConfirmPassword = true;

  constructor(
    private userService: UserService,
    private router: Router,
    private http: HttpClient
  ) { }

  // ============ LIFECYCLE ============
  /** Lädt verfügbare Lieferzonen */
  ngOnInit() {
    this.loadZones();
  }

  // ============ LOAD METHODS ============
  /** Lädt Lieferzonen vom Server */
  loadZones() {
    this.http.get<any[]>('http://localhost:3000/api/delivery-zones').subscribe({
      next: (zones) => this.availableZones = zones,
      error: (err) => console.error('Konnte Zonen nicht laden', err)
    });
  }

  // ============ AUTH METHODS ============
  /** Validiert und sendet Registrierungsformular */
  onRegister() {

    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      alert('Bitte fülle alle Pflichtfelder aus.');
      return;
    }


    if (this.password !== this.confirmPassword) {
      alert('Die Passwörter stimmen nicht überein!');
      return;
    }


    const userData = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      role: this.role,
      zipCode: this.selectedZip
    };


    this.userService.register(userData).subscribe({
      next: (response) => {
        console.log('Registrierung erfolgreich:', response);
        alert('Konto erfolgreich erstellt! Du kannst dich jetzt einloggen.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Fehler bei der Registrierung:', err);

        alert(err.error?.message || 'Registrierung fehlgeschlagen. Bitte versuche es später erneut.');
      }
    });
  }

  // ============ NAVIGATION ============
  /** Navigiert zum Login */
  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}