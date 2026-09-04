import { Injectable } from '@angular/core';

import { PriceCalculation, PriceCalculationInput, PricingRule } from '../models/pricing.model';
import { calculatePrice } from './pricing-calculator';
import { SupabaseService } from './supabase.service';

const DEFAULT_RULES: PricingRule[] = [
  createDefaultRule('wholesale', 'wholesaler', 20, 10),
  createDefaultRule('distributor-pallet', 'distributor', 15, 1),
  createDefaultRule('commerce-pos', 'self-service', 25, 1)
];

@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly storageKey = 'app-catalogo-pricing-rules-v1';

  constructor(private readonly supabase: SupabaseService) {}

  async getRules(): Promise<PricingRule[]> {
    try {
      const rows = await this.supabase.getPricingRules();
      if (rows.length > 0) {
        const rules = rows.map((row: Record<string, unknown>) => this.mapRule(row));
        this.storeRules(rules);
        return rules;
      }
    } catch {
      // La migracion puede no estar aplicada todavia; se usa la configuracion local.
    }

    return this.readStoredRules();
  }

  async saveRule(rule: PricingRule): Promise<void> {
    validateRule(rule);
    const rules = this.readStoredRules().filter((current: PricingRule) => current.catalogId !== rule.catalogId);
    this.storeRules([...rules, rule]);
    await this.supabase.savePricingRule(rule);
  }

  async calculate(input: PriceCalculationInput): Promise<PriceCalculation> {
    const localResult = calculatePrice(input);

    try {
      const remote = await this.supabase.calculateCommercialPrice(input);
      return {
        ...localResult,
        pvpFinal: numberValue(remote['pvpFinal']),
        pvpNet: numberValue(remote['pvpNet']),
        targetMarginPercent: numberValue(remote['targetMarginPercent']),
        maximumSaleNet: numberValue(remote['maximumSaleNet']),
        listPriceNet: numberValue(remote['listPriceNet']),
        commercialDiscountPercent: numberValue(remote['commercialDiscountPercent']),
        bonusPercent: numberValue(remote['bonusPercent']),
        saleNet: numberValue(remote['saleNet']),
        b2bTax: numberValue(remote['b2bTax']),
        invoicedPrice: numberValue(remote['invoicedPrice']),
        retailerGrossProfit: numberValue(remote['retailerGrossProfit']),
        retailerGrossMarginPercent: numberValue(remote['retailerGrossMarginPercent']),
        retailerMarkupPercent: numberValue(remote['retailerMarkupPercent']),
        amateInternalCost: nullableNumber(remote['amateInternalCost']),
        amateGrossProfit: nullableNumber(remote['amateGrossProfit']),
        amateGrossMarginPercent: nullableNumber(remote['amateGrossMarginPercent'])
      };
    } catch {
      return localResult;
    }
  }

  async calculateScenarios(
    input: Omit<PriceCalculationInput, 'targetMarginPercent'>,
    margins: readonly number[]
  ): Promise<PriceCalculation[]> {
    return Promise.all(margins.map((targetMarginPercent: number) => this.calculate({ ...input, targetMarginPercent })));
  }

  private mapRule(row: Record<string, unknown>): PricingRule {
    return {
      id: String(row['id']),
      catalogId: row['catalog_id'] as PricingRule['catalogId'],
      salesChannelId: String(row['sales_channel_id']),
      targetMarginPercent: numberValue(row['target_margin_percent']),
      taxRatePercent: numberValue(row['tax_rate_percent']),
      commercialDiscountPercent: numberValue(row['commercial_discount_percent']),
      bonusPercent: numberValue(row['bonus_percent']),
      maximumDiscountPercent: numberValue(row['maximum_discount_percent']),
      minimumPrice: nullableNumber(row['minimum_price']),
      minimumPvp: nullableNumber(row['minimum_pvp']),
      maximumPvp: nullableNumber(row['maximum_pvp']),
      paymentTerms: String(row['payment_terms']),
      minimumVolume: numberValue(row['minimum_volume']),
      rounding: {
        enabled: Boolean(row['rounding_enabled']),
        endings: Array.isArray(row['rounding_endings'])
          ? row['rounding_endings'].map((value: unknown) => numberValue(value))
          : [19, 39, 90, 99]
      }
    };
  }

  private readStoredRules(): PricingRule[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) as PricingRule[] : DEFAULT_RULES.map(cloneRule);
    } catch {
      return DEFAULT_RULES.map(cloneRule);
    }
  }

  private storeRules(rules: PricingRule[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(rules));
  }
}

function createDefaultRule(
  catalogId: PricingRule['catalogId'],
  salesChannelId: string,
  targetMarginPercent: number,
  minimumVolume: number
): PricingRule {
  return {
    catalogId,
    salesChannelId,
    targetMarginPercent,
    taxRatePercent: 21,
    commercialDiscountPercent: 0,
    bonusPercent: 0,
    maximumDiscountPercent: 40,
    minimumPrice: null,
    minimumPvp: null,
    maximumPvp: null,
    paymentTerms: 'Contado',
    minimumVolume,
    rounding: { enabled: true, endings: [19, 39, 90, 99] }
  };
}

function validateRule(rule: PricingRule): void {
  if (rule.commercialDiscountPercent > rule.maximumDiscountPercent) {
    throw new Error('El descuento comercial no puede superar el maximo configurado.');
  }
  if (rule.minimumPvp != null && rule.maximumPvp != null && rule.minimumPvp > rule.maximumPvp) {
    throw new Error('El PVP minimo no puede superar al PVP maximo.');
  }
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Supabase devolvio un valor numerico invalido.');
  }
  return parsed;
}

function nullableNumber(value: unknown): number | null {
  return value == null ? null : numberValue(value);
}

function cloneRule(rule: PricingRule): PricingRule {
  return { ...rule, rounding: { ...rule.rounding, endings: [...rule.rounding.endings] } };
}