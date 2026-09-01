import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { CartItem } from '../../models/cart-item.model';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-wholesale-catalog',
  templateUrl: './wholesale-catalog.component.html',
  styleUrls: [
    '../whatsapp-catalog/whatsapp-catalog.component.css',
    './wholesale-catalog.component.css'
  ]
})
export class WholesaleCatalogComponent implements OnInit, OnDestroy {
  private readonly pdfExpandedImageSize = 9.6;
  private readonly pdfExpandedImageMinCellHeight = 11.2;
  private readonly pdfSharedImageRowMinCellHeight = 8.6;
  private readonly pdfDetailWidth = 226;

  private readonly productDisplayOrder: string[] = [
    'Mate cocido Don Julian 25Ux2 G.',
    'MC Mate cocido DON JULIAN x20 PACK',
    'YM x500g Don Julian',
    'YM 10x500g Don Julian',
    'YM x1000g Don Julian',
    'YM 10x1000g Don Julian',
    'YM x500 Yerbella ORGANICA',
    'YM 10x500g Yerbella ORGANICA',
    'YM x500g Mateite',
    'YM 10x500g Mateite',
    'YM x1000g Mateite',
    'YM 10x1000g Mateite',
    'YM x500g Caricias de Mate SUAVE',
    'YM 10x500g Caricias de Mate SUAVE',
    'YM x1000g Caricias de Mate SUAVE',
    'YM 10x1000g Caricias de Mate SUAVE',
    'YM x1000g Caricias de Mate TRADICIONAL',
    'YM x500g Caricias de Mate TRADICIONAL',
    'YM 10x500g Caricias de Mate TRADICIONAL',
    'YM 10x1000g Caricias de Mate TRADICIONAL',
    'YM x500g Mate y Playa TRADICIONAL',
    'YM 10x500g Mate y Playa TRADICIONAL',
    'YM x500g Mate y Playa Terere',
    'YM 10x500g Mate y Playa Terere',
    'YM x1000g Mate y Playa TRAD.',
    'YM 10x1000g Mate y Playa TRAD.'
  ];

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  categories: string[] = [];

  searchTerm = '';
  selectedCategory = '';

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

  customerName = '';
  customerLastName = '';
  customerAddress = '';
  customerPostalCode = '';
  paymentMethod = '';
  deliveryMethod = '';

  whatsappPhone = '5493758418515';
  wholesaleCategories = ['Yerba Mate', 'Mate Cocido'];

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

    const productsSub = this.productService.getWholesaleCatalogProducts().subscribe({
      next: (products: Product[]) => {
        const enabledCategories = new Set(this.wholesaleCategories.map((item) => this.normalizeText(item)));

        const wholesaleProducts = products
          .filter((product: Product) => (product.wholesale_price ?? 0) > 0)
          .filter((product: Product) => enabledCategories.has(this.normalizeText(this.getCategoryLabel(product))))
          .sort((a: Product, b: Product) => this.getProductSortRank(a) - this.getProductSortRank(b));

        this.products = wholesaleProducts;
        this.categories = [
          ...new Set(
            wholesaleProducts
              .map((product: Product) => this.getCategoryLabel(product))
              .filter((category): category is string => Boolean(category))
          )
        ];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catalogo mayorista. Intenta nuevamente.';
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
      const categoryMatch = !normalizedCategory || this.normalizeText(categoryLabel) === normalizedCategory;
      const searchSource = `${product.name} ${product.description ?? ''} ${categoryLabel}`;
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
    if (this.filteredProducts.length === 0 || this.isGeneratingPdf) {
      return;
    }

    this.isGeneratingPdf = true;

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const autoTable = autoTableModule.default;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const detailMarginX = (pdf.internal.pageSize.getWidth() - this.pdfDetailWidth) / 2;
      const products = this.getProductsForPdfExport();
      const logoData = await this.loadCircularLogoData('assets/branding/amate-logo.jpg');
      const productImageMap = await this.loadPdfImageMap(products);
      const tableBody: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [];
      const sharedImageGroups = new Map<string, { pageNumber: number; x: number; y: number; width: number; height: number }>();

      this.buildPdfRowsByCategory(products, 'Mate Cocido').forEach((row) => tableBody.push(row));
      this.buildPdfRowsByCategory(products, 'Yerba Mate').forEach((row) => tableBody.push(row));

      this.drawPdfHeader(pdf, logoData);

      autoTable(pdf, {
        startY: 27,
        theme: 'grid',
        tableWidth: 'auto',
        margin: {
          left: detailMarginX,
          right: detailMarginX
        },
        head: [[
          'Descripcion',
          'P. PACK',
          'P. NETO',
          'U. BRUTO',
          'U. NETO',
          'Categoria'
        ]],
        body: tableBody,
        styles: {
          font: 'helvetica',
          fontSize: 5.8,
          cellPadding: { top: 0.35, right: 0.65, bottom: 0.35, left: 0.65 },
          lineColor: [174, 186, 149],
          lineWidth: 0.15,
          textColor: [46, 57, 39],
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [212, 223, 186],
          textColor: [43, 56, 35],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fillColor: [248, 249, 243]
        },
        alternateRowStyles: {
          fillColor: [239, 244, 231]
        },
        columnStyles: {
          0: { cellWidth: 98, halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' }
        },
        didParseCell: (hookData: any) => {
          const rawRow = hookData.row.raw;

          if (Array.isArray(rawRow) && rawRow.length === 1 && typeof rawRow[0] === 'object' && rawRow[0] !== null) {
            hookData.cell.styles['fillColor'] = [226, 234, 204];
            hookData.cell.styles['fontStyle'] = 'bold';
            hookData.cell.styles['textColor'] = [56, 71, 44];
          }

          if (Array.isArray(rawRow) && rawRow.length > 2 && hookData.column.index === 0) {
            const descriptionCell = rawRow[0];
            const sharedImageGroup = typeof descriptionCell === 'object' && descriptionCell !== null ? String((descriptionCell as any).sharedImageGroup ?? '') : '';

            hookData.cell.styles['cellPadding'] = {
              top: sharedImageGroup ? 0.2 : 0.35,
              right: 0.65,
              bottom: sharedImageGroup ? 0.2 : 0.35,
              left: 11.8
            };
            hookData.cell.styles['minCellHeight'] = sharedImageGroup
              ? this.pdfSharedImageRowMinCellHeight
              : this.pdfExpandedImageMinCellHeight;
          }
        },
        didDrawCell: (hookData: any) => {
          const rawRow = hookData.row.raw;

          if (!Array.isArray(rawRow) || rawRow.length <= 2 || hookData.column.index !== 0) {
            return;
          }

          const descriptionCell = rawRow[0];
          const productKey = typeof descriptionCell === 'object' && descriptionCell !== null ? String((descriptionCell as any).productKey ?? '') : '';
          const sharedImageGroup = typeof descriptionCell === 'object' && descriptionCell !== null ? String((descriptionCell as any).sharedImageGroup ?? '') : '';
          const imageData = productImageMap[productKey];

          if (!imageData) {
            return;
          }

          if (sharedImageGroup) {
            const currentPageNumber = hookData.pageNumber ?? pdf.getCurrentPageInfo().pageNumber;
            const existingGroup = sharedImageGroups.get(sharedImageGroup);

            if (!existingGroup || existingGroup.pageNumber !== currentPageNumber) {
              sharedImageGroups.set(sharedImageGroup, {
                pageNumber: currentPageNumber,
                x: hookData.cell.x,
                y: hookData.cell.y,
                width: hookData.cell.width,
                height: hookData.cell.height
              });
              return;
            }

            const combinedTop = existingGroup.y;
            const combinedHeight = (hookData.cell.y + hookData.cell.height) - combinedTop;
            const imageSize = Math.min(this.pdfExpandedImageSize, combinedHeight - 0.8, hookData.cell.width - 1.8);
            const imageX = hookData.cell.x + 0.9;
            const imageY = combinedTop + (combinedHeight - imageSize) / 2;

            try {
              pdf.addImage(imageData, 'PNG', imageX, imageY, imageSize, imageSize);
            } catch {
              // Si alguna imagen falla, mantenemos la exportacion sin interrumpir el PDF.
            }

            sharedImageGroups.delete(sharedImageGroup);
            return;
          }

          const imageSize = Math.min(this.pdfExpandedImageSize, hookData.cell.height - 0.8, hookData.cell.width - 1.8);
          const imageX = hookData.cell.x + 0.9;
          const imageY = hookData.cell.y + (hookData.cell.height - imageSize) / 2;

          try {
            pdf.addImage(imageData, 'PNG', imageX, imageY, imageSize, imageSize);
          } catch {
            // Si alguna imagen falla, mantenemos la exportacion sin interrumpir el PDF.
          }
        }
      });

      pdf.save('catalogo-mayorista-comercial.pdf');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  addOrder(product: Product): void {
    const unitPrice = this.getGrossPrice(product);

    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity: 1,
      unit_of_measure: product.unit_of_measure,
      category_name: product.category_name,
      category: product.category
    });
  }

  increaseOrder(product: Product): void {
    const quantity = this.getProductQuantity(product.id);
    if (quantity === 0) {
      this.addOrder(product);
      return;
    }

    this.cartService.updateQuantity(product.id, quantity + 1);
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
      this.confirmError = 'Agrega productos antes de enviar el pedido.';
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

  onDeliveryMethodChange(method: string): void {
    this.deliveryMethod = method;
    if (method === 'retiro') {
      this.customerAddress = '';
      this.customerPostalCode = '';
    }
  }

  onPostalCodeChange(value: string): void {
    this.customerPostalCode = (value || '').replace(/\D/g, '').slice(0, 5);
  }

  isPaymentSelected(): boolean {
    return this.paymentMethod === 'efectivo' || this.paymentMethod === 'transferencia';
  }

  isDeliverySelected(): boolean {
    return this.deliveryMethod === 'domicilio' || this.deliveryMethod === 'retiro';
  }

  isAddressRequired(): boolean {
    return this.deliveryMethod === 'domicilio';
  }

  isPostalCodeValid(): boolean {
    if (!this.isAddressRequired()) {
      return true;
    }

    const postalCode = this.customerPostalCode.trim();
    return postalCode.length > 0 && /^\d{1,5}$/.test(postalCode);
  }

  getConfirmValidationErrors(): string[] {
    const errors: string[] = [];

    if (this.customerName.trim().length <= 1) {
      errors.push('Ingresa un nombre valido.');
    }

    if (this.customerLastName.trim().length <= 1) {
      errors.push('Ingresa un apellido valido.');
    }

    if (!this.isPaymentSelected()) {
      errors.push('Selecciona un metodo de pago.');
    }

    if (!this.isDeliverySelected()) {
      errors.push('Selecciona un tipo de entrega.');
    }

    if (this.isAddressRequired() && this.customerAddress.trim().length <= 4) {
      errors.push('Ingresa una direccion valida para envio a domicilio.');
    }

    if (!this.isPostalCodeValid()) {
      errors.push('Ingresa un codigo postal valido (hasta 5 digitos) para envio a domicilio.');
    }

    return errors;
  }

  confirmAndSendOrderViaWhatsApp(): void {
    this.submitAttempted = true;

    const validationErrors = this.getConfirmValidationErrors();
    if (validationErrors.length > 0) {
      this.confirmError = validationErrors.join('\n');
      return;
    }

    this.confirmError = '';

    const paymentLabel = this.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia';
    const deliveryLabel = this.deliveryMethod === 'domicilio' ? 'Envio a Domicilio' : 'Retiro por Tienda';

    const lines: string[] = [
      'Hola! Quiero realizar el siguiente pedido mayorista:',
      '',
      ...this.orderItems.map((item: CartItem) => `${item.quantity} x ${item.name} - ${this.formatPrice(item.price * item.quantity)}`),
      '',
      `Total: ${this.formatPrice(this.orderSubtotal)}`,
      `Pago: ${paymentLabel}`,
      `Entrega: ${deliveryLabel}`,
      '',
      `Nombre: ${this.customerName.trim()}`,
      `Apellido: ${this.customerLastName.trim()}`
    ];

    if (this.isAddressRequired()) {
      lines.push(`Direccion: ${this.customerAddress.trim()}`);
      lines.push(`CP: ${this.customerPostalCode.trim()}`);
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

  getWholesalePrice(product: Product): number {
    return (product.wholesale_price ?? 0) > 0 ? (product.wholesale_price as number) : product.price;
  }

  getGrossPrice(product: Product): number {
    return this.getWholesalePrice(product) * this.getUnitDivisor(product);
  }

  getNetPriceWithoutTax(product: Product): number {
    return this.getGrossPrice(product) / 1.21;
  }

  getUnitPrice(product: Product): number {
    return this.getWholesalePrice(product);
  }

  getUnitGrossPrice(product: Product): number {
    return this.getUnitPrice(product);
  }

  getUnitNetPriceWithoutTax(product: Product): number {
    return this.getUnitGrossPrice(product) / 1.21;
  }

  getPriceColumnLabel(): string {
    return 'Precio bruto c/IVA';
  }

  getProductsForPdfExport(): Product[] {
    return this.filteredProducts;
  }

  getPdfSearchLabel(): string {
    return this.searchTerm.trim() || 'Sin filtro';
  }

  getPdfCategoryLabel(): string {
    return this.selectedCategory || 'Todas las categorias';
  }

  getPdfGeneratedDateLabel(): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  private buildPdfRowsByCategory(products: Product[], sourceCategoryLabel: string): Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> {
    const categoryProducts = products.filter(
      (product: Product) => this.normalizeText(this.getCategoryLabel(product)) === this.normalizeText(sourceCategoryLabel)
    ).sort((a: Product, b: Product) => this.getPdfProductSortRank(a) - this.getPdfProductSortRank(b));

    if (categoryProducts.length === 0) {
      return [];
    }

    const rows: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [[{
      content: sourceCategoryLabel,
      colSpan: 6,
      styles: {
        halign: 'left'
      }
    }]];

    categoryProducts.forEach((product: Product) => {
      rows.push([
        {
          content: this.getPdfDescription(product),
          productKey: this.getPdfRowCode(product),
          sharedImageGroup: this.getPdfSharedImageGroup(product),
          useLargeSingleImage: this.shouldUseLargeSinglePdfImage(product)
        } as any,
        this.formatCompactPrice(this.getGrossPrice(product)),
        this.formatCompactPrice(this.getNetPriceWithoutTax(product)),
        this.formatCompactPrice(this.getUnitGrossPrice(product)),
        this.formatCompactPrice(this.getUnitNetPriceWithoutTax(product)),
        this.getCategoryLabel(product)
      ]);
    });

    return rows;
  }

  private getPdfDescription(product: Product): string {
    if (this.shouldUseLargeSinglePdfImage(product)) {
      return `${product.name}\n `;
    }

    if (this.normalizeText(this.getCategoryLabel(product)) === this.normalizeText('Yerba Mate')) {
      return product.name;
    }

    const extraDetail = product.description ? `\n${product.description}` : '';
    return `${product.name}${extraDetail}`;
  }

  private getPdfProductSortRank(product: Product): number {
    const pdfDisplayOrder = [
      'Mate cocido Don Julian 25Ux2 G.',
      'MC Mate cocido DON JULIAN x20 PACK',
      'YM x500g Don Julian',
      'YM 10x500g Don Julian',
      'YM x1000g Don Julian',
      'YM 10x1000g Don Julian',
      'YM x500 Yerbella ORGANICA',
      'YM 10x500g Yerbella ORGANICA',
      'YM x500g Mateite',
      'YM 10x500g Mateite',
      'YM x1000g Mateite',
      'YM 10x1000g Mateite',
      'YM x500g Caricias de Mate SUAVE',
      'YM 10x500g Caricias de Mate SUAVE',
      'YM x1000g Caricias de Mate SUAVE',
      'YM 10x1000g Caricias de Mate SUAVE',
      'YM x500g Caricias de Mate TRADICIONAL',
      'YM 10x500g Caricias de Mate TRADICIONAL',
      'YM x1000g Caricias de Mate TRADICIONAL',
      'YM 10x1000g Caricias de Mate TRADICIONAL',
      'YM x500g Mate y Playa TRADICIONAL',
      'YM 10x500g Mate y Playa TRADICIONAL',
      'YM x1000g Mate y Playa TRAD.',
      'YM 10x1000g Mate y Playa TRAD.',
      'YM x500g Mate y Playa Terere',
      'YM 10x500g Mate y Playa Terere'
    ];

    const index = pdfDisplayOrder.indexOf(product.name);
    return index >= 0 ? index : pdfDisplayOrder.length;
  }

  private getPdfRowCode(product: Product): string {
    return product.sku?.trim() || product.id;
  }

  private getPdfSharedImageGroup(product: Product): string | null {
    const normalizedName = this.normalizeText(product.name);

    if (normalizedName === this.normalizeText('YM 10x500g Don Julian') || normalizedName === this.normalizeText('YM 10x1000g Don Julian')) {
      return 'ym-don-julian-shared';
    }

    if (normalizedName === this.normalizeText('YM 10x500g Mateite') || normalizedName === this.normalizeText('YM 10x1000g Mateite')) {
      return 'ym-mateite-shared';
    }

    if (normalizedName === this.normalizeText('YM 10x500g Caricias de Mate SUAVE') || normalizedName === this.normalizeText('YM 10x1000g Caricias de Mate SUAVE')) {
      return 'ym-caricias-suave-shared';
    }

    if (normalizedName === this.normalizeText('YM 10x500g Mate y Playa TRADICIONAL') || normalizedName === this.normalizeText('YM 10x1000g Mate y Playa TRAD.')) {
      return 'ym-mate-y-playa-tradicional-shared';
    }

    if (normalizedName === this.normalizeText('YM 10x500g Caricias de Mate TRADICIONAL') || normalizedName === this.normalizeText('YM x1000g Caricias de Mate TRADICIONAL')) {
      return 'ym-caricias-tradicional-shared';
    }

    return null;
  }

  private shouldUseLargeSinglePdfImage(product: Product): boolean {
    const normalizedName = this.normalizeText(product.name);

    return normalizedName === this.normalizeText('YM 10x500g Yerbella ORGANICA')
      || normalizedName === this.normalizeText('YM 10x500g Mate y Playa Terere');
  }

  private async loadPdfImageMap(products: Product[]): Promise<Record<string, string>> {
    const entries = await Promise.all(
      products.map(async (product: Product) => {
        const imageData = await this.loadPdfThumbnailDataFromCandidates(this.getPdfImagePaths(product));
        return [this.getPdfRowCode(product), imageData] as const;
      })
    );

    return entries.reduce((acc: Record<string, string>, [key, value]) => {
      if (value) {
        acc[key] = value;
      }

      return acc;
    }, {});
  }

  private getPdfImagePaths(product: Product): string[] {
    if (!product.image) {
      return [];
    }

    const normalizedName = this.normalizeText(product.name);

    if (normalizedName === this.normalizeText('MC Mate cocido DON JULIAN x20 PACK')) {
      return [
        'assets/pdf-products/MC Mate cocido DON JULIAN.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Yerbella ORGANICA')) {
      return [
        'assets/pdf-products/YM Yerbella ORGANICA.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Don Julian') || normalizedName === this.normalizeText('YM 10x1000g Don Julian')) {
      return [
        'assets/pdf-products/YM Don Julian.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Caricias de Mate SUAVE') || normalizedName === this.normalizeText('YM 10x1000g Caricias de Mate SUAVE')) {
      return [
        'assets/pdf-products/YM Caricias de Mate SUAVE.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Mate y Playa TRADICIONAL') || normalizedName === this.normalizeText('YM 10x1000g Mate y Playa TRAD.')) {
      return [
        'assets/pdf-products/YM  Mate y Playa TRADICIONAL.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Mate y Playa Terere')) {
      return [
        'assets/pdf-products/YM 10x500g Mate y Playa Terere.jpeg',
        product.image
      ];
    }

    if (normalizedName === this.normalizeText('YM 10x500g Caricias de Mate TRADICIONAL') || normalizedName === this.normalizeText('YM x1000g Caricias de Mate TRADICIONAL')) {
      return [
        'assets/pdf-products/YM Caricias de Mate TRADICIONAL.jpeg',
        product.image
      ];
    }

    const pdfImagePath = this.getPdfFolderImagePath(product.image);
    return pdfImagePath ? [pdfImagePath, product.image] : [product.image];
  }

  private getPdfFolderImagePath(imagePath: string): string | null {
    const imageFileName = imagePath.split('/').pop();

    if (!imageFileName) {
      return null;
    }

    return `assets/pdf-products/${imageFileName}`;
  }

  private async loadPdfThumbnailDataFromCandidates(imagePaths: string[]): Promise<string | null> {
    for (const imagePath of imagePaths) {
      const thumbnailData = await this.loadPdfThumbnailData(imagePath);

      if (thumbnailData) {
        return thumbnailData;
      }
    }

    return null;
  }

  private async loadPdfThumbnailData(imagePath?: string): Promise<string | null> {
    const sourceData = await this.loadProductImageData(imagePath);

    if (!sourceData || typeof document === 'undefined') {
      return null;
    }

    return await new Promise<string | null>((resolve) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);
          return;
        }

        const size = 180;
        const innerSize = 148;
        const ratio = Math.min(innerSize / image.width, innerSize / image.height);
        const renderWidth = image.width * ratio;
        const renderHeight = image.height * ratio;
        const renderX = (size - renderWidth) / 2;
        const renderY = (size - renderHeight) / 2;

        canvas.width = size;
        canvas.height = size;

        context.fillStyle = '#f6f8ee';
        context.fillRect(0, 0, size, size);
        context.strokeStyle = '#d3dcc0';
        context.lineWidth = 4;
        context.strokeRect(2, 2, size - 4, size - 4);
        context.drawImage(image, renderX, renderY, renderWidth, renderHeight);

        resolve(canvas.toDataURL('image/png'));
      };

      image.onerror = () => resolve(null);
      image.src = sourceData;
    });
  }

  private async loadProductImageData(imagePath?: string): Promise<string | null> {
    if (!imagePath || typeof fetch === 'undefined' || typeof FileReader === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    try {
      const response = await fetch(new URL(imagePath, document.baseURI).toString());

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();

      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private async loadCircularLogoData(imagePath?: string): Promise<string | null> {
    const sourceData = await this.loadProductImageData(imagePath);

    if (!sourceData || typeof document === 'undefined') {
      return null;
    }

    return await new Promise<string | null>((resolve) => {
      const image = new Image();

      image.onload = () => {
        const size = 220;
        const padding = 12;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = size;
        canvas.height = size;

        context.clearRect(0, 0, size, size);
        context.save();
        context.beginPath();
        context.arc(size / 2, size / 2, (size / 2) - padding, 0, Math.PI * 2);
        context.closePath();
        context.clip();

        const ratio = Math.max((size - (padding * 2)) / image.width, (size - (padding * 2)) / image.height);
        const renderWidth = image.width * ratio;
        const renderHeight = image.height * ratio;
        const renderX = (size - renderWidth) / 2;
        const renderY = (size - renderHeight) / 2;

        context.drawImage(image, renderX, renderY, renderWidth, renderHeight);
        context.restore();

        context.beginPath();
        context.arc(size / 2, size / 2, (size / 2) - padding, 0, Math.PI * 2);
        context.closePath();
        context.lineWidth = 6;
        context.strokeStyle = '#d3dcc0';
        context.stroke();

        resolve(canvas.toDataURL('image/png'));
      };

      image.onerror = () => resolve(null);
      image.src = sourceData;
    });
  }

  private drawPdfHeader(pdf: any, logoData: string | null): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const headerX = (pageWidth - this.pdfDetailWidth) / 2;
    const headerY = 8;
    const headerWidth = this.pdfDetailWidth;
    const headerHeight = 17;

    pdf.setFillColor(248, 249, 243);
    pdf.roundedRect(headerX, headerY, headerWidth, headerHeight, 1.8, 1.8, 'F');

    pdf.setFillColor(84, 111, 63);
    pdf.roundedRect(headerX, headerY, headerWidth, 2.4, 1.8, 1.8, 'F');
    pdf.rect(headerX, headerY + 1.2, headerWidth, 1.2, 'F');

    pdf.setDrawColor(205, 214, 181);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(headerX, headerY, headerWidth, headerHeight, 1.8, 1.8, 'S');

    pdf.setTextColor(94, 119, 73);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.4);
    pdf.text('sansaju.ventas@gmail.com', headerX + 4.2, headerY + 5.2);

    pdf.setTextColor(42, 59, 33);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.text('Whatsapp 3758-418515', headerX + 4.2, headerY + 9);

    pdf.setTextColor(43, 52, 36);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.1);
    pdf.text(`Lista mayorista - ${this.getPdfGeneratedDateLabel()}`, headerX + (headerWidth / 2), headerY + 6.9, { align: 'center' });

    pdf.setTextColor(92, 107, 81);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    pdf.text('Detalle de precios mayoristas segun la vista actual', headerX + (headerWidth / 2), headerY + 10.6, { align: 'center' });

    if (logoData) {
      try {
        const logoAnchorRight = headerX + headerWidth - 4.2;
        const logoCenterY = headerY + (headerHeight / 2) + 0.8;
        const maxLogoWidth = 18.5;
        const maxLogoHeight = 11.5;
        const logoProps = pdf.getImageProperties(logoData);
        const logoRatio = logoProps.width / logoProps.height;
        let renderWidth = maxLogoWidth;
        let renderHeight = renderWidth / logoRatio;

        if (renderHeight > maxLogoHeight) {
          renderHeight = maxLogoHeight;
          renderWidth = renderHeight * logoRatio;
        }

        const renderX = logoAnchorRight - renderWidth;
        const renderY = logoCenterY - (renderHeight / 2);

        pdf.addImage(logoData, 'PNG', renderX, renderY, renderWidth, renderHeight);
      } catch {
        // Si el logo no se puede renderizar, el PDF sigue sin interrumpirse.
      }
    }

    pdf.setDrawColor(214, 221, 191);
    pdf.line(headerX, 24.8, headerX + headerWidth, 24.8);
  }

  private formatCompactPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  getDisplayNetPriceLabel(product: Product): string {
    return 'Precio pack neto s/IVA';
  }

  getDisplayGrossPriceLabel(product: Product): string {
    return 'Precio pack bruto c/IVA';
  }

  isPackProduct(product: Product): boolean {
    return true;
  }

  getSuggestedSaleMin(product: Product): number {
    return this.getUnitGrossPrice(product) * 1.4;
  }

  getSuggestedSaleMax(product: Product): number {
    return this.getUnitGrossPrice(product) * 1.5;
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
    const normalizedName = this.normalizeText(product.name);
    const firstDonJulianIndex = this.productDisplayOrder.findIndex((name: string) => this.normalizeText(name).includes('don julian'));

    if (normalizedName.includes('don julian') && normalizedName.includes('despalada')) {
      return firstDonJulianIndex >= 0 ? firstDonJulianIndex : 0;
    }

    if (normalizedName.includes('don julian')) {
      return firstDonJulianIndex >= 0 ? firstDonJulianIndex + 1 : 1;
    }

    const index = this.productDisplayOrder.indexOf(product.name);
    return index >= 0 ? index : this.productDisplayOrder.length;
  }

  private getUnitDivisor(product: Product): number {
    const normalizedName = this.normalizeText(product.name);
    const category = this.normalizeText(this.getCategoryLabel(product));

    if (normalizedName.includes('mate cocido') || category.includes('mate cocido')) {
      return 20;
    }

    if (normalizedName.includes('yerba') || normalizedName.includes('ym ') || category.includes('yerba mate')) {
      return 10;
    }

    return 1;
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
}