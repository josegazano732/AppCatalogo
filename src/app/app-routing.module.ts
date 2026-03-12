import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WhatsappCatalogComponent } from './products/whatsapp-catalog/whatsapp-catalog.component';

const routes: Routes = [
  {
    path: 'catalogo-mayorista',
    component: WhatsappCatalogComponent
  },
  {
    path: 'catalogo-whatsapp',
    redirectTo: 'catalogo-mayorista',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'catalogo-mayorista',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
