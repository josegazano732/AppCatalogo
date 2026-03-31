import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommercePosCatalogComponent } from './products/commerce-pos-catalog/commerce-pos-catalog.component';
import { DistributorPalletCatalogComponent } from './products/distributor-pallet-catalog/distributor-pallet-catalog.component';
import { RetailCatalogComponent } from './products/retail-catalog/retail-catalog.component';
import { WhatsappCatalogComponent } from './products/whatsapp-catalog/whatsapp-catalog.component';
import { WholesaleCatalogComponent } from './products/wholesale-catalog/wholesale-catalog.component';

@NgModule({
  declarations: [
    AppComponent,
    WhatsappCatalogComponent,
    DistributorPalletCatalogComponent,
    CommercePosCatalogComponent,
    WholesaleCatalogComponent,
    RetailCatalogComponent
  ],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
