import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './site-manager/dashboard/dashboard';
import { Overview } from './site-manager/overview/overview';
import { UserManagement } from './site-manager/user-management/user-management';
import { Restaurants } from './site-manager/restaurants/restaurants';
import { GlobalSettingsComponent } from './site-manager/global-settings/global-settings';
import { RestaurantOwnerModule } from './restaurant-owner/restaurant-owner-module';
import { RegisterComponent } from './register/register';
import { ReportsComponent } from './site-manager/reports/reports';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { 
        path: 'customer', 
        loadChildren: () => import('./customer/customer-module').then(m => m.CustomerModule) 
    },

    { 
        path: 'admin', 
        component: Dashboard,
    children: [
        { path: '', redirectTo: 'overview', pathMatch: 'full' },
        { path: 'overview', component: Overview},
        { path: 'users', component: UserManagement},
        { path: 'restaurants', component: Restaurants},
        { path: 'settings', component: GlobalSettingsComponent},
        { path: 'reports', component: ReportsComponent}
    ]
},

    {
        path: 'restaurant-owner',
        loadChildren: () => import('./restaurant-owner/restaurant-owner-module').then(m => m.RestaurantOwnerModule)
    },
    { path: 'register', component: RegisterComponent }
];