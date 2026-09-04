export type PricingCatalogId = 'commerce-pos' | 'distributor-pallet' | 'wholesale' | 'retail';

export interface SalesChannel {
  id: string;
  name: string;
  catalogId: PricingCatalogId | null;
  isActive: boolean;
}

export interface ShelfRoundingRule {
  enabled: boolean;
  endings: number[];
}

export interface PricingRule {
  id?: string;
  catalogId: Exclude<PricingCatalogId, 'retail'>;
  salesChannelId: string;
  targetMarginPercent: number;
  taxRatePercent: number;
  commercialDiscountPercent: number;
  bonusPercent: number;
  maximumDiscountPercent: number;
  minimumPrice: number | null;
  minimumPvp: number | null;
  maximumPvp: number | null;
  paymentTerms: string;
  minimumVolume: number;
  rounding: ShelfRoundingRule;
}

export type PricingAlertCode =
  | 'BELOW_TARGET_MARGIN'
  | 'ABOVE_MAXIMUM_CHANNEL_PRICE'
  | 'PVP_BELOW_COMMERCIAL_PRICE'
  | 'NEGATIVE_RETAIL_MARGIN'
  | 'DISCOUNT_ABOVE_MAXIMUM'
  | 'BELOW_AMATE_COST'
  | 'PVP_OUTSIDE_RANGE'
  | 'PVP_DIFFERENCE';

export interface PricingAlert {
  code: PricingAlertCode;
  message: string;
}

export interface PriceCalculationInput {
  pvpFinal: number;
  taxRatePercent: number;
  targetMarginPercent: number;
  listPriceNet?: number | null;
  commercialDiscountPercent?: number;
  bonusPercent?: number;
  maximumDiscountPercent?: number | null;
  amateInternalCost?: number | null;
  minimumCommercialPrice?: number | null;
  minimumPvp?: number | null;
  maximumPvp?: number | null;
  recommendedPvp?: number | null;
}

export interface PriceCalculation {
  pvpFinal: number;
  pvpNet: number;
  targetMarginPercent: number;
  maximumSaleNet: number;
  listPriceNet: number;
  commercialDiscountPercent: number;
  bonusPercent: number;
  saleNet: number;
  b2bTax: number;
  invoicedPrice: number;
  retailerGrossProfit: number;
  retailerGrossMarginPercent: number;
  retailerMarkupPercent: number;
  pvpDifference: number;
  amateInternalCost: number | null;
  amateGrossProfit: number | null;
  amateGrossMarginPercent: number | null;
  alerts: PricingAlert[];
}