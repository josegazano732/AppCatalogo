import { Component, OnInit } from '@angular/core';

import { Product } from '../../models/product.model';
import {
  PriceCatalog,
  PriceCatalogId,
  ProductPriceUpdate,
  ProductService
} from '../../services/product.service';
import { CatalogPdfDocument, CatalogProductUpsert, SupabaseService } from '../../services/supabase.service';

type AdminAccessState = 'loading' | 'signed-out' | 'unauthorized' | 'admin';

interface ProductFormState {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  unitOfMeasure: string;
  sku: string;
  brand: string;
  stock: string;
  price: string;
  imageUrl: string;
}

@Component({
  selector: 'app-price-admin',
  templateUrl: './price-admin.component.html',
  styleUrls: ['./price-admin.component.css']
})
export class PriceAdminComponent implements OnInit {
  readonly catalogs: PriceCatalog[];

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

  private originalPrices: Record<string, number> = {};

  constructor(
    private readonly productService: ProductService,
    private readonly supabase: SupabaseService
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
      this.loadCatalog();
    } catch {
      this.accessState = 'signed-out';
      this.showAuthMessage('No se pudo verificar el acceso con Supabase.', 'error');
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
      brand: '',
      stock: '0',
      price: '',
      imageUrl: ''
    };
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