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

  private readonly defaultListPricesByName: Record<string, number> = {
    'YERUPE Yerba Mate 500 g': 1260,
    'ALAZAN Yerba Mate 500 g': 1134,
    'SELLO ROJO Yerba Mate 500 g': 1066,
    'SELLO NEGRO Yerba Mate 500 g': 916,
    'YERUPE Yerba Mate 1 kg': 2520,
    'ALAZAN Yerba Mate 1 kg': 2238,
    'SELLO ROJO Yerba Mate 1 kg': 2116,
    'SELLO NEGRO Yerba Mate 1 kg': 1786
  };

  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];

  listPeriodLabel = 'Abril 2026';
  paymentTermsLabel = '30-45-60 dias';
  destinationLabel = 'BsAs-Rosario-Cba.';
  freightLabel = 'Flete incluido';
  listPriceDrafts: Record<string, string> = {};
  customListPrices: Record<string, number> = {};
  invoiceDiscounts: Record<string, number> = {};
  commercialDiscounts: Record<string, number> = {};

  isLoading = false;
  isGeneratingPdf = false;
  isGeneratingPdfCommercial = false;
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
  private readonly defaultInvoiceDiscountPercent = 10;
  private readonly defaultCommercialDiscountPercent = 25;
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
    this.filteredProducts = [...this.products];

    this.currentPage = 1;
    this.updateDisplayedProducts();
  }

  onListPeriodChange(value: string | null): void {
    this.listPeriodLabel = this.sanitizeCommercialText(value, 'Abril 2026', 30);
  }

  onPaymentTermsChange(value: string | null): void {
    this.paymentTermsLabel = this.sanitizeCommercialText(value, '30-45-60 dias', 24);
  }

  onDestinationChange(value: string | null): void {
    this.destinationLabel = this.sanitizeCommercialText(value, 'BsAs-Rosario-Cba.', 30);
  }

  onFreightLabelChange(value: string | null): void {
    this.freightLabel = this.sanitizeCommercialText(value, '', 24, true);
  }

  selectInputValue(event: FocusEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    target.dataset['replaceOnInput'] = 'true';
    requestAnimationFrame(() => target.select());
  }

  replaceInputValueOnType(event: InputEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.dataset['replaceOnInput'] !== 'true') {
      return;
    }

    if (event.inputType.startsWith('insert') && event.data !== null) {
      event.preventDefault();
      target.dataset['replaceOnInput'] = 'false';
      target.value = event.data;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      requestAnimationFrame(() => {
        const cursorPosition = target.value.length;
        target.setSelectionRange(cursorPosition, cursorPosition);
      });
      return;
    }

    if (event.inputType.startsWith('delete')) {
      event.preventDefault();
      target.dataset['replaceOnInput'] = 'false';
      target.value = '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  resetInputReplaceState(event: FocusEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    target.dataset['replaceOnInput'] = 'false';
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
      const exportWidth = 1040;

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f2f5e5',
        width: exportWidth,
        windowWidth: exportWidth,
        scrollX: 0,
        scrollY: 0
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

  async downloadCommercialPdf(): Promise<void> {
    if (this.filteredProducts.length === 0 || this.isGeneratingPdfCommercial) {
      return;
    }

    this.isGeneratingPdfCommercial = true;

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const autoTable = autoTableModule.default;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const products = this.getProductsForCommercialPdf();
      const headerLogoData = await this.loadProductImageData('assets/branding/holowaty-logo.jpeg');
      const productImageMap = await this.loadCommercialPdfImageMap(products);
      const tableBody: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [];

      this.buildCommercialPdfRows(products, 500).forEach((row) => tableBody.push(row));
      this.buildCommercialPdfRows(products, 1000).forEach((row) => tableBody.push(row));

      this.drawCommercialPdfHeader(pdf, headerLogoData);

      autoTable(pdf, {
        startY: 39,
        theme: 'grid',
        tableWidth: 'auto',
        head: [[
          'CODIGO',
          'Descripcion',
          'Precio Lista',
          'Factura',
          '1ER. NETO',
          '% Comercial',
          '2DO. NETO',
          '3ER NETO',
          'IVA',
          'P. FINAL',
          'Destino'
        ]],
        body: tableBody,
        styles: {
          font: 'helvetica',
          fontSize: 7.1,
          cellPadding: { top: 1.1, right: 1.2, bottom: 1.1, left: 1.2 },
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
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 54, halign: 'center' },
          2: { cellWidth: 23, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 23, halign: 'center' },
          5: { cellWidth: 19, halign: 'center' },
          6: { cellWidth: 23, halign: 'center' },
          7: { cellWidth: 23, halign: 'center' },
          8: { cellWidth: 19, halign: 'center' },
          9: { cellWidth: 23, halign: 'center' },
          10: { cellWidth: 29, halign: 'center' }
        },
        didParseCell: (hookData: any) => {
          const rawRow = hookData.row.raw;

          if (Array.isArray(rawRow) && rawRow.length === 1 && typeof rawRow[0] === 'object' && rawRow[0] !== null) {
            hookData.cell.styles['fillColor'] = [226, 234, 204];
            hookData.cell.styles['fontStyle'] = 'bold';
            hookData.cell.styles['textColor'] = [56, 71, 44];
          }

          if (Array.isArray(rawRow) && rawRow.length > 2 && hookData.column.index === 1) {
            hookData.cell.styles['cellPadding'] = { top: 1.1, right: 1.2, bottom: 1.1, left: 12.5 };
          }

          if (hookData.column.index === 7) {
            hookData.cell.styles['fillColor'] = [230, 204, 108];
            hookData.cell.styles['fontStyle'] = 'bold';
            hookData.cell.styles['textColor'] = [78, 63, 14];
          }
        },
        didDrawCell: (hookData: any) => {
          const rawRow = hookData.row.raw;

          if (!Array.isArray(rawRow) || rawRow.length <= 2 || hookData.column.index !== 1) {
            return;
          }

          const sku = String(rawRow[0] ?? '');
          const imageData = productImageMap[sku];

          if (!imageData) {
            return;
          }

          const imageSize = Math.min(8.5, hookData.cell.height - 1.4);
          const imageX = hookData.cell.x + 1.4;
          const imageY = hookData.cell.y + (hookData.cell.height - imageSize) / 2;

          try {
            pdf.addImage(imageData, 'JPEG', imageX, imageY, imageSize, imageSize);
          } catch {
            // Si alguna imagen falla, mantenemos la exportacion sin interrumpir el PDF.
          }
        }
      });

      const lastY = (pdf as any).lastAutoTable?.finalY ?? 0;
      this.drawCommercialPdfPaymentBlock(pdf, lastY + 7);

      pdf.save('catalogo-holowaty-comercial.pdf');
    } finally {
      this.isGeneratingPdfCommercial = false;
    }
  }

  addOrder(product: Product): void {
    const unitPrice = this.getThirdNetPrice(product);

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

  onInvoiceDiscountChange(product: Product, value: string | number | null): void {
    const sanitizedValue = this.sanitizeDiscountInput(value);
    const normalizedValue = Number(sanitizedValue);

    if (!sanitizedValue || Number.isNaN(normalizedValue)) {
      this.invoiceDiscounts[product.id] = 0;
      this.syncOrderItemPrice(product);
      return;
    }

    this.invoiceDiscounts[product.id] = this.clampDiscount(normalizedValue);
    this.syncOrderItemPrice(product);
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

  onListPriceChange(product: Product, value: string | number | null): void {
    const rawValue = String(value ?? '');
    this.listPriceDrafts[product.id] = rawValue;

    const normalizedValue = this.parsePriceInput(rawValue);

    if (normalizedValue === null || Number.isNaN(normalizedValue)) {
      delete this.customListPrices[product.id];
      this.syncOrderItemPrice(product);
      return;
    }

    this.customListPrices[product.id] = this.roundCurrency(normalizedValue);
    this.syncOrderItemPrice(product);
  }

  onListPriceFocus(product: Product, event: FocusEvent): void {
    this.listPriceDrafts[product.id] = this.formatEditablePrice(this.getListPrice(product));
    this.selectInputValue(event);
  }

  onListPriceBlur(product: Product, event: FocusEvent): void {
    const draftValue = this.listPriceDrafts[product.id];

    if (draftValue !== undefined) {
      const normalizedValue = this.parsePriceInput(draftValue);

      if (normalizedValue === null || Number.isNaN(normalizedValue)) {
        delete this.customListPrices[product.id];
      } else {
        this.customListPrices[product.id] = this.roundCurrency(normalizedValue);
      }

      delete this.listPriceDrafts[product.id];
      this.syncOrderItemPrice(product);
    }

    this.resetInputReplaceState(event);
  }

  getInvoiceDiscountPercent(product: Product): number {
    return this.clampDiscount(this.invoiceDiscounts[product.id] ?? this.defaultInvoiceDiscountPercent);
  }

  getInvoiceDiscountInputValue(product: Product): string {
    return this.formatEditableNumber(this.getInvoiceDiscountPercent(product));
  }

  getCommercialDiscountPercent(product: Product): number {
    return this.clampDiscount(this.commercialDiscounts[product.id] ?? this.defaultCommercialDiscountPercent);
  }

  getCommercialDiscountInputValue(product: Product): string {
    return this.formatEditableNumber(this.getCommercialDiscountPercent(product));
  }

  getListPriceInputValue(product: Product): string {
    return this.listPriceDrafts[product.id] ?? this.formatEditablePrice(this.getListPrice(product));
  }

  getProductsForPdfExport(): Product[] {
    return this.filteredProducts;
  }

  getProductsForCommercialPdf(): Product[] {
    return [...this.filteredProducts].sort((a: Product, b: Product) => {
      const weightRank = this.getCommercialPdfGroupRank(a) - this.getCommercialPdfGroupRank(b);
      if (weightRank !== 0) {
        return weightRank;
      }

      return this.getProductSortRank(a) - this.getProductSortRank(b);
    });
  }

  getListPrice(product: Product): number {
    return this.customListPrices[product.id] ?? this.getBaseListPrice(product);
  }

  getFirstNetPrice(product: Product): number {
    const invoiceDiscountRate = this.getInvoiceDiscountPercent(product) / 100;
    return this.getListPrice(product) * (1 - invoiceDiscountRate);
  }

  getSecondNetPrice(product: Product): number {
    const discountRate = this.getCommercialDiscountPercent(product) / 100;
    return this.getFirstNetPrice(product) * (1 - discountRate);
  }

  getThirdNetPrice(product: Product): number {
    return this.getSecondNetPrice(product);
  }

  getTaxAmount(product: Product): number {
    return this.getThirdNetPrice(product) * this.getTaxRate(product);
  }

  getFinalPrice(product: Product): number {
    return this.getThirdNetPrice(product) + this.getTaxAmount(product);
  }

  getTaxRate(product: Product): number {
    return product.tax_rate ?? 0.21;
  }

  getPalletMark(product: Product): string {
    return this.getPalletUnits(product) > 0 ? 'x' : '-';
  }

  getPalletUnits(product: Product): number {
    return product.pallet_units ?? 0;
  }

  getCategoryLabel(product: Product): string {
    return product.category_name || product.category || 'Sin categoria';
  }

  getCompactDescription(product: Product): string {
    return `${this.getPalletUnits(product)} bultos x pallet`;
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

  private buildCommercialPdfRows(products: Product[], weight: number): Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> {
    const groupProducts = products.filter((product: Product) => this.getCommercialPdfGroupRank(product) === weight);

    if (groupProducts.length === 0) {
      return [];
    }

    const rows: Array<Array<string> | Array<{ content: string; colSpan: number; styles: Record<string, unknown> }>> = [[{
      content: weight === 500 ? 'Presentacion 500 gramos' : 'Presentacion 1 kg',
      colSpan: 12,
      styles: {
        halign: 'left'
      }
    }]];

    groupProducts.forEach((product: Product) => {
      rows.push([
        product.sku || '-',
        this.getCommercialPdfDescription(product),
        this.formatCompactPrice(product, this.getListPrice(product)),
        `${this.formatEditableNumber(this.getInvoiceDiscountPercent(product))}%`,
        this.formatCompactPrice(product, this.getFirstNetPrice(product)),
        `${this.formatEditableNumber(this.getCommercialDiscountPercent(product))}%`,
        this.formatCompactPrice(product, this.getSecondNetPrice(product)),
        this.formatCompactPrice(product, this.getThirdNetPrice(product)),
        this.formatCompactPrice(product, this.getTaxAmount(product)),
        this.formatCompactPrice(product, this.getFinalPrice(product)),
        this.getCommercialPdfDestination()
      ]);
    });

    return rows;
  }

  private getCommercialPdfDescription(product: Product): string {
    const weightLabel = this.getCommercialPdfGroupRank(product) === 500 ? 'x 500 gramos' : 'x 1000 gramos';
    return `${this.toTitleCase(product.brand || product.name)} ${weightLabel}`;
  }

  private getCommercialPdfDestination(): string {
    return this.freightLabel ? `${this.destinationLabel}\n${this.freightLabel}` : this.destinationLabel;
  }

  private async loadCommercialPdfImageMap(products: Product[]): Promise<Record<string, string>> {
    const entries = await Promise.all(
      products.map(async (product: Product) => {
        const imageData = await this.loadProductImageData(product.image);
        return [product.sku || product.id, imageData] as const;
      })
    );

    return entries.reduce((acc: Record<string, string>, [key, value]) => {
      if (value) {
        acc[key] = value;
      }

      return acc;
    }, {});
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

  private getCommercialPdfGroupRank(product: Product): number {
    const normalizedSource = this.normalizeText(`${product.name} ${product.description ?? ''}`);

    if (normalizedSource.includes('500 g') || normalizedSource.includes('500g') || normalizedSource.includes('500 gramos')) {
      return 500;
    }

    if (normalizedSource.includes('1 kg') || normalizedSource.includes('1kg') || normalizedSource.includes('1000 g') || normalizedSource.includes('1000 gramos')) {
      return 1000;
    }

    return 9999;
  }

  private getCommercialPdfTitle(): string {
    return `Lista de precios - Holowaty Oscar - ${this.listPeriodLabel}.`;
  }

  private drawCommercialPdfHeader(pdf: any, logoData: string | null): void {
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(248, 249, 243);
    pdf.rect(10, 8, pageWidth - 20, 26, 'F');

    pdf.setFillColor(84, 111, 63);
    pdf.rect(10, 8, pageWidth - 20, 2.4, 'F');

    pdf.setDrawColor(205, 214, 181);
    pdf.setLineWidth(0.2);
    pdf.rect(10, 8, pageWidth - 20, 26);

    pdf.setDrawColor(220, 226, 199);
    pdf.line(73, 12.5, 73, 31.2);

    pdf.setTextColor(94, 119, 73);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.text('ELABORADO Y ENVASADO POR', 15, 15.6);

    pdf.setTextColor(42, 59, 33);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.2);
    pdf.text('Holowaty Hugo Oscar', 15, 20.4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.4);
    pdf.setTextColor(92, 107, 81);
    pdf.text('Ruta provincial 105 - Lote agricola N 57', 15, 25.7);
    pdf.text('Cel: (3758) 15 433581', 15, 31.3);

    pdf.setTextColor(43, 52, 36);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13.2);
    pdf.text(this.getCommercialPdfTitle(), pageWidth / 2, 22.2, { align: 'center' });

    if (logoData) {
      try {
        const logoAnchorRight = pageWidth - 15.5;
        const logoCenterY = 21;
        const maxLogoWidth = 29;
        const maxLogoHeight = 18.8;
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

        pdf.addImage(logoData, 'JPEG', renderX, renderY, renderWidth, renderHeight);
      } catch {
        // Si el logo no se puede renderizar, el PDF sigue sin interrumpirse.
      }
    }

    pdf.setDrawColor(214, 221, 191);
    pdf.line(10, 34.5, pageWidth - 10, 34.5);
  }

  private drawCommercialPdfPaymentBlock(pdf: any, startY: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const blockWidth = 92;
    const blockHeight = 12.8;
    const blockX = (pageWidth - blockWidth) / 2;
    const titleHeight = 4.6;
    const contentTop = startY + titleHeight;
    const labelWidth = 26;

    pdf.setFillColor(247, 249, 241);
    pdf.roundedRect(blockX, startY, blockWidth, blockHeight, 1.8, 1.8, 'F');

    pdf.setFillColor(84, 111, 63);
    pdf.roundedRect(blockX, startY, blockWidth, titleHeight, 1.8, 1.8, 'F');
    pdf.rect(blockX, startY + titleHeight - 1.8, blockWidth, 1.8, 'F');

    pdf.setDrawColor(198, 208, 171);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(blockX, startY, blockWidth, blockHeight, 1.8, 1.8, 'S');

    pdf.setDrawColor(217, 224, 197);
    pdf.line(blockX + labelWidth, contentTop, blockX + labelWidth, startY + blockHeight);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.3);
    pdf.text('CONDICIONES DE PAGO', pageWidth / 2, startY + 3.05, { align: 'center' });

    pdf.setTextColor(92, 107, 81);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.9);
    pdf.text('PLAZO', blockX + labelWidth / 2, contentTop + 4.1, { align: 'center' });

    pdf.setTextColor(41, 54, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.8);
    pdf.text(this.paymentTermsLabel.replace(/-/g, ' - '), blockX + labelWidth + ((blockWidth - labelWidth) / 2), contentTop + 4.9, { align: 'center' });
  }

  private formatCompactPrice(product: Product, value: number): string {
    const formattedValue = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.roundCurrency(value));

    return `${formattedValue}`;
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      this.getThirdNetPrice(product),
      this.getCommercialDiscountPercent(product)
    );
  }

  private clampDiscount(value: number): number {
    return Math.min(100, Math.max(0, Number(value.toFixed(2))));
  }

  private getBaseNetPrice(product: Product): number {
    return product.net_price ?? this.getGrossPrice(product) / (1 + this.getTaxRate(product));
  }

  private getBaseListPrice(product: Product): number {
    const configuredListPrice = this.defaultListPricesByName[product.name];

    if (typeof configuredListPrice === 'number') {
      return configuredListPrice;
    }

    const invoiceFactor = 1 - this.defaultInvoiceDiscountPercent / 100;
    const commercialFactor = 1 - this.defaultCommercialDiscountPercent / 100;
    const baseNetPrice = this.getBaseNetPrice(product);

    if (invoiceFactor <= 0 || commercialFactor <= 0) {
      return baseNetPrice;
    }

    return this.roundCurrency(baseNetPrice / (invoiceFactor * commercialFactor));
  }

  private getGrossPrice(product: Product): number {
    return (product.wholesale_price ?? 0) > 0 ? (product.wholesale_price as number) : product.price;
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private formatEditableNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(this.roundCurrency(value));
  }

  private formatEditablePrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.roundCurrency(value));
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

  private sanitizePriceInput(value: string | number | null): string {
    const rawValue = String(value ?? '')
      .replace(',', '.')
      .replace(/-/g, '')
      .replace(/[^\d.]/g, '');

    const parts = rawValue.split('.');
    const integerPart = (parts[0] ?? '').slice(0, 7);
    const decimalPart = parts.length > 1 ? (parts[1] ?? '').slice(0, 2) : '';

    if (!integerPart && !decimalPart) {
      return '';
    }

    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }

  private parsePriceInput(value: string | number | null): number | null {
    const rawValue = String(value ?? '')
      .replace(/\s+/g, '')
      .replace(/-/g, '')
      .replace(/[^\d.,]/g, '');

    if (!rawValue) {
      return null;
    }

    const decimalSeparatorIndex = Math.max(rawValue.lastIndexOf(','), rawValue.lastIndexOf('.'));
    const integerPart = (decimalSeparatorIndex >= 0 ? rawValue.slice(0, decimalSeparatorIndex) : rawValue)
      .replace(/[^\d]/g, '')
      .slice(0, 7);
    const decimalPart = (decimalSeparatorIndex >= 0 ? rawValue.slice(decimalSeparatorIndex + 1) : '')
      .replace(/[^\d]/g, '')
      .slice(0, 2);

    if (!integerPart && !decimalPart) {
      return null;
    }

    const normalizedValue = decimalPart ? `${integerPart || '0'}.${decimalPart}` : (integerPart || '0');
    const parsedValue = Number(normalizedValue);

    return Number.isNaN(parsedValue) ? null : this.roundCurrency(parsedValue);
  }

  private sanitizeCommercialText(value: string | null, fallback: string, maxLength: number, allowEmpty = false): string {
    const normalizedValue = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);

    if (!normalizedValue) {
      return allowEmpty ? '' : fallback;
    }

    return normalizedValue;
  }
}