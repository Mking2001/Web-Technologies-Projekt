import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard';
import { MenuManagementComponent } from './menu-management/menu';
import { OrderManagementComponent } from './statistics/statistics';
import { RestaurantProfileComponent } from './restaurant-profile/profile';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'menu', component: MenuManagementComponent },
  { path: 'orders', component: OrderManagementComponent },
  { path: 'profile', component: RestaurantProfileComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RestaurantOwnerRoutingModule { }