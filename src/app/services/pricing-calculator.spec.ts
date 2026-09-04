import { describe, expect, it } from 'vitest';

import { Product } from '../models/product.model';
import { ProductService } from './product.service';
import { SupabaseService } from './supabase.service';
import { attachPvpReferences, calculateExistingMarginPercent, calculatePrice, calculateScenarios, getCommercialProductKey, getCommercialProductKeys, resolveCommercialProductKey, roundShelfPrice } from './pricing-calculator';

describe('pricing calculator', () => {
  it('calcula hacia atras desde un PVP de $2.000 con IVA 21% y margen 25%', () => {
    const result = calculatePrice({ pvpFinal: 2000, taxRatePercent: 21, targetMarginPercent: 25 });

    expect(result.pvpNet).toBe(1652.89);
    expect(result.maximumSaleNet).toBe(1239.67);
    expect(result.b2bTax).toBe(260.33);
    expect(result.invoicedPrice).toBe(1500);
    expect(result.retailerGrossProfit).toBe(413.22);
    expect(result.retailerGrossMarginPercent).toBeCloseTo(25, 2);
    expect(result.retailerMarkupPercent).toBeCloseTo(33.33, 2);
    expect(result.alerts).toEqual([]);
  });

  it.each([15, 20, 30, 35, 40])('mantiene margen y markup separados para %i%%', (margin: number) => {
    const result = calculatePrice({ pvpFinal: 2000, taxRatePercent: 21, targetMarginPercent: margin });

    expect(result.retailerGrossMarginPercent / 100)
      .toBeCloseTo(result.retailerGrossProfit / result.pvpNet, 4);
    expect(result.retailerMarkupPercent / 100)
      .toBeCloseTo(result.retailerGrossProfit / result.saleNet, 4);
  });

  it('calcula la tabla de escenarios configurable', () => {
    const scenarios = calculateScenarios({ pvpFinal: 2000, taxRatePercent: 21 });
    expect(scenarios.map((scenario) => scenario.targetMarginPercent)).toEqual([15, 20, 25, 30, 35, 40]);
  });

  it('calcula el margen real que ya tiene un precio de lista', () => {
    expect(calculateExistingMarginPercent(2000, 1500)).toBe(25);
    expect(calculateExistingMarginPercent(1800, 1452)).toBeCloseTo(19.3333, 4);
  });

  it.each([
    ['YM DON JULIAN 10x500g PACK', 'YM x500g Don Julian', 'Yerba Mate'],
    ['YM 10x500g Don Julian DESPALADA', 'YM x500g Don Julian DESPALADA', 'Yerba Mate'],
    ['YM 10x500g Yerbella ORGANICA', 'YM x500 Yerbella ORGANICA', 'Yerba Mate'],
    ['YM YERBELLA 10x500g PACK', 'YM x500 Yerbella ORGANICA', 'Yerba Mate'],
    ['YM MATEITE PREMIUM 10x500g PACK', 'YM x500g Mateite PREMIUM', 'Yerba Mate'],
    ['YM DON JULIAN Pack 10x1kg PACK', 'YM x1000g Don Julian', 'Yerba Mate'],
    ['YM MATEITE PREMIUM 500g PALLET x75 PACK', 'YM x500g Mateite PREMIUM', 'Yerba Mate'],
    ['YM 10x1000g Caricias de Mate SUAVE', 'YM x1000g Caricias de Mate SUAVE', 'Yerba Mate'],
    ['MC Mate cocido DON JULIAN x20 PACK', 'Mate cocido Don Julian 25Ux2 G.', 'Mate Cocido']
  ])('relaciona %s con su PVP Consumidor Final', (commercialName: string, retailName: string, category: string) => {
    expect(getCommercialProductKey(commercialName, category)).toBe(getCommercialProductKey(retailName, category));
  });

  it('no confunde Don Julian Despalada con Don Julian clasica', () => {
    expect(getCommercialProductKey('YM 10x500g Don Julian DESPALADA', 'Yerba Mate'))
      .not.toBe(getCommercialProductKey('YM x500g Don Julian', 'Yerba Mate'));
  });

  it('prioriza una clave comercial estable aunque los nombres sean distintos', () => {
    expect(resolveCommercialProductKey('Nombre comercial A', 'Yerba Mate', 'producto-fisico-123'))
      .toBe(resolveCommercialProductKey('Nombre publico B', 'Otra categoria', ' PRODUCTO-FISICO-123 '));
  });

  it('conserva la clave derivada como respaldo si la persistida quedo desactualizada', () => {
    expect(getCommercialProductKeys('YM MATEITE PREMIUM 10x500g PACK', 'Yerba Mate', 'clave-anterior'))
      .toEqual(['clave-anterior', 'mateite-premium|500g|clasica']);
  });

  it('relaciona todos los productos de las listas comerciales con un PVP', () => {
    const productService = new ProductService({} as SupabaseService) as unknown as {
      baseProducts: Product[];
      commercePosExtraProducts: Product[];
      wholesaleCatalogProducts: Product[];
      retailCatalogProducts: Product[];
    };
    const publicSaleKeys = new Set(productService.retailCatalogProducts.flatMap((product: Product) => (
      getCommercialProductKeys(product.name, product.category_name ?? '', product.commercial_key)
    )));
    const commercialProducts = [
      ...productService.baseProducts,
      ...productService.commercePosExtraProducts,
      ...productService.wholesaleCatalogProducts
    ];
    const unmatchedProducts = commercialProducts
      .filter((product: Product) => !getCommercialProductKeys(product.name, product.category_name ?? '', product.commercial_key)
        .some((key: string) => publicSaleKeys.has(key)))
      .map((product: Product) => product.name);

    expect(unmatchedProducts).toEqual([]);
  });

  it('agrega el valor PVP a todos los productos de las listas comerciales', () => {
    const productService = new ProductService({} as SupabaseService) as unknown as {
      baseProducts: Product[];
      commercePosExtraProducts: Product[];
      wholesaleCatalogProducts: Product[];
      retailCatalogProducts: Product[];
    };
    const commercialProducts = [
      ...productService.baseProducts,
      ...productService.commercePosExtraProducts,
      ...productService.wholesaleCatalogProducts
    ];
    const enrichedProducts = attachPvpReferences(commercialProducts, productService.retailCatalogProducts);

    expect(enrichedProducts.every((product: Product) => Number.isFinite(product.pvp_reference_price))).toBe(true);
  });

  it('aplica descuento sobre lista sin confundirlo con el margen', () => {
    const result = calculatePrice({
      pvpFinal: 2000,
      taxRatePercent: 21,
      targetMarginPercent: 25,
      listPriceNet: 1500,
      commercialDiscountPercent: 17.355
    });

    expect(result.saleNet).toBe(1239.68);
    expect(result.listPriceNet).toBe(1500);
    expect(result.commercialDiscountPercent).toBe(17.355);
  });

  it('redondea por terminaciones comerciales sin cambiar el calculador', () => {
    const rule = { enabled: true, endings: [19, 39, 90, 99] };

    expect(roundShelfPrice(1987, rule)).toBe(1990);
    expect(roundShelfPrice(1992, rule)).toBe(1999);
    expect(roundShelfPrice(2013, rule)).toBe(2019);
    expect(roundShelfPrice(2037, rule)).toBe(2039);
  });
});