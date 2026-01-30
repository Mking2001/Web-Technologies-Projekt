import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MenuService } from '../services/menu.service';

/**
 * Login-Komponente.
 * Authentifiziert Benutzer und leitet basierend auf Rolle weiter.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  // ============ FORM STATE ============
  /** E-Mail Eingabe */
  email = '';
  /** Passwort Eingabe */
  password = '';
  /** Passwort-Sichtbarkeit */
  hidePassword = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private menuService: MenuService
  ) { }

  // ============ AUTH METHODS ============
  /** Führt Login durch und leitet nach Rolle weiter */
  onLogin() {
    console.log('Versuche Login mit:', this.email);

    this.http.post<any>('http://localhost:3000/api/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);

        if (res.role === 'restaurant_owner' && res.restaurantName) {
          this.menuService.updateName(res.restaurantName);
        }

        if (res.role === 'site_manager') {
          this.router.navigate(['/admin']);
        } else if (res.role === 'restaurant_owner') {
          this.router.navigate(['/restaurant-owner/dashboard']);
        } else {
          this.router.navigate(['/customer']);
        }
      },
      error: (err) => {
        console.error(err);
        alert('Login fehlgeschlagen!');
      }
    });
  }

  // ============ NAVIGATION ============
  /** Navigiert zur Registrierung */
  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
