import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import type { PriceCalculationInput, PricingRule } from '../models/pricing.model';

export interface RemotePriceUpdate {
  productId: string;
  price: number;
}

export interface CatalogPdfReference {
  url: string | null;
  fileName: string | null;
}

export interface CatalogPdfDocument {
  id: string;
  catalogId: string;
  url: string;
  fileName: string;
  filePath: string | null;
  mimeType: string;
  updatedAt: string;
}

export interface CatalogProductUpsert {
  id: string;
  name: string;
  description: string;
  categoryName?: string;
  image?: string;
  unitOfMeasure?: string;
  sku?: string;
  commercialKey?: string;
  brand?: string;
  stock: number;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private clientPromise?: Promise<SupabaseClient>;
  private readonly pdfReferenceStorageKey = 'app-catalogo-pdf-references-v1';
  private readonly productImagesBucket = 'product-images';

  async getPublicSaleCatalogId(): Promise<string | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('catalogs')
      .select('id')
      .eq('is_public_sale', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.['id'] ? String(data['id']) : null;
  }

  async setPublicSaleCatalog(catalogId: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.rpc('set_public_sale_catalog', { target_catalog_id: catalogId });

    if (error) {
      throw error;
    }
  }

  async getCatalogProducts(catalogId: string): Promise<Product[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('catalog_prices')
      .select('product_id, price, sort_order, products(id, name, description, category_name, image, unit_of_measure, sku, commercial_key, brand, stock, metadata)')
      .eq('catalog_id', catalogId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('product_id', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data) ? data : [];

    return rows
      .map((row: any) => this.mapCatalogProductRow(row, catalogId))
      .filter((product: Product | null): product is Product => product !== null);
  }

  async getCatalogPrices(catalogId: string): Promise<Record<string, number>> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('catalog_prices')
      .select('product_id, price')
      .eq('catalog_id', catalogId)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    return (data ?? []).reduce<Record<string, number>>((prices, row) => {
      prices[String(row['product_id'])] = Number(row['price']);
      return prices;
    }, {});
  }

  async saveCatalogPrices(catalogId: string, updates: RemotePriceUpdate[]): Promise<void> {
    const client = await this.getClient();
    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
      throw new Error('Se requiere una sesion administrativa para guardar en Supabase.');
    }

    const rows = updates.map((update: RemotePriceUpdate) => ({
      catalog_id: catalogId,
      product_id: update.productId,
      price: update.price,
      is_active: true
    }));
    const { error } = await client
      .from('catalog_prices')
      .upsert(rows, { onConflict: 'catalog_id,product_id' });

    if (error) {
      throw error;
    }
  }

  async createCatalogProduct(catalogId: string, product: CatalogProductUpsert): Promise<void> {
    await this.upsertCatalogProduct(catalogId, product, false);
  }

  async updateCatalogProduct(catalogId: string, product: CatalogProductUpsert): Promise<void> {
    await this.upsertCatalogProduct(catalogId, product, true);
  }

  async deleteCatalogProduct(catalogId: string, productId: string): Promise<void> {
    const client = await this.getClient();
    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
      throw new Error('Se requiere una sesion administrativa para eliminar productos.');
    }

    const { error: deletePriceError } = await client
      .from('catalog_prices')
      .delete()
      .eq('catalog_id', catalogId)
      .eq('product_id', productId);

    if (deletePriceError) {
      throw deletePriceError;
    }

    const { count, error: countError } = await client
      .from('catalog_prices')
      .select('product_id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_active', true);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) === 0) {
      const { error: deleteProductError } = await client
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteProductError) {
        throw deleteProductError;
      }
    }
  }

  async uploadProductImage(catalogId: string, productId: string, imageBlob: Blob): Promise<string> {
    const client = await this.getClient();
    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
      throw new Error('Se requiere una sesion administrativa para subir imagenes.');
    }

    const fileName = `${Date.now()}.webp`;
    const storagePath = `catalogs/${catalogId}/${productId}/${fileName}`;
    const { error: uploadError } = await client.storage
      .from(this.productImagesBucket)
      .upload(storagePath, imageBlob, {
        upsert: true,
        contentType: 'image/webp'
      });

    if (uploadError) {
      const detail = [uploadError.message, uploadError.name]
        .filter((value: string | undefined) => Boolean(value && value.trim()))
        .join(' - ');
      throw new Error(`No se pudo subir la imagen WEBP. Verifica el bucket product-images y sus politicas de acceso. ${detail ? `Detalle: ${detail}` : ''}`.trim());
    }

    const { data: publicUrlData } = client.storage
      .from(this.productImagesBucket)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl?.trim();
    if (!publicUrl) {
      throw new Error('No se pudo obtener una URL publica para la imagen subida.');
    }

    return publicUrl;
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const client = await this.getClient();
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      throw error;
    }

    return Boolean(data.session);
  }

  async signOut(): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    const client = await this.getClient();
    const { data, error } = await client.auth.getUser();

    if (error) {
      return null;
    }

    return data.user?.id ?? null;
  }

  async getCurrentUserEmail(): Promise<string | null> {
    const client = await this.getClient();
    const { data, error } = await client.auth.getUser();

    if (error) {
      return null;
    }

    return data.user?.email ?? null;
  }

  async ensureCurrentUserAdmin(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return false;
      }

      return this.isCurrentUserAdmin(userId);
    } catch {
      return false;
    }
  }

  async isCurrentUserAdmin(userId: string): Promise<boolean> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !error && data?.['user_id'] === userId;
  }

  async isSchemaAvailable(): Promise<boolean> {
    const client = await this.getClient();
    const { error } = await client
      .from('catalogs')
      .select('id', { head: true, count: 'exact' });

    return !error;
  }

  async getPricingRules(): Promise<Record<string, unknown>[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('pricing_rules')
      .select('id, catalog_id, sales_channel_id, target_margin_percent, tax_rate_percent, commercial_discount_percent, bonus_percent, maximum_discount_percent, minimum_price, minimum_pvp, maximum_pvp, payment_terms, minimum_volume, rounding_enabled, rounding_endings')
      .eq('is_active', true)
      .order('catalog_id');

    if (error) {
      throw error;
    }

    return (data ?? []) as Record<string, unknown>[];
  }

  async savePricingRule(rule: PricingRule): Promise<void> {
    const client = await this.getClient();
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Se requiere una sesion administrativa para guardar reglas de pricing.');
    }

    const { error } = await client.from('pricing_rules').upsert({
      catalog_id: rule.catalogId,
      sales_channel_id: rule.salesChannelId,
      target_margin_percent: rule.targetMarginPercent,
      tax_rate_percent: rule.taxRatePercent,
      commercial_discount_percent: rule.commercialDiscountPercent,
      bonus_percent: rule.bonusPercent,
      maximum_discount_percent: rule.maximumDiscountPercent,
      minimum_price: rule.minimumPrice,
      minimum_pvp: rule.minimumPvp,
      maximum_pvp: rule.maximumPvp,
      payment_terms: rule.paymentTerms,
      minimum_volume: rule.minimumVolume,
      rounding_enabled: rule.rounding.enabled,
      rounding_endings: rule.rounding.endings,
      is_active: true
    }, { onConflict: 'catalog_id' });

    if (error) {
      throw error;
    }
  }

  async calculateCommercialPrice(input: PriceCalculationInput): Promise<Record<string, unknown>> {
    const client = await this.getClient();
    const { data, error } = await client.rpc('calculate_commercial_price', {
      p_pvp_final: input.pvpFinal,
      p_tax_rate_percent: input.taxRatePercent,
      p_target_margin_percent: input.targetMarginPercent,
      p_list_price_net: input.listPriceNet ?? null,
      p_discount_percent: input.commercialDiscountPercent ?? 0,
      p_bonus_percent: input.bonusPercent ?? 0,
      p_amate_internal_cost: input.amateInternalCost ?? null
    });

    if (error) {
      throw error;
    }

    return (data ?? {}) as Record<string, unknown>;
  }

  async getCatalogPdfReferences(catalogId: string): Promise<CatalogPdfDocument[]> {
    const client = await this.getClient();

    try {
      const { data, error } = await client
        .from('catalog_documents')
        .select('id, catalog_id, public_url, file_name, file_path, mime_type, updated_at')
        .eq('catalog_id', catalogId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const documents = (data ?? [])
        .map((row: any) => this.mapCatalogPdfDocumentRow(row))
        .filter((row: CatalogPdfDocument | null): row is CatalogPdfDocument => row !== null);

      this.setCatalogPdfReferencesInStorage(catalogId, documents);
      return documents;
    } catch {
      return this.getCatalogPdfReferencesFromStorage(catalogId);
    }
  }

  async uploadCatalogPdf(catalogId: string, file: File): Promise<CatalogPdfDocument> {
    const client = await this.getClient();
    const timestamp = Date.now();
    const baseFileName = this.sanitizeFileName(file.name || `${catalogId}.pdf`);
    const fileName = `${timestamp}-${baseFileName}`;
    const storagePath = `catalogs/${catalogId}/${fileName}`;

    try {
      const { error: uploadError } = await client.storage
        .from('catalog-pdfs')
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type || 'application/pdf'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = client.storage
        .from('catalog-pdfs')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl?.trim() || null;
      if (!publicUrl) {
        throw new Error('No se pudo obtener una URL publica del PDF. Verifica que el bucket catalog-pdfs sea publico y que las políticas de Storage esten activas.');
      }

      return this.createCatalogDocument(catalogId, publicUrl, fileName, storagePath, file.type || 'application/pdf');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el PDF a Supabase.';
      throw new Error(message);
    }
  }

  async saveCatalogPdfLink(catalogId: string, publicUrl: string, fileName?: string): Promise<CatalogPdfDocument> {
    const normalizedUrl = publicUrl.trim();
    if (!normalizedUrl) {
      throw new Error('Ingresa un enlace publico del PDF.');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw new Error('El enlace debe ser una URL valida, por ejemplo https://.../catalogo.pdf');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('El enlace debe comenzar con http:// o https://');
    }

    const timestamp = Date.now();
    const safeFileName = this.sanitizeFileName(fileName?.trim() || `${catalogId}-${timestamp}.pdf`);
    return this.createCatalogDocument(catalogId, parsedUrl.toString(), safeFileName, null, 'application/pdf');
  }

  async deleteCatalogPdfDocument(catalogId: string, document: CatalogPdfDocument): Promise<void> {
    const client = await this.getClient();

    if (!document.id) {
      throw new Error('No se pudo identificar el PDF seleccionado.');
    }

    if (document.id.startsWith('local-') || document.id.startsWith('legacy-')) {
      this.removeCatalogPdfReferenceInStorage(catalogId, document.id);
      return;
    }

    const { error: dbError } = await client
      .from('catalog_documents')
      .delete()
      .eq('catalog_id', catalogId)
      .eq('id', document.id);

    if (dbError) {
      throw new Error('Supabase rechazo la eliminacion del PDF seleccionado.');
    }

    if (document.filePath) {
      const { error: storageError } = await client.storage
        .from('catalog-pdfs')
        .remove([document.filePath]);

      if (storageError) {
        throw new Error('Se elimino el registro, pero no se pudo borrar el archivo en Storage.');
      }
    }

    this.removeCatalogPdfReferenceInStorage(catalogId, document.id);
  }

  private async createCatalogDocument(
    catalogId: string,
    publicUrl: string | null,
    fileName: string,
    filePath: string | null,
    mimeType: string
  ): Promise<CatalogPdfDocument> {
    const client = await this.getClient();
    const normalizedPublicUrl = this.normalizePublicUrl(publicUrl);

    if (!normalizedPublicUrl) {
      throw new Error('No se pudo generar una URL valida para el PDF.');
    }

    try {
      const { data, error: dbError } = await client
        .from('catalog_documents')
        .insert({
          catalog_id: catalogId,
          file_name: fileName,
          file_path: filePath,
          public_url: normalizedPublicUrl,
          mime_type: mimeType,
          updated_at: new Date().toISOString()
        })
        .select('id, catalog_id, public_url, file_name, file_path, mime_type, updated_at')
        .single();

      if (dbError) {
        throw dbError;
      }

      const createdDocument = this.mapCatalogPdfDocumentRow(data);
      if (!createdDocument) {
        throw new Error('No se pudo guardar el registro del PDF en Supabase.');
      }

      this.addCatalogPdfReferenceInStorage(catalogId, createdDocument);
      return createdDocument;
    } catch {
      const fallbackDocument: CatalogPdfDocument = {
        id: `local-${catalogId}-${Date.now()}`,
        catalogId,
        url: normalizedPublicUrl,
        fileName,
        filePath,
        mimeType,
        updatedAt: new Date().toISOString()
      };

      this.addCatalogPdfReferenceInStorage(catalogId, fallbackDocument);
      return fallbackDocument;
    }
  }

  private mapCatalogPdfDocumentRow(row: any): CatalogPdfDocument | null {
    const normalizedUrl = this.normalizePublicUrl(String(row?.public_url ?? ''));
    const fileName = String(row?.file_name ?? '').trim();

    if (!normalizedUrl || !fileName) {
      return null;
    }

    const updatedAt = String(row?.updated_at ?? '').trim() || new Date().toISOString();
    const mimeType = String(row?.mime_type ?? '').trim() || 'application/pdf';
    const catalogId = String(row?.catalog_id ?? '').trim();
    const rawId = String(row?.id ?? '').trim();
    const filePath = String(row?.file_path ?? '').trim() || null;

    return {
      id: rawId || `local-${catalogId || 'catalog'}-${Date.now()}`,
      catalogId,
      url: normalizedUrl,
      fileName,
      filePath,
      mimeType,
      updatedAt
    };
  }

  private getCatalogPdfReferencesFromStorage(catalogId: string): CatalogPdfDocument[] {
    try {
      const raw = localStorage.getItem(this.pdfReferenceStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const currentValue = parsed[catalogId];

      if (Array.isArray(currentValue)) {
        return currentValue
          .map((entry: any) => this.mapCatalogPdfDocumentRow({
            id: entry?.id,
            catalog_id: catalogId,
            public_url: entry?.url,
            file_name: entry?.fileName,
            file_path: entry?.filePath,
            mime_type: entry?.mimeType,
            updated_at: entry?.updatedAt
          }))
          .filter((entry: CatalogPdfDocument | null): entry is CatalogPdfDocument => entry !== null)
          .sort((a: CatalogPdfDocument, b: CatalogPdfDocument) => b.updatedAt.localeCompare(a.updatedAt));
      }

      const legacyReference = currentValue as CatalogPdfReference | undefined;
      const normalizedReference = this.normalizePublicUrl(legacyReference?.url ?? null);

      if (!normalizedReference) {
        return [];
      }

      return [{
        id: `legacy-${catalogId}`,
        catalogId,
        url: normalizedReference,
        fileName: this.sanitizeFileName(legacyReference?.fileName || `${catalogId}.pdf`),
        filePath: null,
        mimeType: 'application/pdf',
        updatedAt: new Date().toISOString()
      }];
    } catch {
      return [];
    }
  }

  private setCatalogPdfReferencesInStorage(catalogId: string, referencesForCatalog: CatalogPdfDocument[]): void {
    try {
      const raw = localStorage.getItem(this.pdfReferenceStorageKey);
      const references = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      references[catalogId] = referencesForCatalog.map((reference: CatalogPdfDocument) => ({
        id: reference.id,
        url: this.normalizePublicUrl(reference.url),
        fileName: reference.fileName,
        filePath: reference.filePath,
        mimeType: reference.mimeType,
        updatedAt: reference.updatedAt
      }));
      localStorage.setItem(this.pdfReferenceStorageKey, JSON.stringify(references));
    } catch {
      // Fallback silencioso si el navegador no permite localStorage.
    }
  }

  private addCatalogPdfReferenceInStorage(catalogId: string, reference: CatalogPdfDocument): void {
    const currentReferences = this.getCatalogPdfReferencesFromStorage(catalogId);
    const mergedReferences = [reference, ...currentReferences]
      .sort((a: CatalogPdfDocument, b: CatalogPdfDocument) => b.updatedAt.localeCompare(a.updatedAt));

    this.setCatalogPdfReferencesInStorage(catalogId, mergedReferences);
  }

  private removeCatalogPdfReferenceInStorage(catalogId: string, documentId: string): void {
    const currentReferences = this.getCatalogPdfReferencesFromStorage(catalogId);
    const filteredReferences = currentReferences.filter((reference: CatalogPdfDocument) => reference.id !== documentId);
    this.setCatalogPdfReferencesInStorage(catalogId, filteredReferences);
  }

  private normalizePublicUrl(publicUrl: string | null | undefined): string | null {
    const trimmed = publicUrl?.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = new URL(trimmed);
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      const isExampleHost = parsed.hostname.toLowerCase() === 'example.com' || parsed.hostname.toLowerCase().endsWith('.example.com');

      return isHttp && !isExampleHost ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  private sanitizeFileName(fileName: string): string {
    const safeName = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
    return safeName || 'catalogo.pdf';
  }

  private mapCatalogProductRow(row: any, catalogId: string): Product | null {
    const product = row?.products;
    if (!product || !product.id || !product.name) {
      return null;
    }

    const metadata = typeof product.metadata === 'object' && product.metadata !== null ? product.metadata : {};
    const price = Number(row?.price ?? 0);

    const mapped: Product = {
      id: String(product.id),
      name: String(product.name),
      description: String(product.description ?? ''),
      stock: Number(product.stock ?? 0),
      price,
      wholesale_price: price,
      category_name: product.category_name ? String(product.category_name) : undefined,
      image: product.image ? String(product.image) : undefined,
      unit_of_measure: product.unit_of_measure ? String(product.unit_of_measure) : undefined,
      sku: product.sku ? String(product.sku) : undefined,
      commercial_key: product.commercial_key ? String(product.commercial_key) : undefined,
      brand: product.brand ? String(product.brand) : undefined,
      pallet_units: this.parseOptionalNumber(metadata['pallet_units']),
      price_per_kilo: this.parseOptionalNumber(metadata['price_per_kilo']),
      unit_net_price: this.parseOptionalNumber(metadata['unit_net_price']),
      net_price: this.parseOptionalNumber(metadata['net_price']),
      tax_rate: this.parseOptionalNumber(metadata['tax_rate'])
    };

    if (catalogId === 'holowaty') {
      mapped.list_price = price;
    }

    return mapped;
  }

  private parseOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private async upsertCatalogProduct(catalogId: string, product: CatalogProductUpsert, isUpdate: boolean): Promise<void> {
    const client = await this.getClient();
    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData.session) {
      throw new Error('Se requiere una sesion administrativa para guardar productos.');
    }

    let metadata: Record<string, unknown> = {};

    if (isUpdate) {
      const { data: existingProduct } = await client
        .from('products')
        .select('metadata')
        .eq('id', product.id)
        .maybeSingle();

      if (existingProduct && typeof existingProduct['metadata'] === 'object' && existingProduct['metadata'] !== null) {
        metadata = { ...(existingProduct['metadata'] as Record<string, unknown>) };
      }
    }

    const productRow = {
      id: product.id,
      name: product.name,
      description: product.description,
      category_name: product.categoryName ?? null,
      image: product.image ?? null,
      unit_of_measure: product.unitOfMeasure ?? null,
      sku: product.sku ?? null,
      commercial_key: product.commercialKey ?? null,
      brand: product.brand ?? null,
      stock: product.stock,
      metadata
    };

    if (isUpdate) {
      const { error: updateError } = await client
        .from('products')
        .update(productRow)
        .eq('id', product.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await client
        .from('products')
        .insert(productRow);

      if (insertError) {
        throw insertError;
      }
    }

    const priceRow = {
      catalog_id: catalogId,
      product_id: product.id,
      price: product.price,
      is_active: true
    };

    const { error: priceError } = await client
      .from('catalog_prices')
      .upsert(priceRow, { onConflict: 'catalog_id,product_id' });

    if (priceError) {
      throw priceError;
    }
  }

  private getClient(): Promise<SupabaseClient> {
    if (!this.clientPromise) {
      this.clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(
        environment.supabaseUrl,
        environment.supabasePublishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      ));
    }

    return this.clientPromise;
  }
}