import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerRoutingModule } from './customer-routing-module';


import { RestaurantListComponent } from './components/restaurant-list/restaurant-list';
import { RestaurantDetailComponent } from './components/restaurant-detail/restaurant-detail';
import { CartComponent } from './components/cart/cart';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    CustomerRoutingModule,
    RestaurantListComponent,
    RestaurantDetailComponent,
    CartComponent,
    OrderTrackingComponent
  ]
})
export class CustomerModule { }