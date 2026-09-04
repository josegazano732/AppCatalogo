import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { PriceAdminComponent } from './admin/price-admin/price-admin.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CatalogHubComponent } from './home/catalog-hub.component';
import { GenericCatalogComponent } from './products/generic-catalog/generic-catalog.component';
import { CommercePosCatalogComponent } from './products/commerce-pos-catalog/commerce-pos-catalog.component';
import { DistributorPalletCatalogComponent } from './products/distributor-pallet-catalog/distributor-pallet-catalog.component';
import { HolowatyCatalogComponent } from './products/holowaty-catalog/holowaty-catalog.component';
import { RetailCatalogComponent } from './products/retail-catalog/retail-catalog.component';
import { WhatsappCatalogComponent } from './products/whatsapp-catalog/whatsapp-catalog.component';
import { WholesaleCatalogComponent } from './products/wholesale-catalog/wholesale-catalog.component';

@NgModule({
  declarations: [
    AppComponent,
    CatalogHubComponent,
    PriceAdminComponent,
    WhatsappCatalogComponent,
    DistributorPalletCatalogComponent,
    CommercePosCatalogComponent,
    WholesaleCatalogComponent,
    RetailCatalogComponent,
    GenericCatalogComponent,
    HolowatyCatalogComponent
  ],
  imports: [BrowserModule, FormsModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
