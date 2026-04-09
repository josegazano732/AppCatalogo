import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { CartItem } from '../../models/cart-item.model';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-holowaty-catalog',
  templateUrl: './holowaty-catalog.component.html',
  styleUrls: [
    '../whatsapp-catalog/whatsapp-catalog.component.css',
    './holowaty-catalog.component.css'
  ]
})
export class HolowatyCatalogComponent implements OnInit, OnDestroy {
  @ViewChild('pdfExportContent')
  private pdfExportContent?: ElementRef<HTMLElement>;

  private readonly productDisplayOrder: string[] = [
    'YERUPE Yerba Mate 500 g',
    'YERUPE Yerba Mate 1 kg',
    'ALAZAN Yerba Mate 500 g',
    'ALAZAN Yerba Mate 1 kg',
    'SELLO ROJO Yerba Mate 500 g',
    'SELLO ROJO Yerba Mate 1 kg',
    'SELLO NEGRO Yerba Mate 500 g',
    'SELLO NEGRO Yerba Mate 1 kg'
  ];

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  categories: string[] = [];

  searchTerm = '';
  selectedCategory = '';
  commercialDiscounts: Record<string, number> = {};

  isLoading = false;
  isGeneratingPdf = false;
  errorMessage = '';

  currentPage = 1;
  productsPerPage = 12;
  totalPages = 1;

  orderItems: CartItem[] = [];
  orderCount = 0;
  orderSubtotal = 0;

  showWhatsAppConfirmModal = false;
  submitAttempted = false;
  confirmError = '';

  customerBusinessName = '';
  customerContactName = '';
  customerPhone = '';
  observation = '';

  whatsappPhone = '5493758418515';
  private readonly holowatyCategories = ['Yerba Mate'];
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadProducts();

    const cartSub = this.cartService.getCart().subscribe((cartItems: CartItem[]) => {
      this.orderItems = cartItems;
      this.orderCount = cartItems.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);
      this.orderSubtotal = cartItems.reduce((acc: number, item: CartItem) => acc + item.price * item.quantity, 0);
    });

    this.subscriptions.add(cartSub);
  }

  ngOnDestroy(): void {
    this.toggleModalBodyState(false);
    this.subscriptions.unsubscribe();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const productsSub = this.productService.getHolowatyCatalogProducts().subscribe({
      next: (products: Product[]) => {
        const enabledCategories = new Set(this.holowatyCategories.map((item) => this.normalizeText(item)));

        const holowatyProducts = products
          .filter((product: Product) => (product.wholesale_price ?? 0) > 0)
          .filter((product: Product) => enabledCategories.has(this.normalizeText(this.getCategoryLabel(product))))
          .sort((a: Product, b: Product) => this.getProductSortRank(a) - this.getProductSortRank(b));

        this.products = holowatyProducts;
        this.categories = [
          ...new Set(
            holowatyProducts
              .map((product: Product) => this.getCategoryLabel(product))
              .filter((category): category is string => Boolean(category))
          )
        ];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catalogo. Intenta nuevamente.';
        this.isLoading = false;
      }
    });

    this.subscriptions.add(productsSub);
  }

  applyFilters(): void {
    const normalizedSearch = this.normalizeText(this.searchTerm);
    const normalizedCategory = this.normalizeText(this.selectedCategory);

    this.filteredProducts = this.products.filter((product: Product) => {
      const categoryLabel = this.getCategoryLabel(product);
      const searchSource = `${product.name} ${product.description ?? ''} ${categoryLabel} ${product.brand ?? ''} ${product.sku ?? ''}`;
      const categoryMatch = !normalizedCategory || this.normalizeText(categoryLabel) === normalizedCategory;
      const searchMatch = !normalizedSearch || this.normalizeText(searchSource).includes(normalizedSearch);

      return categoryMatch && searchMatch;
    });

    this.currentPage = 1;
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.productsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;
    this.displayedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages) {
      return;
    }

    this.currentPage = nextPage;
    this.updateDisplayedProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async downloadCatalogPdf(): Promise<void> {
    if (!this.pdfExportContent?.nativeElement || this.isGeneratingPdf) {
      return;
    }

    this.isGeneratingPdf = true;

    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      const html2canvas = html2canvasModule.default;
      const exportRoot = this.pdfExportContent.nativeElement;

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f2f5e5'
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 3;
      const imageData = canvas.toDataURL('image/png');
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const widthScale = usableWidth / canvas.width;
      const heightScale = usableHeight / canvas.height;
      const scale = Math.min(widthScale, heightScale);
      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;
      const x = (pageWidth - renderWidth) / 2;
      const y = margin;

      pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight);

      pdf.save('catalogo-holowaty.pdf');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  addOrder(product: Product): void {
    const unitPrice = this.getDiscountedNetPrice(product);

    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity: 1,
      unit_of_measure: product.unit_of_measure,
      category_name: product.category_name,
      category: product.category,
      discount_percent: this.getCommercialDiscountPercent(product)
    });
  }

  increaseOrder(product: Product): void {
    this.addOrder(product);
  }

  decreaseOrder(product: Product): void {
    const quantity = this.getProductQuantity(product.id);
    if (quantity <= 0) {
      return;
    }

    this.cartService.updateQuantity(product.id, quantity - 1);
  }

  clearOrder(): void {
    this.cartService.clearCart();
  }

  openWhatsAppConfirmModal(): void {
    if (this.orderItems.length === 0) {
      this.confirmError = 'Agrega productos antes de enviar la solicitud.';
      return;
    }

    this.confirmError = '';
    this.submitAttempted = false;
    this.showWhatsAppConfirmModal = true;
    this.toggleModalBodyState(true);
  }

  closeWhatsAppConfirmModal(): void {
    this.showWhatsAppConfirmModal = false;
    this.submitAttempted = false;
    this.confirmError = '';
    this.toggleModalBodyState(false);
  }

  isBusinessDataValid(): boolean {
    return this.customerBusinessName.trim().length > 1 && this.customerContactName.trim().length > 1;
  }

  confirmAndSendOrderViaWhatsApp(): void {
    this.submitAttempted = true;

    if (!this.isBusinessDataValid()) {
      this.confirmError = 'Completa razon social y nombre de contacto para continuar.';
      return;
    }

    this.confirmError = '';

    const lines: string[] = [
      'Hola! Quiero solicitar los siguientes productos:',
      '',
      ...this.orderItems.map((item: CartItem) => `${item.quantity} x ${item.name} - ${this.formatPrice(item.price * item.quantity)}`),
      '',
      `Total estimado: ${this.formatPrice(this.orderSubtotal)}`,
      `Razon social: ${this.customerBusinessName.trim()}`,
      `Contacto: ${this.customerContactName.trim()}`
    ];

    if (this.customerPhone.trim()) {
      lines.push(`Telefono: ${this.customerPhone.trim()}`);
    }

    if (this.observation.trim()) {
      lines.push(`Observaciones: ${this.observation.trim()}`);
    }

    const encodedMessage = encodeURIComponent(lines.join('\n'));
    const whatsappUrl = `https://wa.me/${this.whatsappPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    this.closeWhatsAppConfirmModal();
  }

  getProductQuantity(productId: string): number {
    const item = this.orderItems.find((orderItem: CartItem) => orderItem.id === productId);
    return item?.quantity ?? 0;
  }

  onCommercialDiscountChange(product: Product, value: string | number | null): void {
    const sanitizedValue = this.sanitizeDiscountInput(value);
    const normalizedValue = Number(sanitizedValue);

    if (!sanitizedValue || Number.isNaN(normalizedValue)) {
      this.commercialDiscounts[product.id] = 0;
      this.syncOrderItemPrice(product);
      return;
    }

    this.commercialDiscounts[product.id] = this.clampDiscount(normalizedValue);
    this.syncOrderItemPrice(product);
  }

  getCommercialDiscountPercent(product: Product): number {
    return this.clampDiscount(this.commercialDiscounts[product.id] ?? 0);
  }

  getCommercialDiscountInputValue(product: Product): string {
    const discount = this.commercialDiscounts[product.id];
    return discount === undefined ? '' : String(discount);
  }

  getProductsForPdfExport(): Product[] {
    return this.filteredProducts;
  }

  getDiscountedNetPrice(product: Product): number {
    const baseNetPrice = this.getNetPrice(product);
    const discountRate = this.getCommercialDiscountPercent(product) / 100;
    return baseNetPrice * (1 - discountRate);
  }

  getDiscountedGrossPrice(product: Product): number {
    return this.getDiscountedNetPrice(product) * (1 + this.getTaxRate(product));
  }

  getDiscountedPricePerKilo(product: Product): number {
    const discountRate = this.getCommercialDiscountPercent(product) / 100;
    return this.getPricePerKilo(product) * (1 - discountRate);
  }

  getGrossPrice(product: Product): number {
    return (product.wholesale_price ?? 0) > 0 ? (product.wholesale_price as number) : product.price;
  }

  getNetPrice(product: Product): number {
    return product.net_price ?? this.getGrossPrice(product) / (1 + this.getTaxRate(product));
  }

  getUnitNetPrice(product: Product): number {
    return product.unit_net_price ?? this.getNetPrice(product);
  }

  getTaxRate(product: Product): number {
    return product.tax_rate ?? 0.21;
  }

  getPricePerKilo(product: Product): number {
    return product.price_per_kilo ?? this.getGrossPrice(product);
  }

  getPalletUnits(product: Product): number {
    return product.pallet_units ?? 0;
  }

  getCategoryLabel(product: Product): string {
    return product.category_name || product.category || 'Sin categoria';
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private getProductSortRank(product: Product): number {
    const index = this.productDisplayOrder.indexOf(product.name);
    return index >= 0 ? index : this.productDisplayOrder.length;
  }

  private normalizeText(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private toggleModalBodyState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('wa-modal-open', isOpen);
  }

  private syncOrderItemPrice(product: Product): void {
    const quantity = this.getProductQuantity(product.id);
    if (quantity === 0) {
      return;
    }

    this.cartService.updateItemPricing(
      product.id,
      this.getDiscountedNetPrice(product),
      this.getCommercialDiscountPercent(product)
    );
  }

  private clampDiscount(value: number): number {
    return Math.min(100, Math.max(0, Number(value.toFixed(2))));
  }

  private sanitizeDiscountInput(value: string | number | null): string {
    const rawValue = String(value ?? '')
      .replace(',', '.')
      .replace(/-/g, '')
      .replace(/[^\d.]/g, '');

    const parts = rawValue.split('.');
    const integerPart = (parts[0] ?? '').slice(0, 3);
    const decimalPart = parts.length > 1 ? (parts[1] ?? '').slice(0, 2) : '';

    if (!integerPart && !decimalPart) {
      return '';
    }

    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }
}