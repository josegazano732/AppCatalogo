import { Component, OnInit } from '@angular/core';

import { PriceCatalog, ProductService } from '../services/product.service';
import { CatalogPdfDocument, SupabaseService } from '../services/supabase.service';

interface HubCatalogCard {
  id: string;
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
  cards: HubCatalogCard[] = [];

  isLoading = true;
  pdfByCatalog: Record<string, CatalogPdfDocument[]> = {};

  constructor(
    private readonly productService: ProductService,
    private readonly supabase: SupabaseService
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
  }

  getPdfList(catalogId: string): CatalogPdfDocument[] {
    return this.pdfByCatalog[catalogId] ?? [];
  }

  private loadCatalogs(): void {
    this.isLoading = true;
    this.productService.getManagedCatalogs(false).subscribe({
      next: (catalogs: PriceCatalog[]) => {
        this.cards = catalogs.map((catalog: PriceCatalog) => ({
          id: catalog.id,
          title: catalog.name,
          subtitle: catalog.priceLabel,
          route: catalog.route || `/catalogo/${catalog.id}`,
          description: catalog.description
        }));
        void this.loadPdfReferences();
      },
      error: () => {
        this.cards = [];
        this.isLoading = false;
      }
    });
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
