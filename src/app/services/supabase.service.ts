import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private clientPromise?: Promise<SupabaseClient>;
  private readonly pdfReferenceStorageKey = 'app-catalogo-pdf-references-v1';

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