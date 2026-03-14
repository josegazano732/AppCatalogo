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
  selector: 'app-distributor-pallet-catalog',
  templateUrl: './distributor-pallet-catalog.component.html',
  styleUrls: ['./distributor-pallet-catalog.component.css']
})
export class DistributorPalletCatalogComponent implements OnInit, OnDestroy {
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
      name: 'YM YERBELLA 500g PALLET x104 PACK',
      presentation: '500 g',
      quantity: 16,
      aliases: ['ym yerbella 500g pallet x104 pack', 'ym yerbella 10x500g pack']
    },
    {
      name: 'YM MATEITE 500g PALLET x96 PACK',
      presentation: '500 g',
      quantity: 40,
      aliases: ['ym mateite 500g pallet x96 pack', 'ym mateite 10x500g pack']
    },
    {
      name: 'YM DON JULIAN 500g PALLET x96 PACK',
      presentation: '500 g',
      quantity: 40,
      aliases: ['ym don julian 500g pallet x96 pack', 'ym don julian 10x500g pack']
    },
    {
      name: 'MC MATE COCIDO DON JULIAN x20 PALLET x100 PACK',
      presentation: 'x20',
      quantity: 4,
      aliases: ['mc mate cocido don julian x20 pallet x100 pack', 'mc mate cocido don julian x20 pack']
    }
  ];
  mixPackOneTotal = 0;
  mixPackOneAvailableCount = 0;
  mixPackOneIsComplete = false;
  mixPackFeedback = '';
  mixPackFeedbackTone: 'success' | 'warning' = 'success';

  readonly mixPackTwoItems: MixPackItem[] = [
    {
      name: 'MC MATE COCIDO DON JULIAN x20 PALLET x96 PACK',
      presentation: 'Pack x20',
      quantity: 1,
      aliases: ['mc mate cocido don julian x20 pallet x96 pack', 'mc mate cocido don julian x20 pack']
    },
    {
      name: 'YM DON JULIAN 500g PALLET x96 PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym don julian 500g pallet x96 pack', 'ym don julian 10x500g pack']
    },
    {
      name: 'YM DON JULIAN 1kg PALLET x50 PACK',
      presentation: '10 x 1 kg',
      quantity: 1,
      aliases: ['ym don julian 1kg pallet x50 pack', 'ym don julian pack 10x1kg pack']
    },
    {
      name: 'YM MATEITE 500g PALLET x96 PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym mateite 500g pallet x96 pack', 'ym mateite 10x500g pack']
    },
    {
      name: 'YM MATEITE 1kg PALLET x50 PACK',
      presentation: '10 x 1 kg',
      quantity: 1,
      aliases: ['ym mateite 1kg pallet x50 pack', 'ym mateite 10x1kg pack']
    },
    {
      name: 'YM YERBELLA 500g PALLET x104 PACK',
      presentation: '10 x 500 g',
      quantity: 1,
      aliases: ['ym yerbella 500g pallet x104 pack', 'ym yerbella 10x500g pack']
    }
  ];
  mixPackTwoTotal = 0;
  mixPackTwoAvailableCount = 0;
  mixPackTwoIsComplete = false;
  mixPackTwoFeedback = '';
  mixPackTwoFeedbackTone: 'success' | 'warning' = 'success';

  customMixFormat: '500g' | '1000g' = '500g';
  customMixQuantities: Record<string, number> = {};
  customMixFeedback = '';
  customMixFeedbackTone: 'success' | 'warning' = 'success';

  whatsappPhone = '5493758418515';
  palletCategories = ['Yerba Mate', 'Mate Cocido'];

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

    const productsSub = this.productService.getProducts().subscribe({
      next: (products: Product[]) => {
        const enabledCategories = new Set(this.palletCategories.map((item) => this.normalizeText(item)));
        const distributorProducts = products.map((product: Product) => this.toDistributorProduct(product));

        const wholesaleProducts = distributorProducts
          .filter((product: Product) => (product.wholesale_price ?? 0) > 0)
          .filter((product: Product) => enabledCategories.has(this.normalizeText(this.getCategoryLabel(product))))
          .sort((a: Product, b: Product) => {
            const categoryDiff = this.getCategoryLabel(a).localeCompare(this.getCategoryLabel(b), 'es');
            if (categoryDiff !== 0) {
              return categoryDiff;
            }
            return a.name.localeCompare(b.name, 'es');
          });

        this.products = wholesaleProducts;
        this.categories = [
          ...new Set(
            wholesaleProducts
              .map((product: Product) => this.getCategoryLabel(product))
              .filter((category): category is string => Boolean(category))
          )
        ];
        this.initializeCustomMixQuantities();
        this.applyFilters();
        this.refreshMixPackOneAvailability();
        this.refreshMixPackTwoAvailability();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catalogo para distribuidora. Intenta nuevamente.';
        this.refreshMixPackOneAvailability();
        this.refreshMixPackTwoAvailability();
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

  setCustomMixFormat(format: '500g' | '1000g'): void {
    this.customMixFormat = format;
    this.customMixFeedback = '';
  }

  getCustomMixProducts(): Product[] {
    return this.products.filter((product: Product) => {
      const normalizedName = this.normalizeText(product.name);

      if (normalizedName.includes('mate cocido')) {
        return false;
      }

      if (this.customMixFormat === '500g') {
        return normalizedName.includes('500g');
      }

      return normalizedName.includes('1kg');
    });
  }

  getCustomMixQuantity(productId: string): number {
    return this.customMixQuantities[productId] ?? 0;
  }

  setCustomMixQuantity(productId: string, value: number | string): void {
    const parsed = Number(value);
    const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    this.customMixQuantities[productId] = sanitized;
    this.customMixFeedback = '';
  }

  increaseCustomMixQuantity(productId: string): void {
    this.setCustomMixQuantity(productId, this.getCustomMixQuantity(productId) + 1);
  }

  decreaseCustomMixQuantity(productId: string): void {
    this.setCustomMixQuantity(productId, this.getCustomMixQuantity(productId) - 1);
  }

  getCustomMixItemSubtotal(product: Product): number {
    return this.getWholesalePrice(product) * this.getCustomMixQuantity(product.id);
  }

  getCustomMixPackCount(): number {
    return this.getCustomMixProducts().reduce((total: number, product: Product) => {
      return total + this.getCustomMixQuantity(product.id);
    }, 0);
  }

  getCustomMixRequiredPackCount(): number {
    return this.customMixFormat === '500g' ? 96 : 50;
  }

  getCustomMixPackDelta(): number {
    return this.getCustomMixRequiredPackCount() - this.getCustomMixPackCount();
  }

  isCustomMixComplete(): boolean {
    return this.getCustomMixPackDelta() === 0;
  }

  getCustomMixValidationMessage(): string {
    const delta = this.getCustomMixPackDelta();

    if (delta === 0) {
      return `Pallet completo: ${this.getCustomMixRequiredPackCount()} packs.`;
    }

    if (delta > 0) {
      return `Faltan ${delta} packs para completar el pallet de ${this.getCustomMixRequiredPackCount()} packs.`;
    }

    return `Te excediste por ${Math.abs(delta)} packs. Ajusta para cerrar el pallet en ${this.getCustomMixRequiredPackCount()} packs.`;
  }

  getCustomMixTotal(): number {
    return this.getCustomMixProducts().reduce((total: number, product: Product) => {
      return total + this.getCustomMixItemSubtotal(product);
    }, 0);
  }

  applyCustomMixToCart(): void {
    if (this.products.length === 0 || this.isLoading || this.errorMessage) {
      this.customMixFeedbackTone = 'warning';
      this.customMixFeedback = 'Todavia no se pueden cargar productos para el mix personalizado.';
      return;
    }

    const selectedProducts = this.getCustomMixProducts()
      .map((product: Product) => ({ product, quantity: this.getCustomMixQuantity(product.id) }))
      .filter((entry) => entry.quantity > 0);

    if (selectedProducts.length === 0) {
      this.customMixFeedbackTone = 'warning';
      this.customMixFeedback = 'Ingresa al menos una cantidad para armar tu pallet mix personalizado.';
      return;
    }

    if (!this.isCustomMixComplete()) {
      this.customMixFeedbackTone = 'warning';
      this.customMixFeedback = this.getCustomMixValidationMessage();
      return;
    }

    this.cartService.clearCart();

    for (const entry of selectedProducts) {
      this.cartService.addToCart({
        id: entry.product.id,
        name: entry.product.name,
        price: this.getWholesalePrice(entry.product),
        quantity: entry.quantity,
        unit_of_measure: entry.product.unit_of_measure,
        category_name: entry.product.category_name,
        category: entry.product.category
      });
    }

    this.customMixFeedbackTone = 'success';
    this.customMixFeedback = 'Mix personalizado aplicado. El carrito fue reemplazado con tu pallet completo.';
  }

  addMixPackOneToCart(): void {
    if (this.products.length === 0 || this.isLoading || this.errorMessage) {
      this.mixPackFeedbackTone = 'warning';
      this.mixPackFeedback = 'Todavia no se pueden cargar los productos del pallet mix. Intenta nuevamente en unos segundos.';
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
      this.mixPackFeedback = `No se pudo cargar el Pallet Mix 1 completo. Faltan: ${missingItems.join(', ')}.`;
      return;
    }

    // Modo exclusivo: al elegir Pallet Mix 1 se reemplaza todo el carrito.
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
    this.mixPackFeedback = 'Pallet Mix 1 aplicado. El carrito anterior fue reemplazado por este pallet.';
  }

  getMixPackOneItemPrice(mixItem: MixPackItem): number | null {
    const product = this.findProductForMixItem(mixItem);
    if (!product) {
      return null;
    }

    return this.getWholesalePrice(product) * mixItem.quantity;
  }

  getMixPackOneItemUnits(mixItem: MixPackItem): number | null {
    const product = this.findProductForMixItem(mixItem);
    if (!product) {
      return null;
    }

    return this.getUnitDivisor(product) * mixItem.quantity;
  }

  getMixPackOneItemUnitPrice(mixItem: MixPackItem): number | null {
    const product = this.findProductForMixItem(mixItem);
    if (!product) {
      return null;
    }

    return this.getUnitPrice(product);
  }

  getMixPackOneYerbaPacks(): number {
    return this.mixPackOneItems
      .filter((mixItem: MixPackItem) => !this.normalizeText(mixItem.name).includes('mate cocido'))
      .reduce((total: number, mixItem: MixPackItem) => total + mixItem.quantity, 0);
  }

  addMixPackTwoToCart(): void {
    if (this.products.length === 0 || this.isLoading || this.errorMessage) {
      this.mixPackTwoFeedbackTone = 'warning';
      this.mixPackTwoFeedback = 'Todavia no se pueden cargar los productos del pallet mix. Intenta nuevamente en unos segundos.';
      return;
    }

    const resolvedProducts: Array<{ mixItem: MixPackItem; product: Product }> = [];
    const missingItems: string[] = [];

    for (const mixItem of this.mixPackTwoItems) {
      const product = this.findProductForMixItem(mixItem);
      if (!product) {
        missingItems.push(mixItem.name);
        continue;
      }

      resolvedProducts.push({ mixItem, product });
    }

    if (missingItems.length > 0) {
      this.mixPackTwoFeedbackTone = 'warning';
      this.mixPackTwoFeedback = `No se pudo cargar el Pallet Mix 2 completo. Faltan: ${missingItems.join(', ')}.`;
      return;
    }

    // Modo exclusivo: al elegir Pallet Mix 2 se reemplaza todo el carrito.
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

    this.mixPackTwoFeedbackTone = 'success';
    this.mixPackTwoFeedback = 'Pallet Mix 2 aplicado. El carrito anterior fue reemplazado por este pallet.';
  }

  getMixPackTwoItemPrice(mixItem: MixPackItem): number | null {
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
      'Hola! Quiero realizar un pedido para distribuidora por pallet:',
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

  getPalletPackCount(product: Product): number {
    const match = product.name.match(/PALLET\s*x\s*(\d+)/i);
    if (!match) {
      return 1;
    }

    const packCount = Number(match[1]);
    return Number.isFinite(packCount) && packCount > 0 ? packCount : 1;
  }

  getPalletPrice(product: Product): number {
    return this.getWholesalePrice(product) * this.getPalletPackCount(product);
  }

  getUnitPrice(product: Product): number {
    const divisor = this.getUnitDivisor(product);
    return this.getWholesalePrice(product) / divisor;
  }

  getUnitNetPriceWithoutTax(product: Product): number {
    return this.getUnitPrice(product) / 1.21;
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
    const category = this.normalizeText(this.getCategoryLabel(product));

    if (category.includes('yerba mate')) {
      return 10;
    }

    if (category.includes('mate cocido')) {
      return 20;
    }

    return 1;
  }

  private toDistributorProduct(product: Product): Product {
    const normalizedName = this.normalizeText(product.name);
    let distributorName = product.name;
    const distributorWholesalePrice = this.resolveDistributorWholesalePrice(normalizedName);

    if (normalizedName.includes('don julian') && normalizedName.includes('10x500g')) {
      distributorName = 'YM DON JULIAN 500g PALLET x96 PACK';
    } else if (normalizedName.includes('don julian') && normalizedName.includes('10x1kg')) {
      distributorName = 'YM DON JULIAN 1kg PALLET x50 PACK';
    } else if (normalizedName.includes('mateite') && normalizedName.includes('10x500g')) {
      distributorName = 'YM MATEITE 500g PALLET x96 PACK';
    } else if (normalizedName.includes('mateite') && normalizedName.includes('10x1kg')) {
      distributorName = 'YM MATEITE 1kg PALLET x50 PACK';
    } else if (normalizedName.includes('yerbella') && normalizedName.includes('10x500g')) {
      distributorName = 'YM YERBELLA 500g PALLET x104 PACK';
    } else if (normalizedName.includes('mate cocido') && normalizedName.includes('x20')) {
      distributorName = 'MC MATE COCIDO DON JULIAN x20 PALLET x100 PACK';
    }

    return {
      ...product,
      name: distributorName,
      wholesale_price: distributorWholesalePrice
    };
  }

  private resolveDistributorWholesalePrice(normalizedName: string): number {
    if (normalizedName.includes('mate cocido') && normalizedName.includes('x20')) {
      return 790 * 20;
    }

    if (normalizedName.includes('don julian') && normalizedName.includes('10x1kg')) {
      return 2480.5 * 10;
    }

    if (normalizedName.includes('mateite') && normalizedName.includes('10x1kg')) {
      return 2722.5 * 10;
    }

    if (normalizedName.includes('yerbella') && normalizedName.includes('10x500g')) {
      return 3499.32 * 10;
    }

    if (normalizedName.includes('don julian') && normalizedName.includes('10x500g')) {
      return 1270.5 * 10;
    }

    if (normalizedName.includes('mateite') && normalizedName.includes('10x500g')) {
      return 1391.5 * 10;
    }

    return 0;
  }

  private initializeCustomMixQuantities(): void {
    const nextQuantities: Record<string, number> = {};

    for (const product of this.products) {
      nextQuantities[product.id] = this.customMixQuantities[product.id] ?? 0;
    }

    this.customMixQuantities = nextQuantities;
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

  private refreshMixPackTwoAvailability(): void {
    let total = 0;
    let availableCount = 0;

    for (const mixItem of this.mixPackTwoItems) {
      const product = this.findProductForMixItem(mixItem);
      if (!product) {
        continue;
      }

      availableCount += 1;
      total += this.getWholesalePrice(product) * mixItem.quantity;
    }

    this.mixPackTwoAvailableCount = availableCount;
    this.mixPackTwoTotal = total;
    this.mixPackTwoIsComplete = availableCount === this.mixPackTwoItems.length;
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
