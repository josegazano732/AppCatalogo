import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Product } from '../../models/product.model';
import { PricingRule } from '../../models/pricing.model';
import { calculateExistingMarginPercent, calculatePrice, DEFAULT_SCENARIO_MARGINS, getCommercialProductKey, getCommercialProductKeys, resolveCommercialProductKey } from '../../services/pricing-calculator';
import { PricingService } from '../../services/pricing.service';
import {
  PriceCatalog,
  PriceCatalogId,
  ProductPriceUpdate,
  ProductService
} from '../../services/product.service';
import { CatalogPdfDocument, CatalogProductUpsert, CatalogUpsert, SupabaseService } from '../../services/supabase.service';

type AdminAccessState = 'loading' | 'signed-out' | 'unauthorized' | 'admin';

interface ProductFormState {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  unitOfMeasure: string;
  sku: string;
  commercialKey: string;
  brand: string;
  stock: string;
  price: string;
  imageUrl: string;
}

interface ProductPricingRow {
  product: Product;
  retailProduct: Product | null;
  pvpFinal: number | null;
  currentCatalogPrice: number;
  currentUnitPrice: number;
  currentMarginPercent: number | null;
  targetMarginPercent: number;
  proposedUnitPrice: number | null;
  proposedCatalogPrice: number | null;
}

interface CatalogFormState {
  id: string;
  name: string;
  description: string;
  route: string;
  priceLabel: string;
}

@Component({
  selector: 'app-price-admin',
  templateUrl: './price-admin.component.html',
  styleUrls: ['./price-admin.component.css']
})
export class PriceAdminComponent implements OnInit {
  catalogs: PriceCatalog[];
  readonly pricingMargins = [...DEFAULT_SCENARIO_MARGINS];

  selectedCatalogId: PriceCatalogId = 'whatsapp';
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];
  priceDrafts: Record<string, string> = {};

  searchTerm = '';
  selectedCategory = '';
  percentageDraft = '';
  isLoading = false;
  isSaving = false;
  isSavingProduct = false;
  isDeletingProduct = false;
  isUploadingPdf = false;
  isDeletingPdf = false;
  feedbackMessage = '';
  feedbackTone: 'success' | 'error' | '' = '';
  accessState: AdminAccessState = 'loading';
  authMode: 'sign-in' | 'sign-up' = 'sign-in';
  authEmail = '';
  authPassword = '';
  authMessage = '';
  authMessageTone: 'success' | 'error' | '' = '';
  isAuthSubmitting = false;
  showPassword = false;
  catalogPdfDocuments: CatalogPdfDocument[] = [];
  selectedCatalogPdfId = '';
  pdfLinkDraft = '';
  editingProductId: string | null = null;
  deletingProductId: string | null = null;
  selectedProductImageFile: File | null = null;
  selectedProductImageName = '';
  productForm: ProductFormState = this.createEmptyProductForm();
  pricingRule: PricingRule = this.createDefaultPricingRule();
  pricingRows: ProductPricingRow[] = [];
  pricingBulkMargin = 25;
  isCalculatingPrice = false;
  isSavingPricingRule = false;
  isGeneratingMarginsPdf = false;
  publicSaleCatalogId: PriceCatalogId = 'retail';
  isSavingPublicSaleCatalog = false;
  isLoadingCatalogs = false;
  isSavingCatalog = false;
  editingCatalogId: string | null = null;
  catalogForm: CatalogFormState = this.createEmptyCatalogForm();

  private originalPrices: Record<string, number> = {};

  constructor(
    private readonly productService: ProductService,
    private readonly supabase: SupabaseService,
    private readonly pricingService: PricingService
  ) {
    this.catalogs = this.productService.getPriceCatalogs();
  }

  ngOnInit(): void {
    void this.initializeAccess();
  }

  get isAdmin(): boolean {
    return this.accessState === 'admin';
  }

  get selectedCatalog(): PriceCatalog {
    return this.catalogs.find((catalog: PriceCatalog) => catalog.id === this.selectedCatalogId) as PriceCatalog;
  }

  get changedProductsCount(): number {
    return this.products.filter((product: Product) => this.isProductChanged(product)).length;
  }

  get isEditingProduct(): boolean {
    return Boolean(this.editingProductId);
  }

  get isEditingCatalog(): boolean {
    return this.editingCatalogId !== null;
  }

  get supportsCommercialPricing(): boolean {
    return ['wholesale', 'distributor-pallet', 'commerce-pos'].includes(this.selectedCatalogId);
  }

  get isSelectedPublicSaleCatalog(): boolean {
    return this.selectedCatalogId === this.publicSaleCatalogId;
  }

  async setSelectedAsPublicSaleCatalog(): Promise<void> {
    if (this.isSelectedPublicSaleCatalog || this.isSavingPublicSaleCatalog) {
      return;
    }

    if (!window.confirm(`¿Usar "${this.selectedCatalog.name}" como fuente de PVP Consumidor Final?`)) {
      return;
    }

    this.isSavingPublicSaleCatalog = true;
    this.clearFeedback();

    try {
      await this.supabase.setPublicSaleCatalog(this.selectedCatalogId);
      this.publicSaleCatalogId = this.selectedCatalogId;
      await this.initializeCommercialPricing();
      this.showFeedback(`${this.selectedCatalog.name} ahora es la fuente de PVP Consumidor Final.`, 'success');
    } catch {
      this.showFeedback('No se pudo cambiar la lista de PVP. Ejecuta la migracion de pricing escalable.', 'error');
    } finally {
      this.isSavingPublicSaleCatalog = false;
    }
  }

  async submitAuth(): Promise<void> {
    const email = this.authEmail.trim().toLowerCase();

    if (!email || this.authPassword.length < 6) {
      this.showAuthMessage('Ingresa un correo valido y una contrasena de al menos 6 caracteres.', 'error');
      return;
    }

    this.isAuthSubmitting = true;
    this.authMessage = '';

    try {
      if (this.authMode === 'sign-up') {
        const hasSession = await this.supabase.signUp(email, this.authPassword);

        if (!hasSession) {
          this.showAuthMessage('Revisa tu correo y confirma la cuenta antes de ingresar.', 'success');
          return;
        }
      } else {
        await this.supabase.signIn(email, this.authPassword);
      }

      await this.initializeAccess();
    } catch (error: unknown) {
      this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
    } finally {
      this.isAuthSubmitting = false;
    }
  }

  toggleAuthMode(): void {
    this.authMode = this.authMode === 'sign-in' ? 'sign-up' : 'sign-in';
    this.authPassword = '';
    this.showPassword = false;
    this.authMessage = '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async signOut(): Promise<void> {
    await this.supabase.signOut();
    this.accessState = 'signed-out';
    this.products = [];
    this.filteredProducts = [];
    this.authPassword = '';
    this.showAuthMessage('La sesion se cerro correctamente.', 'success');
  }

  selectCatalog(catalogId: PriceCatalogId): void {
    if (catalogId === this.selectedCatalogId) {
      return;
    }

    if (this.changedProductsCount > 0 && !window.confirm('Hay cambios sin guardar. ¿Quieres cambiar de catalogo y descartarlos?')) {
      return;
    }

    this.selectedCatalogId = catalogId;
    this.searchTerm = '';
    this.selectedCategory = '';
    this.percentageDraft = '';
    this.cancelProductForm();
    this.loadCatalog();
  }

  createNewCatalog(): void {
    this.editingCatalogId = null;
    this.catalogForm = this.createEmptyCatalogForm();
    this.clearFeedback();
  }

  editCatalog(catalog: PriceCatalog): void {
    this.editingCatalogId = catalog.id;
    this.catalogForm = {
      id: catalog.id,
      name: catalog.name,
      description: catalog.description,
      route: catalog.route,
      priceLabel: catalog.priceLabel
    };
    this.clearFeedback();
  }

  async saveCatalog(): Promise<void> {
    const name = this.catalogForm.name.trim();
    const priceLabel = this.catalogForm.priceLabel.trim();
    if (!name || !priceLabel) {
      this.showFeedback('Completa el nombre y la etiqueta de precio del catalogo.', 'error');
      return;
    }

    this.isSavingCatalog = true;
    this.clearFeedback();
    const wasEditing = this.isEditingCatalog;
    const id = this.editingCatalogId ?? this.createCatalogId(name);
    const catalog: CatalogUpsert = {
      id,
      name,
      description: this.catalogForm.description.trim(),
      route: wasEditing ? this.catalogForm.route : `/catalogo/${id}`,
      priceLabel
    };

    try {
      if (wasEditing) {
        await this.supabase.updateCatalog(catalog);
      } else {
        await this.supabase.createCatalog(catalog);
      }
      await this.loadManagedCatalogs();
      const savedCatalog = this.catalogs.find((item: PriceCatalog) => item.id === id);
      if (savedCatalog) {
        this.editCatalog(savedCatalog);
      }
      this.showFeedback(`Catalogo ${wasEditing ? 'actualizado' : 'creado'} correctamente.`, 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      this.showFeedback(message.includes('duplicate') ? 'Ya existe un catalogo con ese identificador.' : 'No se pudo guardar el catalogo.', 'error');
    } finally {
      this.isSavingCatalog = false;
    }
  }

  async setCatalogActive(catalog: PriceCatalog): Promise<void> {
    const nextActive = catalog.isActive === false;
    const action = nextActive ? 'reactivar' : 'desactivar';
    if (!window.confirm(`¿Quieres ${action} "${catalog.name}"?`)) {
      return;
    }

    this.isSavingCatalog = true;
    this.clearFeedback();
    try {
      await this.supabase.setCatalogActive(catalog.id, nextActive);
      await this.loadManagedCatalogs();
      this.showFeedback(`Catalogo ${nextActive ? 'reactivado' : 'desactivado'} correctamente.`, 'success');
    } catch (error: unknown) {
      this.showFeedback(error instanceof Error ? error.message : 'No se pudo cambiar el estado del catalogo.', 'error');
    } finally {
      this.isSavingCatalog = false;
    }
  }

  applyFilters(): void {
    const normalizedSearch = this.normalizeText(this.searchTerm);

    this.filteredProducts = this.products.filter((product: Product) => {
      const category = this.getCategoryLabel(product);
      const matchesCategory = !this.selectedCategory || category === this.selectedCategory;
      const searchableText = `${product.name} ${product.sku ?? ''} ${product.brand ?? ''} ${category}`;
      const matchesSearch = !normalizedSearch || this.normalizeText(searchableText).includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }

  updatePriceDraft(product: Product, value: string | number | null): void {
    this.priceDrafts[product.id] = String(value ?? '');
    this.clearFeedback();
  }

  calculateAllCommercialPrices(): void {
    this.isCalculatingPrice = true;
    this.clearFeedback();

    try {
      this.pricingRows.forEach((row: ProductPricingRow) => this.calculatePricingRow(row));
    } catch (error: unknown) {
      this.showFeedback(error instanceof Error ? error.message : 'No se pudo calcular el precio.', 'error');
    } finally {
      this.isCalculatingPrice = false;
    }
  }

  applyBulkPricingMargin(): void {
    if (!Number.isFinite(this.pricingBulkMargin) || this.pricingBulkMargin < 0 || this.pricingBulkMargin >= 100) {
      this.showFeedback('El margen general debe estar entre 0 y menos de 100.', 'error');
      return;
    }

    this.pricingRule.targetMarginPercent = this.pricingBulkMargin;
    this.pricingRows.forEach((row: ProductPricingRow) => {
      row.targetMarginPercent = this.pricingBulkMargin;
      this.calculatePricingRow(row);
    });
    this.showFeedback(`Se preparo toda la lista con ${this.formatPercent(this.pricingBulkMargin)} de margen. Revisa los precios antes de aplicarlos.`, 'success');
  }

  onPricingPvpChange(row: ProductPricingRow): void {
    this.updateCurrentMargin(row);
    this.calculatePricingRow(row);
  }

  onTargetMarginChange(row: ProductPricingRow): void {
    this.calculatePricingRow(row);
  }

  async savePricingMargin(): Promise<void> {
    this.isSavingPricingRule = true;
    this.clearFeedback();

    try {
      await this.pricingService.saveRule(this.pricingRule);
      this.showFeedback(`Margen de ${this.formatPercent(this.pricingRule.targetMarginPercent)} guardado para ${this.selectedCatalog.name}.`, 'success');
    } catch {
      this.showFeedback('El margen quedo guardado localmente. Ejecuta la migracion de pricing para sincronizarlo con Supabase.', 'error');
    } finally {
      this.isSavingPricingRule = false;
    }
  }

  applyCalculatedPrice(row: ProductPricingRow): void {
    if (row.proposedCatalogPrice === null) {
      this.showFeedback(`Define un PVP valido para ${row.product.name}.`, 'error');
      return;
    }

    this.updatePriceDraft(row.product, this.formatEditablePrice(row.proposedCatalogPrice));
    this.showFeedback(`Se aplico ${this.formatPrice(row.proposedCatalogPrice)} a ${row.product.name}. Usa Guardar cambios para confirmar.`, 'success');
  }

  applyAllCalculatedPrices(): void {
    const applicableRows = this.pricingRows.filter((row: ProductPricingRow) => row.proposedCatalogPrice !== null);
    applicableRows.forEach((row: ProductPricingRow) => {
      this.priceDrafts[row.product.id] = this.formatEditablePrice(row.proposedCatalogPrice as number);
    });
    this.showFeedback(`Se aplicaron ${applicableRows.length} precios calculados. Revisa la tabla inferior y usa Guardar cambios para confirmar.`, 'success');
  }

  async downloadMarginsPdf(): Promise<void> {
    if (this.pricingRows.length === 0 || this.isGeneratingMarginsPdf) {
      return;
    }

    this.isGeneratingMarginsPdf = true;
    this.clearFeedback();

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const autoTable = autoTableModule.default;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const availableTableHeight = pdf.internal.pageSize.getHeight() - 34;
      const rowHeight = Math.min(7.2, availableTableHeight / (this.pricingRows.length + 1));
      const fontSize = Math.max(4.2, Math.min(7, rowHeight * 0.72));
      const body = this.pricingRows.map((row: ProductPricingRow) => [
        row.product.name,
        this.formatOptionalPrice(row.pvpFinal),
        this.formatPrice(row.currentCatalogPrice),
        this.formatOptionalPercent(row.currentMarginPercent),
        this.formatPercent(row.targetMarginPercent),
        this.formatOptionalPrice(row.proposedCatalogPrice)
      ]);

      pdf.setTextColor(21, 34, 29);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Margenes actuales y objetivo', 10, 12);
      pdf.setFontSize(9);
      pdf.text(`Productos de ${this.selectedCatalog.name}`, 10, 18);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(101, 115, 109);
      pdf.text(`Generado: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`, pageWidth - 10, 18, { align: 'right' });

      autoTable(pdf, {
        startY: 23,
        margin: { left: 18, right: 18, bottom: 8 },
        theme: 'grid',
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        head: [[
          'Producto',
          'PVP Consumidor Final',
          'Precio actual lista',
          'Margen actual',
          'Margen objetivo',
          'Precio propuesto'
        ]],
        body,
        styles: {
          font: 'helvetica',
          fontSize,
          minCellHeight: rowHeight,
          cellPadding: { top: 0.5, right: 1, bottom: 0.5, left: 1 },
          overflow: 'ellipsize',
          valign: 'middle',
          lineColor: [205, 219, 210],
          lineWidth: 0.12,
          textColor: [40, 55, 48]
        },
        headStyles: {
          fillColor: [23, 107, 77],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: { fillColor: [243, 246, 244] },
        columnStyles: {
          0: { cellWidth: 79, halign: 'left' },
          1: { cellWidth: 38, halign: 'right' },
          2: { cellWidth: 38, halign: 'right' },
          3: { cellWidth: 34, halign: 'right' },
          4: { cellWidth: 34, halign: 'right' },
          5: { cellWidth: 38, halign: 'right' }
        }
      });

      const fileCatalog = this.normalizeText(this.selectedCatalog.name)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      pdf.save(`margenes-${fileCatalog || this.selectedCatalogId}.pdf`);
      this.showFeedback('PDF de margenes generado en una hoja A4 horizontal.', 'success');
    } catch {
      this.showFeedback('No se pudo generar el PDF de margenes.', 'error');
    } finally {
      this.isGeneratingMarginsPdf = false;
    }
  }

  formatPercent(value: number): string {
    return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}%`;
  }

  formatOptionalPercent(value: number | null): string {
    return value === null ? 'Sin PVP' : this.formatPercent(value);
  }

  applyPercentage(): void {
    const percentage = this.parseDecimal(this.percentageDraft);

    if (percentage === null || percentage <= -100 || percentage > 1000) {
      this.showFeedback('Ingresa un porcentaje mayor a -100 y menor o igual a 1000.', 'error');
      return;
    }

    const factor = 1 + percentage / 100;

    this.filteredProducts.forEach((product: Product) => {
      const currentPrice = this.parseDecimal(this.priceDrafts[product.id]) ?? this.originalPrices[product.id];
      this.priceDrafts[product.id] = this.formatEditablePrice(currentPrice * factor);
    });

    this.showFeedback(`Se aplico ${percentage}% a ${this.filteredProducts.length} productos visibles. Revisa y guarda los cambios.`, 'success');
  }

  resetChanges(): void {
    this.products.forEach((product: Product) => {
      this.priceDrafts[product.id] = this.formatEditablePrice(this.originalPrices[product.id]);
    });
    this.percentageDraft = '';
    this.showFeedback('Se descartaron los cambios pendientes.', 'success');
  }

  saveChanges(): void {
    const updates: ProductPriceUpdate[] = [];

    for (const product of this.products) {
      if (!this.isProductChanged(product)) {
        continue;
      }

      const price = this.parseDecimal(this.priceDrafts[product.id]);
      if (price === null || price <= 0) {
        this.showFeedback(`Revisa el precio de "${product.name}". Debe ser mayor que cero.`, 'error');
        return;
      }

      updates.push({ productId: product.id, price });
    }

    if (updates.length === 0) {
      this.showFeedback('No hay cambios pendientes para guardar.', 'error');
      return;
    }

    this.isSaving = true;

    try {
      this.productService.saveCatalogPrices(this.selectedCatalogId, updates).subscribe({
        next: (products: Product[]) => {
          this.setProducts(products);
          this.isSaving = false;
          this.showFeedback(`Se guardaron ${updates.length} precios en ${this.selectedCatalog.name}.`, 'success');
        },
        error: (error: unknown) => {
          this.isSaving = false;
          this.showFeedback(this.getSaveErrorMessage(error), 'error');
        }
      });
    } catch {
      this.isSaving = false;
      this.showFeedback('El navegador no pudo guardar los precios localmente.', 'error');
    }
  }

  isProductChanged(product: Product): boolean {
    const draftPrice = this.parseDecimal(this.priceDrafts[product.id]);
    return draftPrice !== null && Math.abs(draftPrice - this.originalPrices[product.id]) >= 0.005;
  }

  getCategoryLabel(product: Product): string {
    return product.category_name || product.category || 'Sin categoria';
  }

  getOriginalPrice(product: Product): number {
    return this.originalPrices[product.id];
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatOptionalPrice(value: number | null): string {
    return value === null ? '-' : this.formatPrice(value);
  }

  trackProduct(_index: number, product: Product): string {
    return product.id;
  }

  editProduct(product: Product): void {
    this.editingProductId = product.id;
    this.productForm = {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      categoryName: product.category_name || product.category || '',
      unitOfMeasure: product.unit_of_measure ?? '',
      sku: product.sku ?? '',
      commercialKey: product.commercial_key ?? this.getPricingProductKey(product),
      brand: product.brand ?? '',
      stock: String(product.stock ?? 0),
      price: this.formatEditablePrice(this.getProductPrice(product)),
      imageUrl: product.image ?? ''
    };
    this.selectedProductImageFile = null;
    this.selectedProductImageName = '';
    this.clearFeedback();
  }

  createNewProduct(): void {
    this.cancelProductForm();
  }

  cancelProductForm(): void {
    this.editingProductId = null;
    this.productForm = this.createEmptyProductForm();
    this.selectedProductImageFile = null;
    this.selectedProductImageName = '';
  }

  onProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.selectedProductImageFile = null;
      this.selectedProductImageName = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showFeedback('Selecciona un archivo de imagen valido.', 'error');
      input.value = '';
      this.selectedProductImageFile = null;
      this.selectedProductImageName = '';
      return;
    }

    this.selectedProductImageFile = file;
    this.selectedProductImageName = file.name;
    this.clearFeedback();
  }

  async saveProductForm(): Promise<void> {
    if (this.isSavingProduct) {
      return;
    }

    const name = this.productForm.name.trim();
    const description = this.productForm.description.trim();
    const categoryName = this.productForm.categoryName.trim();
    const stock = this.parseDecimal(this.productForm.stock);
    const price = this.parseDecimal(this.productForm.price);

    if (!name) {
      this.showFeedback('Ingresa el nombre del producto.', 'error');
      return;
    }

    if (stock === null || stock < 0) {
      this.showFeedback('El stock debe ser un numero mayor o igual a cero.', 'error');
      return;
    }

    if (price === null || price <= 0) {
      this.showFeedback('El precio del producto debe ser mayor que cero.', 'error');
      return;
    }

    this.isSavingProduct = true;
    this.clearFeedback();

    try {
      const schemaAvailable = await this.supabase.isSchemaAvailable();
      if (!schemaAvailable) {
        this.showFeedback('No se detecto el esquema administrativo de Supabase para guardar productos.', 'error');
        return;
      }

      const productId = this.editingProductId ?? this.createProductId(name);
      let imageUrl = this.productForm.imageUrl.trim();

      if (this.selectedProductImageFile) {
        const webpBlob = await this.convertImageToWebp(this.selectedProductImageFile);
        imageUrl = await this.supabase.uploadProductImage(this.selectedCatalogId, productId, webpBlob);
      }

      const payload: CatalogProductUpsert = {
        id: productId,
        name,
        description,
        categoryName,
        unitOfMeasure: this.productForm.unitOfMeasure.trim(),
        sku: this.productForm.sku.trim(),
        commercialKey: this.normalizeCommercialKey(this.productForm.commercialKey),
        brand: this.productForm.brand.trim(),
        stock: Number(stock.toFixed(2)),
        price: Number(price.toFixed(2)),
        image: imageUrl || undefined
      };

      if (this.editingProductId) {
        await this.supabase.updateCatalogProduct(this.selectedCatalogId, payload);
        this.showFeedback('Producto actualizado correctamente.', 'success');
      } else {
        await this.supabase.createCatalogProduct(this.selectedCatalogId, payload);
        this.showFeedback('Producto creado correctamente.', 'success');
      }

      this.cancelProductForm();
      this.loadCatalog();
    } catch (error: unknown) {
      this.showFeedback(this.getProductErrorMessage(error), 'error');
    } finally {
      this.isSavingProduct = false;
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    if (this.isDeletingProduct) {
      return;
    }

    const shouldDelete = window.confirm(`¿Eliminar "${product.name}" del catalogo actual?`);
    if (!shouldDelete) {
      return;
    }

    this.isDeletingProduct = true;
    this.deletingProductId = product.id;
    this.clearFeedback();

    try {
      await this.supabase.deleteCatalogProduct(this.selectedCatalogId, product.id);
      if (this.editingProductId === product.id) {
        this.cancelProductForm();
      }
      this.showFeedback('Producto eliminado del catalogo.', 'success');
      this.loadCatalog();
    } catch (error: unknown) {
      this.showFeedback(this.getProductErrorMessage(error), 'error');
    } finally {
      this.isDeletingProduct = false;
      this.deletingProductId = null;
    }
  }

  async onPdfSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.showFeedback('Solo se permiten archivos PDF para este catalogo.', 'error');
      input.value = '';
      return;
    }

    this.isUploadingPdf = true;
    this.clearFeedback();

    try {
      await this.supabase.uploadCatalogPdf(this.selectedCatalogId, file);
      await this.loadSelectedCatalogPdf();
      this.showFeedback(`Se agrego un PDF para ${this.selectedCatalog.name}. Total: ${this.catalogPdfDocuments.length}.`, 'success');
    } catch (error: unknown) {
      const message = this.getPdfUploadErrorMessage(error);
      this.showFeedback(message, 'error');
      if (message.toLowerCase().includes('bucket') || message.toLowerCase().includes('not found') || message.toLowerCase().includes('storage')) {
        this.pdfLinkDraft = '';
      }
    } finally {
      this.isUploadingPdf = false;
      input.value = '';
    }
  }

  async saveCatalogPdfLink(): Promise<void> {
    const publicUrl = this.pdfLinkDraft.trim();
    if (!publicUrl) {
      this.showFeedback('Pegá un enlace publico del PDF para guardarlo.', 'error');
      return;
    }

    this.isUploadingPdf = true;
    this.clearFeedback();

    try {
      await this.supabase.saveCatalogPdfLink(this.selectedCatalogId, publicUrl);
      await this.loadSelectedCatalogPdf();
      this.pdfLinkDraft = '';
      this.showFeedback(`Se agrego el enlace del PDF para ${this.selectedCatalog.name}. Total: ${this.catalogPdfDocuments.length}.`, 'success');
    } catch (error: unknown) {
      this.showFeedback(this.getPdfUploadErrorMessage(error), 'error');
    } finally {
      this.isUploadingPdf = false;
    }
  }

  async copyCatalogPdfLink(pdfUrl: string): Promise<void> {
    if (!pdfUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pdfUrl);
      this.showFeedback('El enlace del PDF se copio al portapapeles.', 'success');
    } catch {
      this.showFeedback('No se pudo copiar el enlace automaticamente.', 'error');
    }
  }

  selectPdfDocument(documentId: string): void {
    this.selectedCatalogPdfId = documentId;
  }

  async deleteSelectedPdf(): Promise<void> {
    if (!this.selectedCatalogPdfId || this.isDeletingPdf) {
      return;
    }

    const selectedDocument = this.catalogPdfDocuments.find((document: CatalogPdfDocument) => document.id === this.selectedCatalogPdfId);
    if (!selectedDocument) {
      this.showFeedback('Selecciona un PDF valido antes de eliminar.', 'error');
      return;
    }

    const shouldDelete = window.confirm(`¿Eliminar el PDF "${selectedDocument.fileName}"? Esta accion no se puede deshacer.`);
    if (!shouldDelete) {
      return;
    }

    this.isDeletingPdf = true;
    this.clearFeedback();

    try {
      await this.supabase.deleteCatalogPdfDocument(this.selectedCatalogId, selectedDocument);
      await this.loadSelectedCatalogPdf();
      this.showFeedback('PDF eliminado correctamente.', 'success');
    } catch (error: unknown) {
      this.showFeedback(this.getPdfUploadErrorMessage(error), 'error');
    } finally {
      this.isDeletingPdf = false;
    }
  }

  trackPdfDocument(_index: number, document: CatalogPdfDocument): string {
    return document.id;
  }

  private loadCatalog(): void {
    this.isLoading = true;
    this.clearFeedback();

    this.productService.getPriceCatalogProducts(this.selectedCatalogId).subscribe({
      next: (products: Product[]) => {
        this.setProducts(products);
        this.isLoading = false;
        void this.loadSelectedCatalogPdf();
      },
      error: () => {
        this.products = [];
        this.filteredProducts = [];
        this.isLoading = false;
        this.showFeedback('No se pudo cargar el catalogo seleccionado.', 'error');
      }
    });
  }

  private async loadSelectedCatalogPdf(): Promise<void> {
    this.catalogPdfDocuments = [];
    this.selectedCatalogPdfId = '';

    try {
      const references = await this.supabase.getCatalogPdfReferences(this.selectedCatalogId);
      this.catalogPdfDocuments = references;
      this.selectedCatalogPdfId = this.catalogPdfDocuments[0]?.id ?? '';
    } catch {
      this.catalogPdfDocuments = [];
      this.selectedCatalogPdfId = '';
    }
  }

  private async initializeAccess(): Promise<void> {
    this.accessState = 'loading';

    try {
      const schemaAvailable = await this.supabase.isSchemaAvailable();
      if (!schemaAvailable) {
        this.accessState = 'signed-out';
        this.showAuthMessage('Supabase aun no tiene el esquema administrativo configurado.', 'error');
        return;
      }

      const userId = await this.supabase.getCurrentUserId();
      if (!userId) {
        this.accessState = 'signed-out';
        return;
      }

      const isAdminByRole = await this.supabase.isCurrentUserAdmin(userId);
      const isAdmin = isAdminByRole || await this.supabase.ensureCurrentUserAdmin();

      if (!isAdmin) {
        this.accessState = 'unauthorized';
        this.showAuthMessage('La cuenta esta autenticada, pero no tiene permisos de administrador.', 'error');
        return;
      }

      this.accessState = 'admin';
      this.authMessage = '';
      await this.loadManagedCatalogs();
      await this.loadPublicSaleCatalogId();
      this.loadCatalog();
    } catch {
      this.accessState = 'signed-out';
      this.showAuthMessage('No se pudo verificar el acceso con Supabase.', 'error');
    }
  }

  private async loadPublicSaleCatalogId(): Promise<void> {
    try {
      const catalogId = await this.supabase.getPublicSaleCatalogId();
      if (catalogId && this.catalogs.some((catalog: PriceCatalog) => catalog.id === catalogId)) {
        this.publicSaleCatalogId = catalogId as PriceCatalogId;
      }
    } catch {
      this.publicSaleCatalogId = 'retail';
    }
  }

  private async loadManagedCatalogs(): Promise<void> {
    this.isLoadingCatalogs = true;
    try {
      this.catalogs = await firstValueFrom(this.productService.getManagedCatalogs(true));
      if (!this.catalogs.some((catalog: PriceCatalog) => catalog.id === this.selectedCatalogId)) {
        this.selectedCatalogId = this.catalogs.find((catalog: PriceCatalog) => catalog.isActive !== false)?.id ?? 'whatsapp';
      }
    } finally {
      this.isLoadingCatalogs = false;
    }
  }

  private setProducts(products: Product[]): void {
    this.products = products;
    this.originalPrices = {};
    this.priceDrafts = {};

    products.forEach((product: Product) => {
      const price = this.getProductPrice(product);
      this.originalPrices[product.id] = price;
      this.priceDrafts[product.id] = this.formatEditablePrice(price);
    });

    this.categories = [...new Set(products.map((product: Product) => this.getCategoryLabel(product)))].sort((a, b) => a.localeCompare(b, 'es'));
    this.applyFilters();

    if (this.editingProductId && !products.some((product: Product) => product.id === this.editingProductId)) {
      this.cancelProductForm();
    }

    void this.initializeCommercialPricing();
  }

  private async initializeCommercialPricing(): Promise<void> {
    this.pricingRows = [];

    if (!this.supportsCommercialPricing) {
      return;
    }

    try {
      const [rules, publicSaleProducts] = await Promise.all([
        this.pricingService.getRules(),
        firstValueFrom(this.productService.getPublicSaleCatalogProducts())
      ]);
      this.pricingRule = this.clonePricingRule(
        rules.find((rule: PricingRule) => rule.catalogId === this.selectedCatalogId)
        ?? this.createDefaultPricingRule()
      );
      this.pricingBulkMargin = this.pricingRule.targetMarginPercent;
      const publicSaleByKey = new Map<string, Product>();
      publicSaleProducts.forEach((product: Product) => {
        this.getPricingProductKeys(product).forEach((key: string) => publicSaleByKey.set(key, product));
      });

      this.pricingRows = this.products.map((product: Product) => {
        const retailProduct = this.getPricingProductKeys(product)
          .map((key: string) => publicSaleByKey.get(key))
          .find((candidate: Product | undefined) => candidate !== undefined) ?? null;
        const currentCatalogPrice = this.getProductPrice(product);
        const currentUnitPrice = currentCatalogPrice / this.getPricingItemUnits(product);
        const row: ProductPricingRow = {
          product,
          retailProduct,
          pvpFinal: retailProduct ? this.getPublicSaleProductPrice(retailProduct) : null,
          currentCatalogPrice,
          currentUnitPrice,
          currentMarginPercent: null,
          targetMarginPercent: this.pricingRule.targetMarginPercent,
          proposedUnitPrice: null,
          proposedCatalogPrice: null
        };
        this.updateCurrentMargin(row);
        if (row.currentMarginPercent !== null) {
          row.targetMarginPercent = row.currentMarginPercent;
        }
        this.calculatePricingRow(row);
        return row;
      });
    } catch {
      this.pricingRows = [];
      this.showFeedback('No se pudo relacionar esta lista con los PVP de Consumidor Final.', 'error');
    }
  }

  private calculatePricingRow(row: ProductPricingRow): void {
    if (row.pvpFinal === null || row.pvpFinal <= 0 || row.targetMarginPercent < 0 || row.targetMarginPercent >= 100) {
      row.proposedUnitPrice = null;
      row.proposedCatalogPrice = null;
      return;
    }

    const calculation = calculatePrice({
      pvpFinal: row.pvpFinal,
      taxRatePercent: this.pricingRule.taxRatePercent,
      targetMarginPercent: row.targetMarginPercent
    });
    row.proposedUnitPrice = calculation.invoicedPrice;
    row.proposedCatalogPrice = Number((calculation.invoicedPrice * this.getPricingItemUnits(row.product)).toFixed(2));
  }

  private updateCurrentMargin(row: ProductPricingRow): void {
    row.currentMarginPercent = row.pvpFinal !== null && row.pvpFinal > 0
      ? calculateExistingMarginPercent(row.pvpFinal, row.currentUnitPrice)
      : null;
  }

  private getPricingItemUnits(product: Product): number {
    if (!product || product.unit_of_measure?.toLowerCase() !== 'pack') {
      return 1;
    }

    const leadingUnits = product.name.match(/(\d+)\s*x/i)?.[1];
    const trailingUnits = product.name.match(/x\s*(\d+)/i)?.[1];
    const parsedUnits = Number(leadingUnits ?? trailingUnits ?? 1);
    return Number.isFinite(parsedUnits) && parsedUnits > 0 ? parsedUnits : 1;
  }

  private getPublicSaleProductPrice(product: Product): number {
    return product.price;
  }

  private getPricingProductKey(product: Product): string {
    return resolveCommercialProductKey(product.name, this.getCategoryLabel(product), product.commercial_key);
  }

  private getPricingProductKeys(product: Product): string[] {
    return getCommercialProductKeys(product.name, this.getCategoryLabel(product), product.commercial_key);
  }

  private normalizeCommercialKey(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  }

  private createDefaultPricingRule(): PricingRule {
    const catalogId = this.selectedCatalogId === 'distributor-pallet' || this.selectedCatalogId === 'commerce-pos'
      ? this.selectedCatalogId
      : 'wholesale';

    return {
      catalogId,
      salesChannelId: catalogId === 'distributor-pallet' ? 'distributor' : catalogId === 'commerce-pos' ? 'self-service' : 'wholesaler',
      targetMarginPercent: catalogId === 'distributor-pallet' ? 15 : catalogId === 'commerce-pos' ? 25 : 20,
      taxRatePercent: 21,
      commercialDiscountPercent: 0,
      bonusPercent: 0,
      maximumDiscountPercent: 40,
      minimumPrice: null,
      minimumPvp: null,
      maximumPvp: null,
      paymentTerms: 'Contado',
      minimumVolume: 1,
      rounding: { enabled: false, endings: [] }
    };
  }

  private clonePricingRule(rule: PricingRule): PricingRule {
    return { ...rule, rounding: { ...rule.rounding, endings: [...rule.rounding.endings] } };
  }

  private getProductPrice(product: Product): number {
    if (this.selectedCatalogId === 'holowaty') {
      return product.list_price ?? product.wholesale_price ?? product.price;
    }

    return product.wholesale_price ?? product.price;
  }

  private parseDecimal(value: string | number | undefined): number | null {
    const normalizedValue = String(value ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsedValue = Number(normalizedValue);

    return normalizedValue !== '' && Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private formatEditablePrice(value: number): string {
    return Number(value.toFixed(2)).toString();
  }

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private showFeedback(message: string, tone: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackTone = tone;
  }

  private clearFeedback(): void {
    this.feedbackMessage = '';
    this.feedbackTone = '';
  }

  private showAuthMessage(message: string, tone: 'success' | 'error'): void {
    this.authMessage = message;
    this.authMessageTone = tone;
  }

  private getAuthErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('invalid login credentials')) {
      return 'Correo o contrasena incorrectos.';
    }

    if (message.includes('user already registered')) {
      return 'Ese correo ya tiene una cuenta. Ingresa con tu contrasena.';
    }

    return 'No se pudo completar el acceso. Intenta nuevamente.';
  }

  private getSaveErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('sesion administrativa')) {
      return 'La sesion vencio. Vuelve a ingresar antes de guardar.';
    }

    return 'Supabase rechazo el guardado. Verifica tu sesion e intenta nuevamente.';
  }

  private getProductErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('duplicate key') || message.includes('already exists')) {
      return 'El ID generado ya existe. Reintenta crear el producto.';
    }

    if (message.includes('product-images') || message.includes('storage')) {
      return 'No se pudo cargar la imagen. Revisa el bucket product-images y sus politicas.';
    }

    if (message.includes('sesion administrativa')) {
      return 'La sesion administrativa vencio. Vuelve a iniciar sesion.';
    }

    return 'No se pudo guardar el producto en Supabase.';
  }

  private getPdfUploadErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No se pudo cargar el PDF. Verifica la conexion a Supabase y que el bucket de almacenamiento exista.';
  }

  private createEmptyProductForm(): ProductFormState {
    return {
      id: '',
      name: '',
      description: '',
      categoryName: '',
      unitOfMeasure: 'unidad',
      sku: '',
      commercialKey: '',
      brand: '',
      stock: '0',
      price: '',
      imageUrl: ''
    };
  }

  private createEmptyCatalogForm(): CatalogFormState {
    return {
      id: '',
      name: '',
      description: '',
      route: '',
      priceLabel: 'Precio'
    };
  }

  private createCatalogId(name: string): string {
    const slug = this.normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${slug || 'catalogo'}-${Date.now()}`;
  }

  private createProductId(name: string): string {
    const slug = this.normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${this.selectedCatalogId}-${slug || 'producto'}-${Date.now()}`;
  }

  private async convertImageToWebp(file: File): Promise<Blob> {
    const image = await this.loadImageFromFile(file);
    const maxSize = 1400;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Tu navegador no permite procesar imagenes en este momento.');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((generatedBlob: Blob | null) => resolve(generatedBlob), 'image/webp', 0.82);
    });

    if (!blob) {
      throw new Error('No se pudo convertir la imagen a formato WEBP.');
    }

    return blob;
  }

  private loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('El archivo de imagen no pudo abrirse.'));
      };

      image.src = objectUrl;
    });
  }
}