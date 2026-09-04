import Decimal from 'decimal.js';

import { Product } from '../models/product.model';
import {
  PriceCalculation,
  PriceCalculationInput,
  PricingAlert,
  ShelfRoundingRule
} from '../models/pricing.model';

const MONEY_DECIMALS = 2;
const PERCENT_DECIMALS = 4;
const MARGIN_ROUNDING_TOLERANCE = new Decimal('0.00001');

export const DEFAULT_SCENARIO_MARGINS = [15, 20, 25, 30, 35, 40] as const;

export function calculateExistingMarginPercent(pvpFinal: number, commercialPriceFinal: number): number {
  const pvp = positiveDecimal(pvpFinal, 'PVP final');
  const commercialPrice = positiveDecimal(commercialPriceFinal, 'precio comercial final');
  return toNumber(pvp.minus(commercialPrice).div(pvp).times(100).toDecimalPlaces(PERCENT_DECIMALS));
}

export function calculatePrice(input: PriceCalculationInput): PriceCalculation {
  validatePercentage(input.taxRatePercent, 'IVA');
  validatePercentage(input.targetMarginPercent, 'margen objetivo');
  validatePercentage(input.commercialDiscountPercent ?? 0, 'descuento comercial');
  validatePercentage(input.bonusPercent ?? 0, 'bonificacion');

  const pvpFinal = positiveDecimal(input.pvpFinal, 'PVP final');
  const taxRate = percentage(input.taxRatePercent);
  const targetMargin = percentage(input.targetMarginPercent);
  const discount = percentage(input.commercialDiscountPercent ?? 0);
  const bonus = percentage(input.bonusPercent ?? 0);
  const pvpNet = money(pvpFinal.div(taxRate.plus(1)));
  const maximumSaleNet = money(pvpNet.times(targetMargin.negated().plus(1)));
  const listPriceNet = input.listPriceNet == null
    ? maximumSaleNet
    : positiveDecimal(input.listPriceNet, 'precio de lista');
  const saleNet = money(listPriceNet.times(discount.negated().plus(1)).times(bonus.negated().plus(1)));
  const b2bTax = money(saleNet.times(taxRate));
  const invoicedPrice = money(saleNet.plus(b2bTax));
  const retailerGrossProfit = money(pvpNet.minus(saleNet));
  const retailerGrossMargin = pvpNet.isZero() ? new Decimal(0) : retailerGrossProfit.div(pvpNet);
  const retailerMarkup = saleNet.isZero() ? new Decimal(0) : retailerGrossProfit.div(saleNet);
  const amateInternalCost = input.amateInternalCost == null
    ? null
    : money(nonNegativeDecimal(input.amateInternalCost, 'costo interno de Amate'));
  const amateGrossProfit = amateInternalCost == null ? null : money(saleNet.minus(amateInternalCost));
  const amateGrossMargin = amateGrossProfit == null || saleNet.isZero()
    ? null
    : amateGrossProfit.div(saleNet);
  const recommendedPvp = input.recommendedPvp == null
    ? pvpFinal
    : positiveDecimal(input.recommendedPvp, 'PVP recomendado');
  const pvpDifference = money(pvpFinal.minus(recommendedPvp));
  const alerts = buildAlerts(input, {
    pvpFinal,
    pvpNet,
    maximumSaleNet,
    saleNet,
    retailerGrossMargin,
    amateInternalCost,
    pvpDifference
  });

  return {
    pvpFinal: toNumber(money(pvpFinal)),
    pvpNet: toNumber(pvpNet),
    targetMarginPercent: input.targetMarginPercent,
    maximumSaleNet: toNumber(maximumSaleNet),
    listPriceNet: toNumber(money(listPriceNet)),
    commercialDiscountPercent: input.commercialDiscountPercent ?? 0,
    bonusPercent: input.bonusPercent ?? 0,
    saleNet: toNumber(saleNet),
    b2bTax: toNumber(b2bTax),
    invoicedPrice: toNumber(invoicedPrice),
    retailerGrossProfit: toNumber(retailerGrossProfit),
    retailerGrossMarginPercent: toNumber(retailerGrossMargin.times(100).toDecimalPlaces(PERCENT_DECIMALS)),
    retailerMarkupPercent: toNumber(retailerMarkup.times(100).toDecimalPlaces(PERCENT_DECIMALS)),
    pvpDifference: toNumber(pvpDifference),
    amateInternalCost: amateInternalCost == null ? null : toNumber(amateInternalCost),
    amateGrossProfit: amateGrossProfit == null ? null : toNumber(amateGrossProfit),
    amateGrossMarginPercent: amateGrossMargin == null
      ? null
      : toNumber(amateGrossMargin.times(100).toDecimalPlaces(PERCENT_DECIMALS)),
    alerts
  };
}

export function calculateScenarios(
  input: Omit<PriceCalculationInput, 'targetMarginPercent'>,
  margins: readonly number[] = DEFAULT_SCENARIO_MARGINS
): PriceCalculation[] {
  return margins.map((targetMarginPercent: number) => calculatePrice({ ...input, targetMarginPercent }));
}

export function roundShelfPrice(price: number, rule: ShelfRoundingRule): number {
  const original = positiveDecimal(price, 'precio de gondola');
  if (!rule.enabled || rule.endings.length === 0) {
    return toNumber(money(original));
  }

  const wholePrice = original.ceil();
  const hundredBase = wholePrice.div(100).floor().times(100);
  const endings = [...new Set(rule.endings)]
    .filter((ending: number) => Number.isInteger(ending) && ending >= 0 && ending <= 99)
    .sort((left: number, right: number) => left - right);
  const candidate = endings
    .map((ending: number) => hundredBase.plus(ending))
    .find((value: Decimal) => value.greaterThanOrEqualTo(wholePrice));

  return toNumber(candidate ?? hundredBase.plus(100).plus(endings[0] ?? 0));
}

function buildAlerts(
  input: PriceCalculationInput,
  values: {
    pvpFinal: Decimal;
    pvpNet: Decimal;
    maximumSaleNet: Decimal;
    saleNet: Decimal;
    retailerGrossMargin: Decimal;
    amateInternalCost: Decimal | null;
    pvpDifference: Decimal;
  }
): PricingAlert[] {
  const alerts: PricingAlert[] = [];
  const targetMargin = percentage(input.targetMarginPercent);

  if (values.retailerGrossMargin.plus(MARGIN_ROUNDING_TOLERANCE).lessThan(targetMargin)) {
    alerts.push({ code: 'BELOW_TARGET_MARGIN', message: 'El precio comercial genera un margen inferior al objetivo.' });
  }
  if (values.saleNet.greaterThan(values.maximumSaleNet)) {
    alerts.push({ code: 'ABOVE_MAXIMUM_CHANNEL_PRICE', message: 'El precio comercial supera el maximo permitido para el canal.' });
  }
  if (values.pvpNet.lessThan(values.saleNet)) {
    alerts.push({ code: 'PVP_BELOW_COMMERCIAL_PRICE', message: 'El PVP neto queda por debajo del precio comercial neto.' });
  }
  if (values.retailerGrossMargin.isNegative()) {
    alerts.push({ code: 'NEGATIVE_RETAIL_MARGIN', message: 'El margen del comercio es negativo.' });
  }
  if (input.maximumDiscountPercent != null && (input.commercialDiscountPercent ?? 0) > input.maximumDiscountPercent) {
    alerts.push({ code: 'DISCOUNT_ABOVE_MAXIMUM', message: 'El descuento supera el maximo configurado.' });
  }
  if (values.amateInternalCost != null && values.saleNet.lessThan(values.amateInternalCost)) {
    alerts.push({ code: 'BELOW_AMATE_COST', message: 'El precio esta por debajo del costo interno de Amate.' });
  }
  if (
    (input.minimumCommercialPrice != null && values.saleNet.lessThan(input.minimumCommercialPrice))
    || (input.minimumPvp != null && values.pvpFinal.lessThan(input.minimumPvp))
    || (input.maximumPvp != null && values.pvpFinal.greaterThan(input.maximumPvp))
  ) {
    alerts.push({ code: 'PVP_OUTSIDE_RANGE', message: 'El precio esta fuera del rango comercial configurado.' });
  }
  if (!values.pvpDifference.isZero()) {
    alerts.push({ code: 'PVP_DIFFERENCE', message: 'Existe diferencia entre el PVP recomendado y el PVP real.' });
  }

  return alerts;
}

function validatePercentage(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value >= 100) {
    throw new Error(`El ${label} debe estar entre 0 y menos de 100.`);
  }
}

function positiveDecimal(value: number, label: string): Decimal {
  const decimal = new Decimal(value);
  if (!decimal.isFinite() || decimal.lessThanOrEqualTo(0)) {
    throw new Error(`El ${label} debe ser mayor que cero.`);
  }
  return decimal;
}

function nonNegativeDecimal(value: number, label: string): Decimal {
  const decimal = new Decimal(value);
  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new Error(`El ${label} no puede ser negativo.`);
  }
  return decimal;
}

function percentage(value: number): Decimal {
  return new Decimal(value).div(100);
}

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_DECIMALS, Decimal.ROUND_HALF_UP);
}

function toNumber(value: Decimal): number {
  return value.toNumber();
}

export function getCommercialProductKey(productName: string, categoryName: string): string {
  const name = normalizeProductText(productName).replace(/trad\.?/g, 'tradicional');
  const category = normalizeProductText(categoryName);

  if (category.includes('mate cocido')) {
    return 'mate-cocido|don-julian';
  }

  let family = 'otro';
  if (name.includes('caricias de mate')) {
    family = 'caricias-de-mate';
  } else if (name.includes('mate y playa')) {
    family = 'mate-y-playa';
  } else if (name.includes('don julian')) {
    family = 'don-julian';
  } else if (name.includes('mateite') && name.includes('premium')) {
    family = 'mateite-premium';
  } else if (name.includes('mateite')) {
    family = 'mateite';
  } else if (name.includes('yerbella')) {
    family = 'yerbella';
  }

  const presentation = name.includes('1000g') || /1\s*kg\b/.test(name)
    ? '1000g'
    : /(?:x|\b)500\s*g?\b/.test(name)
      ? '500g'
      : 'otra';
  const variant = name.includes('despalada')
    ? 'despalada'
    : name.includes('suave')
      ? 'suave'
      : name.includes('terere')
      ? 'terere'
      : name.includes('organica') || family === 'yerbella'
        ? 'organica'
        : name.includes('tradicional')
          ? 'tradicional'
          : 'clasica';

  return `${family}|${presentation}|${variant}`;
}

function normalizeProductText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function resolveCommercialProductKey(productName: string, categoryName: string, commercialKey?: string): string {
  return getCommercialProductKeys(productName, categoryName, commercialKey)[0];
}

export function getCommercialProductKeys(productName: string, categoryName: string, commercialKey?: string): string[] {
  const explicitKey = (commercialKey ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  return [...new Set([explicitKey, getCommercialProductKey(productName, categoryName)].filter(Boolean))];
}

export function attachPvpReferences(products: Product[], publicSaleProducts: Product[]): Product[] {
  const pvpByKey = new Map<string, number>();
  publicSaleProducts.forEach((product: Product) => {
    getCommercialProductKeys(product.name, product.category_name ?? product.category ?? '', product.commercial_key)
      .forEach((key: string) => pvpByKey.set(key, product.price));
  });

  return products.map((product: Product) => {
    const pvpReferencePrice = getCommercialProductKeys(
      product.name,
      product.category_name ?? product.category ?? '',
      product.commercial_key
    ).map((key: string) => pvpByKey.get(key))
      .find((price: number | undefined) => price !== undefined);

    return pvpReferencePrice === undefined
      ? product
      : { ...product, pvp_reference_price: pvpReferencePrice };
  });
}