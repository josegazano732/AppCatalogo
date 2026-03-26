import { Component, OnDestroy, OnInit } from '@angular/core';
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
      name: 'YM DON JULIAN Pack 10x1kg PACK',
      presentation: '10 x 1 kg',
      quantity: 1,
      aliases: ['ym don julian pack 10x1kg pack']
    },
    {
      name: 'YM MATEITE 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym mateite 10x500g pack']
    },
    {
      name: 'YM MATEITE 10x1kg PACK',
      presentation: '10 x 1 kg',
      quantity: 1,
      aliases: ['ym mateite 10x1kg pack']
    },
    {
      name: 'YM YERBELLA 10x500g PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym yerbella 10x500g pack']
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