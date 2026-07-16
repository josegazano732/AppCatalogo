import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

export interface RemotePriceUpdate {
  productId: string;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private clientPromise?: Promise<SupabaseClient>;

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