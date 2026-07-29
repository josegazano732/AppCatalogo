import { Component, OnInit } from '@angular/core';

import { CatalogPdfDocument, SupabaseService } from '../services/supabase.service';

type HubCatalogId = 'wholesale' | 'commerce-pos' | 'retail';

interface HubCatalogCard {
  id: HubCatalogId;
  title: string;
  subtitle: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-catalog-hub',
  templateUrl: './catalog-hub.component.html',
  styleUrls: ['./catalog-hub.component.css']
})
export class CatalogHubComponent implements OnInit {
  readonly cards: HubCatalogCard[] = [
    {
      id: 'wholesale',
      title: 'Catalogo - Mayorista',
      subtitle: 'CATALOGO - MAYORISTA',
      route: '/catalogo-mayorista',
      description: 'Acceso directo al catalogo mayorista con precios por volumen.'
    },
    {
      id: 'commerce-pos',
      title: 'Catalogo - Comercios y Punto de Ventas',
      subtitle: 'COMERCIOS Y PUNTO DE VENTAS',
      route: '/catalogo-comercios-punto-de-ventas',
      description: 'Catalogo orientado a revendedores, kioscos y puntos de venta.'
    },
    {
      id: 'retail',
      title: 'Catalogo Consumidor Final',
      subtitle: 'ANTES: CATALOGO - MINORISTA',
      route: '/catalogo-minorista',
      description: 'Catalogo final para consumo individual con presentacion clara.'
    }
  ];

  isLoading = true;
  pdfByCatalog: Record<HubCatalogId, CatalogPdfDocument[]> = {
    'wholesale': [],
    'commerce-pos': [],
    'retail': []
  };

  constructor(private readonly supabase: SupabaseService) {}

  ngOnInit(): void {
    void this.loadPdfReferences();
  }

  getPdfList(catalogId: HubCatalogId): CatalogPdfDocument[] {
    return this.pdfByCatalog[catalogId] ?? [];
  }

  private async loadPdfReferences(): Promise<void> {
    this.isLoading = true;

    await Promise.all(this.cards.map(async (card: HubCatalogCard) => {
      try {
        const references = await this.supabase.getCatalogPdfReferences(card.id);
        this.pdfByCatalog[card.id] = references;
      } catch {
        this.pdfByCatalog[card.id] = [];
      }
    }));

    this.isLoading = false;
  }
}
