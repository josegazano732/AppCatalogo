import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DistributorPalletCatalogComponent } from './products/distributor-pallet-catalog/distributor-pallet-catalog.component';
import { WhatsappCatalogComponent } from './products/whatsapp-catalog/whatsapp-catalog.component';

@NgModule({
  declarations: [AppComponent, WhatsappCatalogComponent, DistributorPalletCatalogComponent],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
