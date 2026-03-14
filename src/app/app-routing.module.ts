import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DistributorPalletCatalogComponent } from './products/distributor-pallet-catalog/distributor-pallet-catalog.component';
import { WhatsappCatalogComponent } from './products/whatsapp-catalog/whatsapp-catalog.component';

const routes: Routes = [
  {
    path: '',
    component: WhatsappCatalogComponent
  },
  {
    path: 'catalogo-distribuidora-pallet',
    component: DistributorPalletCatalogComponent
  },
  {
    path: 'catalogo-distribuidora',
    redirectTo: 'catalogo-distribuidora-pallet',
    pathMatch: 'full'
  },
  {
    path: 'catalogo-mayorista',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'catalogo-whatsapp',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
