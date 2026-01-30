# Hol & Lauf — Food-Delivery Plattform

> Eine vollständige Full-Stack Food-Delivery-Anwendung mit Angular 21 Frontend und Express 5 Backend.

---

## Inhaltsverzeichnis

- [Über das Projekt](#-über-das-projekt)
- [Technologie-Stack](#-technologie-stack)
- [Features](#-features)
- [Projektstruktur](#-projektstruktur)
- [Installation](#-installation)
- [Datenbank-Setup](#-datenbank-setup)
- [API-Dokumentation](#-api-dokumentation)
- [Benutzerrollen](#-benutzerrollen)

---

## Über das Projekt

**Hol & Lauf** ist eine moderne Food-Delivery-Plattform, die es Kunden ermöglicht, Essen von lokalen Restaurants zu bestellen. Die Anwendung unterstützt drei verschiedene Benutzerrollen mit jeweils eigenen Dashboards und Funktionen.

---

## 🛠 Technologie-Stack

### Frontend
| Technologie | Version | Beschreibung |

| Angular | 21.x | Frontend-Framework |
| Angular Material | 21.x | UI-Komponenten-Bibliothek |
| TypeScript | 5.9 | Programmiersprache |
| RxJS | 7.8 | Reaktive Programmierung |
| SCSS | Aktuellste Version | Styling |

### Backend
| Technologie | Version | Beschreibung |

| Node.js | Aktuellste Version | Runtime |
| Express | 5.x | Web-Framework |
| PostgreSQL | 18 | Datenbank |
| JWT | 9.x | Authentifizierung |
| bcrypt | 6.x | Passwort-Hashing |

---

## Features

### Für Kunden (Customer)
- Restaurant-Suche und -Filterung
- Detaillierte Restaurant- und Speisekarten-Ansicht
- Warenkorb-Verwaltung
- Bestellverfolgung in Echtzeit
- Bestellhistorie
- Restaurant-Bewertungen
- Treuepunkte-System
- Promo-Code-Einlösung

### Für Restaurant-Besitzer (Restaurant Owner)
- Dashboard mit Statistiken
- Menü-Verwaltung (Kategorien & Gerichte)
- Restaurant-Profil bearbeiten
- Bestellungsübersicht & Status-Updates
- Belohnungen/Rewards erstellen
- Analytics (Top-Gerichte)

### Für Plattform-Administratoren (Site Manager)
- Übersichts-Dashboard (Gesamt-Statistiken)
- Benutzerverwaltung (aktivieren/deaktivieren)
- Restaurant-Verwaltung (genehmigen/löschen)
- Globale Einstellungen (Gebühren, Lieferzonen)
- Promo-Code-Verwaltung
- Reports (Bestellberichte)
- Aktivitäts-Logs

---

## Projektstruktur

```
Web-Technologies-Project/
├── 📁 backend/
│   ├── server.js           # Express-Server mit allen API-Routen
│   ├── db.js               # PostgreSQL-Verbindung
│   ├── database_schema.sql # Vollständiges DB-Schema
│   ├── .env                # Umgebungsvariablen (JWT_SECRET, DB-Config)
│   └── package.json
│
├── 📁 frontend/           #Emojis zur Veranschaulichung genutzt
│   ├── 📁 src/app/
│   │   ├── 📁 customer/              # Kunden-Modul
│   │   │   ├── 📁 components/
│   │   │   │   ├── restaurant-list/  # Restaurant-Übersicht
│   │   │   │   ├── restaurant-detail/# Speisekarte & Details
│   │   │   │   ├── cart/             # Warenkorb
│   │   │   │   ├── my-orders/        # Bestellhistorie
│   │   │   │   └── order-tracking/   # Live-Tracking
│   │   │   └── services/             # Customer-Services
│   │   │
│   │   ├── 📁 restaurant-owner/      # Restaurant-Owner-Modul
│   │   │   ├── dashboard/            # Übersicht
│   │   │   ├── menu-management/      # Menü bearbeiten
│   │   │   ├── restaurant-profile/   # Profil bearbeiten
│   │   │   └── statistics/           # Statistiken
│   │   │
│   │   ├── 📁 site-manager/          # Admin-Modul
│   │   │   ├── dashboard/            # Admin-Dashboard
│   │   │   ├── overview/             # Plattform-Übersicht
│   │   │   ├── user-management/      # Benutzerverwaltung
│   │   │   ├── restaurants/          # Restaurant-Verwaltung
│   │   │   ├── global-settings/      # Einstellungen
│   │   │   └── reports/              # Berichte
│   │   │
│   │   ├── 📁 services/              # Globale Services
│   │   │   ├── user.ts               # User-Service
│   │   │   ├── order.service.ts      # Bestellungen
│   │   │   ├── menu.service.ts       # Menü-Daten
│   │   │   ├── restaurants.ts        # Restaurant-Daten
│   │   │   └── settings.ts           # Einstellungen
│   │   │
│   │   ├── 📁 login/                 # Login-Komponente
│   │   ├── 📁 register/              # Registrierung
│   │   ├── app.routes.ts             # Routing-Konfiguration
│   │   └── auth.interceptor.ts       # JWT-Interceptor
│   │
│   └── package.json
│
└── README.md
```

---

## Installation (vollständigkeitshalber)

### Voraussetzungen
- Node.js (v18+)
- PostgreSQL (v14+)
- npm oder yarn

### 1. Repository klonen
```bash
git clone https://github.com/Felix/Web-Technologies-Project.git
cd Web-Technologies-Project
```

### 2. Backend einrichten
```bash
cd backend
npm install
```

### 3. Umgebungsvariablen konfigurieren
Erstelle/bearbeite `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hollauf
DB_USER=postgres
DB_PASSWORD=dein_passwort
JWT_SECRET=dein_geheimer_schluessel
```

### 4. Frontend einrichten
```bash
cd ../frontend
npm install
```

### 5. Anwendung starten

**Backend starten:**
```bash
cd backend
node server.js
```
> Backend läuft auf `http://localhost:3000`

**Frontend starten:**
```bash
cd frontend
npm start
```
> Frontend läuft auf `http://localhost:4200`

---

## Datenbank-Setup

### PostgreSQL-Datenbank erstellen
```sql
CREATE DATABASE hollauf;
```

### Schema importieren
Führe das Skript aus `backend/database_schema.sql` aus:
```bash
psql -U postgres -d hollauf -f backend/database_schema.sql
```

### Tabellen-Übersicht

| Tabelle | Beschreibung |
|---------|--------------|
| `users` | Benutzer (Kunden, Owner, Admins) |
| `restaurants` | Restaurant-Profile |
| `categories` | Menü-Kategorien pro Restaurant |
| `dishes` | Gerichte/Speisen |
| `orders` | Bestellungen |
| `order_items` | Bestellte Gerichte |
| `rewards` | Treuepunkte-Belohnungen |
| `restaurant_ratings` | Bewertungen |
| `activity_logs` | Aktivitätsprotokoll |
| `global_settings` | Plattform-Einstellungen |
| `promo_codes` | Rabatt-Codes |

---

## API-Dokumentation

### Authentifizierung
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/login` | Benutzer-Login |
| POST | `/api/register` | Registrierung |

### Kunden-Endpunkte
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/customer/restaurants` | Alle aktiven Restaurants |
| GET | `/api/customer/restaurants/:id` | Restaurant-Details |
| GET | `/api/customer/restaurants/:id/menu` | Speisekarte |
| POST | `/api/customer/orders` | Bestellung aufgeben |
| GET | `/api/customer/orders` | Eigene Bestellungen |
| GET | `/api/customer/orders/:id` | Bestelldetails |
| POST | `/api/customer/ratings` | Bewertung abgeben |
| GET | `/api/delivery-fee` | Liefergebühr berechnen |
| POST | `/api/promocodes/verify` | Promo-Code prüfen |

### Restaurant-Owner-Endpunkte
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/restaurant/profile` | Restaurant-Profil |
| PUT | `/api/restaurant/profile` | Profil aktualisieren |
| GET | `/api/restaurant/stats` | Statistiken |
| GET | `/api/categories` | Kategorien laden |
| POST | `/api/categories` | Kategorie erstellen |
| GET | `/api/menu` | Menü laden |
| POST | `/api/menu` | Gericht erstellen |
| DELETE | `/api/menu/:id` | Gericht löschen |
| GET | `/api/orders` | Bestellungen anzeigen |
| PATCH | `/api/orders/:id/status` | Bestellstatus ändern |
| GET/POST/DELETE | `/api/rewards` | Belohnungen verwalten |

### Admin-Endpunkte
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/dashboard/stats` | Plattform-Statistiken |
| GET | `/api/users` | Benutzerliste (paginiert) |
| PUT | `/api/users/:id/status` | Benutzer-Status ändern |
| GET | `/api/admin/restaurants` | Alle Restaurants |
| PUT | `/api/restaurants/:id/approve` | Restaurant genehmigen |
| DELETE | `/api/restaurants/:id` | Restaurant löschen |
| GET/PUT | `/api/settings` | Globale Einstellungen |
| GET/POST/DELETE | `/api/promocodes` | Promo-Codes verwalten |
| GET | `/api/reports/orders` | Bestellreport |

---

## Benutzerrollen

### Customer (Kunde)
- Standardrolle nach Registrierung
- Kann Restaurants durchsuchen und bestellen
- Route: `/customer/*`

### Restaurant Owner
- Bei Registrierung als "restaurant_owner" wird automatisch ein Restaurant erstellt
- Muss vom Admin aktiviert werden
- Route: `/restaurant-owner/*`

### Site Manager (Admin)
- Vollzugriff auf Plattform-Verwaltung
- **Test-Login:** `m@m.m` / `1` (Master-Admin)
- Route: `/admin/*`

---

## Sicherheit

- JWT-basierte Authentifizierung (4h Gültigkeit)
- Passwort-Hashing mit bcrypt (Salt-Rounds: 10)
- Rollenbasierte Zugriffskontrolle
- SQL-Injection-Schutz durch Parameterized Queries

---

## Lizenzen und Erläuterungen

Dieses Projekt wurde im Rahmen des Web-Technologies-Kurses erstellt.
Es handelt sich hioerbei um eine Dokumentation, bei der die Struktur des Projekts und die Funktionalität detailliert erläutert wird. Ebenso wurde die Datenbank-Struktur und die API-Dokumentation detailliert erläutert. Für Genauere Informationen zur Struktur des Projekts und der Funktionalität empfehlen wir die einzelnen Module zu lesen und deren Kommentare zu beachten.
