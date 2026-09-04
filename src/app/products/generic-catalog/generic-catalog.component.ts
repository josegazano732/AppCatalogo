import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Product } from '../../models/product.model';
import { PriceCatalog, ProductService } from '../../services/product.service';

@Component({
  selector: 'app-generic-catalog',
  templateUrl: './generic-catalog.component.html',
  styleUrls: ['./generic-catalog.component.css']
})
export class GenericCatalogComponent implements OnInit, OnDestroy {
  catalog: PriceCatalog | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];
  searchTerm = '';
  selectedCategory = '';
  isLoading = true;
  errorMessage = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productService: ProductService
  ) {}

  ngOnInit(): void {
    const routeSubscription = this.route.paramMap.subscribe((params) => {
      const catalogId = params.get('id') ?? '';
      this.loadCatalog(catalogId);
    });
    this.subscriptions.add(routeSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  applyFilters(): void {
    const search = this.normalizeText(this.searchTerm);
    this.filteredProducts = this.products.filter((product: Product) => {
      const category = this.getCategoryLabel(product);
      return (!this.selectedCategory || category === this.selectedCategory)
        && (!search || this.normalizeText(`${product.name} ${product.description ?? ''} ${category}`).includes(search));
    });
  }

  getCategoryLabel(product: Product): string {
    return product.category_name ?? product.category ?? 'Sin categoria';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
  }

  private loadCatalog(catalogId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    const catalogsSubscription = this.productService.getManagedCatalogs(false).subscribe({
      next: (catalogs: PriceCatalog[]) => {
        this.catalog = catalogs.find((catalog: PriceCatalog) => catalog.id === catalogId) ?? null;
        if (!this.catalog) {
          void this.router.navigate(['/']);
          return;
        }

        const productsSubscription = this.productService.getPriceCatalogProducts(catalogId).subscribe({
          next: (products: Product[]) => {
            this.products = products;
            this.categories = [...new Set(products.map((product: Product) => this.getCategoryLabel(product)))];
            this.applyFilters();
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'No se pudo cargar este catalogo.';
            this.isLoading = false;
          }
        });
        this.subscriptions.add(productsSubscription);
      },
      error: () => {
        this.errorMessage = 'No se pudo verificar el catalogo.';
        this.isLoading = false;
      }
    });
    this.subscriptions.add(catalogsSubscription);
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
