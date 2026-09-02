import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { CartItem } from '../../models/cart-item.model';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

interface MixPackItem {
  name: string;
  presentation: string;
  quantity: number;
  aliases: string[];
}

@Component({
  selector: 'app-commerce-pos-catalog',
  templateUrl: './commerce-pos-catalog.component.html',
  styleUrls: ['../whatsapp-catalog/whatsapp-catalog.component.css']
})
export class CommercePosCatalogComponent implements OnInit, OnDestroy {
  private readonly pdfExpandedImageSize = 7.2;
  private readonly pdfExpandedImageMinCellHeight = 8;
  private readonly pdfDetailWidth = 226;

  private readonly productDisplayOrder: string[] = [
    'MC Mate cocido DON JULIAN x20 PACK',
    'YM DON JULIAN 10x500g PACK',
    'YM DON JULIAN Pack 10x1kg PACK',
    'YM YERBELLA 10x500g PACK',
    'YM MATEITE 10x500g PACK',
    'YM MATEITE 10x1kg PACK',
    'YM MATEITE PREMIUM 10x500g PACK',
    'YM 10x500g Caricias de Mate SUAVE',
    'YM 10x1000g Caricias de Mate SUAVE',
    'YM 10x500g Caricias de Mate TRADICIONAL',
    'YM 10x1000g Caricias de Mate TRADICIONAL',
    'YM 10x500g Mate y Playa TRADICIONAL',
    'YM 10x1000g Mate y Playa TRAD.',
    'YM 10x500g Mate y Playa Terere'
  ];

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  categories: string[] = [];

  searchTerm = '';
  selectedCategory = '';

  isLoading = false;
  errorMessage = '';
  isGeneratingPdf = false;

  currentPage = 1;
  productsPerPage = 12;
  totalPages = 1;

  orderItems: CartItem[] = [];
  orderCount = 0;
  orderSubtotal = 0;

  showWhatsAppConfirmModal = false;
  showImagePreview = false;
  submitAttempted = false;
  confirmError = '';

  selectedImagePreviewUrl: string | null = null;
  selectedImagePreviewAlt = '';
  selectedImagePreviewProduct: Product | null = null;

  customerName = '';
  customerLastName = '';
  customerAddress = '';
  customerPostalCode = '';
  paymentMethod = '';
  deliveryMethod = '';

  readonly mixPackOneItems: MixPackItem[] = [
    {
      name: 'MC Mate cocido DON JULIAN x20 PACK',
      presentation: 'Pack x20',
      quantity: 1,
      aliases: ['mc mate cocido don julian x20 pack']
    },
    {
      name: 'YM DON JULIAN 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym don julian 10x500g pack']
    },
    {
      name: 'YM MATEITE 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym mateite 10x500g pack']
    },
    {
      name: 'YM YERBELLA 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym yerbella 10x500g pack']
    },
    {
      name: 'YM MATEITE PREMIUM 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym mateite premium 10x500g pack']
    },
    {
      name: 'YM 10x500g Caricias de Mate SUAVE',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym 10x500g caricias de mate suave']
    },
    {
      name: 'YM 10x500g Caricias de Mate TRADICIONAL',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym 10x500g caricias de mate tradicional']
    },
    {
      name: 'YM 10x500g Mate y Playa TRADICIONAL',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym 10x500g mate y playa tradicional']
    },
    {
      name: 'YM 10x500g Mate y Playa Terere',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym 10x500g mate y playa terere']
    }
  ];
  mixPackOneTotal = 0;
  mixPackOneAvailableCount = 0;
  mixPackOneIsComplete = false;
  mixPackFeedback = '';
  mixPackFeedbackTone: 'success' | 'warning' = 'success';

  whatsappPhone = '5493758418515';
  commerceCategories = ['Yerba Mate', 'Mate Cocido'];

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

    const productsSub = this.productService.getCommercePosProducts().subscribe({
      next: (products: Product[]) => {
        const enabledCategories = new Set(this.commerceCategories.map((item) => this.normalizeText(item)));

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
        this.refreshMixPackOneAvailability();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catalogo de comercios y puntos de venta. Intenta nuevamente.';
        this.refreshMixPackOneAvailability();
        this.isLoading = false;
      }
    });

    this.subscriptions.add(productsSub);
  }

  applyFilters(): void {
    const normalizedSearch = this.normalizeText(this.searchTerm);
    const normalizedCategory = this.normalizeText(this.selectedCategory);

    this.filteredProducts = this.products.filter((product) => {
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
      const products = this.filteredProducts;
      const [logoData, productImageMap] = await Promise.all([
        this.loadCommercePdfLogo('assets/branding/amate-logo.jpg'),
        this.loadCommercePdfImageMap(products)
      ]);
      const tableBody: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [];

      this.buildCommercePdfRowsByCategory(products, 'Mate Cocido').forEach((row) => tableBody.push(row));
      this.buildCommercePdfRowsByCategory(products, 'Yerba Mate').forEach((row) => tableBody.push(row));

      this.drawCommercePdfHeader(pdf, logoData);

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
          fontSize: 5.2,
          cellPadding: { top: 0.2, right: 0.55, bottom: 0.2, left: 0.55 },
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
            hookData.cell.styles['cellPadding'] = {
              top: 0.2,
              right: 0.55,
              bottom: 0.2,
              left: 9.2
            };
            hookData.cell.styles['minCellHeight'] = this.pdfExpandedImageMinCellHeight;
          }
        },
        didDrawCell: (hookData: any) => {
          const rawRow = hookData.row.raw;

          if (!Array.isArray(rawRow) || rawRow.length <= 2 || hookData.column.index !== 0) {
            return;
          }

          const descriptionCell = rawRow[0];
          const productKey = typeof descriptionCell === 'object' && descriptionCell !== null
            ? String((descriptionCell as any).productKey ?? '')
            : '';
          const imageData = productImageMap[productKey];

          if (!imageData) {
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

      pdf.save('catalogo-comercios-punto-de-ventas.pdf');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  addOrder(product: Product): void {
    const unitPrice = this.getWholesalePrice(product);

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

  addMixPackOneToCart(): void {
    if (this.products.length === 0 || this.isLoading || this.errorMessage) {
      this.mixPackFeedbackTone = 'warning';
      this.mixPackFeedback = 'Todavia no se pueden cargar los productos del mix. Intenta nuevamente en unos segundos.';
      return;
    }

    const resolvedProducts: Array<{ mixItem: MixPackItem; product: Product }> = [];
    const missingItems: string[] = [];

    for (const mixItem of this.mixPackOneItems) {
      const product = this.findProductForMixItem(mixItem);
      if (!product) {
        missingItems.push(mixItem.name);
        continue;
      }

      resolvedProducts.push({ mixItem, product });
    }

    if (missingItems.length > 0) {
      this.mixPackFeedbackTone = 'warning';
      this.mixPackFeedback = `No se pudo cargar el Pack Mix 1 completo. Faltan: ${missingItems.join(', ')}.`;
      return;
    }

    this.cartService.clearCart();

    for (const resolvedItem of resolvedProducts) {
      this.cartService.addToCart({
        id: resolvedItem.product.id,
        name: resolvedItem.product.name,
        price: this.getWholesalePrice(resolvedItem.product),
        quantity: resolvedItem.mixItem.quantity,
        unit_of_measure: resolvedItem.product.unit_of_measure,
        category_name: resolvedItem.product.category_name,
        category: resolvedItem.product.category
      });
    }

    this.mixPackFeedbackTone = 'success';
    this.mixPackFeedback = 'Pack Mix 1 aplicado. El carrito anterior fue reemplazado por este pack.';
  }

  getMixPackOneItemPrice(mixItem: MixPackItem): number | null {
    const product = this.findProductForMixItem(mixItem);
    if (!product) {
      return null;
    }

    return this.getWholesalePrice(product) * mixItem.quantity;
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

  openImagePreview(product: Product): void {
    const imageUrl = product.image;
    if (!imageUrl) {
      return;
    }

    this.selectedImagePreviewUrl = imageUrl;
    this.selectedImagePreviewAlt = product.name;
    this.selectedImagePreviewProduct = product;
    this.showImagePreview = true;
  }

  onImagePreviewError(): void {
    this.closeImagePreview();
  }

  closeImagePreview(): void {
    this.showImagePreview = false;
    this.selectedImagePreviewUrl = null;
    this.selectedImagePreviewAlt = '';
    this.selectedImagePreviewProduct = null;
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.showImagePreview) {
      this.closeImagePreview();
    }
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
      'Hola! Quiero realizar el siguiente pedido:',
      '',
      ...this.orderItems.map((item) => `${item.quantity} x ${item.name} - ${this.formatPrice(item.price * item.quantity)}`),
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
    const item = this.orderItems.find((orderItem) => orderItem.id === productId);
    return item?.quantity ?? 0;
  }

  getWholesalePrice(product: Product): number {
    return (product.wholesale_price ?? 0) > 0 ? (product.wholesale_price as number) : product.price;
  }

  getGrossPrice(product: Product): number {
    return this.getWholesalePrice(product);
  }

  getNetPriceWithoutTax(product: Product): number {
    return this.getGrossPrice(product) / 1.21;
  }

  getUnitGrossPrice(product: Product): number {
    return this.getUnitPrice(product);
  }

  getUnitNetPriceWithoutTax(product: Product): number {
    return this.getUnitGrossPrice(product) / 1.21;
  }

  getDisplayPriceLabel(product: Product): string {
    return this.getUnitDivisor(product) > 1 ? 'Precio pack' : 'Precio unidad';
  }

  getDisplayNetPriceLabel(product: Product): string {
    return this.getUnitDivisor(product) > 1 ? 'Precio pack neto s/IVA' : 'Precio unidad neto s/IVA';
  }

  getDisplayGrossPriceLabel(product: Product): string {
    return this.getUnitDivisor(product) > 1 ? 'Precio pack bruto c/IVA' : 'Precio unidad bruto c/IVA';
  }

  isPackProduct(product: Product): boolean {
    return this.getUnitDivisor(product) > 1;
  }

  getOrderGrossTotal(): number {
    return this.orderSubtotal;
  }

  getOrderNetTotal(): number {
    return this.getOrderGrossTotal() / 1.21;
  }

  getUnitPrice(product: Product): number {
    const divisor = this.getUnitDivisor(product);
    return this.getGrossPrice(product) / divisor;
  }

  getPriceColumnLabel(): string {
    return 'Precio bruto c/IVA';
  }

  getSuggestedSaleMin(product: Product): number {
    return this.getUnitPrice(product) * 1.4;
  }

  getSuggestedSaleMax(product: Product): number {
    return this.getUnitPrice(product) * 1.5;
  }

  getCategoryLabel(product: Product): string {
    return product.category_name || product.category || 'Sin categoria';
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  }

  private formatCompactPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  }

  private getPdfSearchLabel(): string {
    return this.searchTerm.trim() || 'Sin filtro';
  }

  private getPdfCategoryLabel(): string {
    return this.selectedCategory || 'Todas las categorias';
  }

  private getPdfGeneratedDateLabel(): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  private async loadCommercePdfImageMap(products: Product[]): Promise<Record<string, string>> {
    const entries = await Promise.all(products.map(async (product: Product) => {
      const imageData = await this.loadCommercePdfImageFromCandidates(this.getCommercePdfImagePaths(product));
      return [this.getCommercePdfRowCode(product), imageData] as const;
    }));

    return entries.reduce((imageMap: Record<string, string>, [productId, imageData]) => {
      if (imageData) {
        imageMap[productId] = imageData;
      }

      return imageMap;
    }, {});
  }

  private buildCommercePdfRowsByCategory(products: Product[], sourceCategoryLabel: string): Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> {
    const categoryProducts = products
      .filter((product: Product) => this.normalizeText(this.getCategoryLabel(product)) === this.normalizeText(sourceCategoryLabel))
      .sort((first: Product, second: Product) => this.getProductSortRank(first) - this.getProductSortRank(second));

    if (categoryProducts.length === 0) {
      return [];
    }

    const rows: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [[{
      content: sourceCategoryLabel,
      colSpan: 6,
      styles: { halign: 'left' }
    }]];

    categoryProducts.forEach((product: Product) => rows.push([
      {
        content: product.name,
        productKey: this.getCommercePdfRowCode(product)
      } as any,
      this.formatCompactPrice(this.getGrossPrice(product)),
      this.formatCompactPrice(this.getNetPriceWithoutTax(product)),
      this.formatCompactPrice(this.getUnitGrossPrice(product)),
      this.formatCompactPrice(this.getUnitNetPriceWithoutTax(product)),
      this.getCategoryLabel(product)
    ]));

    return rows;
  }

  private getCommercePdfRowCode(product: Product): string {
    return product.sku?.trim() || product.id;
  }

  private getCommercePdfImagePaths(product: Product): string[] {
    if (!product.image) {
      return [];
    }

    const normalizedName = this.normalizeText(product.name);
    const candidates: Array<[string, string]> = [
      ['mate cocido don julian', 'assets/pdf-products/MC Mate cocido DON JULIAN.jpeg'],
      ['yerbella', 'assets/pdf-products/YM Yerbella ORGANICA.jpeg'],
      ['don julian', 'assets/pdf-products/YM Don Julian.jpeg'],
      ['mateite premium', 'assets/products/YM MATEITE PREMIUM.jpeg'],
      ['mateite', 'assets/pdf-products/YM Mateite.jpeg'],
      ['caricias de mate suave', 'assets/pdf-products/YM Caricias de Mate SUAVE.jpeg'],
      ['caricias de mate tradicional', 'assets/pdf-products/YM Caricias de Mate TRADICIONAL.jpeg'],
      ['mate y playa tradicional', 'assets/pdf-products/YM  Mate y Playa TRADICIONAL.jpeg'],
      ['mate y playa terere', 'assets/pdf-products/YM Mate y Playa Terere.jpeg']
    ];
    const matchedCandidate = candidates.find(([productName]) => normalizedName.includes(productName));

    return matchedCandidate ? [matchedCandidate[1], product.image] : [product.image];
  }

  private async loadCommercePdfImageFromCandidates(imagePaths: string[]): Promise<string | null> {
    for (const imagePath of imagePaths) {
      const imageData = await this.loadCommercePdfThumbnail(imagePath);
      if (imageData) {
        return imageData;
      }
    }

    return null;
  }

  private async loadCommercePdfThumbnail(imagePath: string): Promise<string | null> {
    const sourceData = await this.loadCommercePdfAsset(imagePath);
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
        const width = image.width * ratio;
        const height = image.height * ratio;

        canvas.width = size;
        canvas.height = size;
        context.fillStyle = '#f6f8ee';
        context.fillRect(0, 0, size, size);
        context.strokeStyle = '#d3dcc0';
        context.lineWidth = 4;
        context.strokeRect(2, 2, size - 4, size - 4);
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL('image/png'));
      };

      image.onerror = () => resolve(null);
      image.src = sourceData;
    });
  }

  private async loadCommercePdfAsset(imagePath: string): Promise<string | null> {
    if (typeof fetch === 'undefined' || typeof FileReader === 'undefined' || typeof document === 'undefined') {
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

  private async loadCommercePdfLogo(imagePath: string): Promise<string | null> {
    const sourceData = await this.loadCommercePdfAsset(imagePath);
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
        context.save();
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - padding, 0, Math.PI * 2);
        context.clip();

        const ratio = Math.max((size - padding * 2) / image.width, (size - padding * 2) / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        context.restore();
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - padding, 0, Math.PI * 2);
        context.lineWidth = 6;
        context.strokeStyle = '#d3dcc0';
        context.stroke();
        resolve(canvas.toDataURL('image/png'));
      };

      image.onerror = () => resolve(null);
      image.src = sourceData;
    });
  }

  private drawCommercePdfHeader(pdf: any, logoData: string | null): void {
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
    pdf.setFontSize(7.2);
    pdf.text('Whatsapp 3758-418515', headerX + 4.2, headerY + 9);

    pdf.setTextColor(43, 52, 36);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.1);
    pdf.text(`Comercios y puntos de venta - ${this.getPdfGeneratedDateLabel()}`, headerX + headerWidth / 2, headerY + 6.9, { align: 'center' });
    pdf.setTextColor(92, 107, 81);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    pdf.text('Detalle de precios comerciales segun la vista actual', headerX + headerWidth / 2, headerY + 10.6, { align: 'center' });

    if (logoData) {
      try {
        const logoAnchorRight = headerX + headerWidth - 4.2;
        const logoProps = pdf.getImageProperties(logoData);
        const logoRatio = logoProps.width / logoProps.height;
        let renderWidth = 18.5;
        let renderHeight = renderWidth / logoRatio;
        if (renderHeight > 11.5) {
          renderHeight = 11.5;
          renderWidth = renderHeight * logoRatio;
        }
        pdf.addImage(logoData, 'PNG', logoAnchorRight - renderWidth, headerY + (headerHeight - renderHeight) / 2 + 0.8, renderWidth, renderHeight);
      } catch {
        // Si el logo no se puede renderizar, el PDF sigue sin interrumpirse.
      }
    }

    pdf.setDrawColor(214, 221, 191);
    pdf.line(headerX, 24.8, headerX + headerWidth, 24.8);
  }

  private getUnitDivisor(product: Product): number {
    const normalizedName = this.normalizeText(product.name);
    const category = this.normalizeText(this.getCategoryLabel(product));
    const unitOfMeasure = this.normalizeText(product.unit_of_measure || '');

    if (unitOfMeasure.includes('pack') && category.includes('yerba mate')) {
      return 10;
    }

    if (unitOfMeasure.includes('pack') && category.includes('mate cocido')) {
      return 20;
    }

    if (normalizedName.includes('10x500g') || normalizedName.includes('10x1kg')) {
      return 10;
    }

    if (normalizedName.includes('x20 pack')) {
      return 20;
    }

    if (category.includes('yerba mate')) {
      return 1;
    }

    if (category.includes('mate cocido')) {
      return 1;
    }

    return 1;
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

  private refreshMixPackOneAvailability(): void {
    let total = 0;
    let availableCount = 0;

    for (const mixItem of this.mixPackOneItems) {
      const product = this.findProductForMixItem(mixItem);
      if (!product) {
        continue;
      }

      availableCount += 1;
      total += this.getWholesalePrice(product) * mixItem.quantity;
    }

    this.mixPackOneAvailableCount = availableCount;
    this.mixPackOneTotal = total;
    this.mixPackOneIsComplete = availableCount === this.mixPackOneItems.length;
  }

  private findProductForMixItem(mixItem: MixPackItem): Product | undefined {
    return this.products.find((product: Product) => {
      const searchable = this.normalizeText(
        `${product.name} ${product.description ?? ''} ${this.getCategoryLabel(product)}`
      );

      return mixItem.aliases.some((alias) => searchable.includes(this.normalizeText(alias)));
    });
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