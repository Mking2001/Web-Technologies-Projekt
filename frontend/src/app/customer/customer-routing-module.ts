import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RestaurantListComponent } from './components/restaurant-list/restaurant-list';
import { RestaurantDetailComponent } from './components/restaurant-detail/restaurant-detail';
import { CartComponent } from './components/cart/cart';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking';
import { MyOrdersComponent } from './components/my-orders/my-orders'; // NEU: Importieren!

const routes: Routes = [
  { path: '', redirectTo: 'restaurant-list', pathMatch: 'full' },
  { path: 'restaurant-list', component: RestaurantListComponent },
  { path: 'restaurant/:id', component: RestaurantDetailComponent },
  { path: 'cart', component: CartComponent }, 
  { path: 'orders', component: MyOrdersComponent },
  { path: 'order-tracking/:id', component: OrderTrackingComponent }, 
  { path: 'my-orders', component: OrderTrackingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule { }