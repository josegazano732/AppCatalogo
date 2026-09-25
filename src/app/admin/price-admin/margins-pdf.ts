export interface MarginsPdfRowLike {
  productName: string;
  pvpFinal: number | null;
  currentCatalogPrice: number;
  currentMarginPercent: number | null;
  targetMarginPercent: number;
  proposedCatalogPrice: number | null;
}

export interface MarginsPdfSummary {
  title: string;
  catalogName: string;
  productCount: number;
  productsWithPvp: number;
  productsWithoutPvp: number;
  productsWithProposedPrice: number;
  averageTargetMarginPercent: number;
}

export function buildMarginsPdfSummary(rows: MarginsPdfRowLike[], catalogName: string): MarginsPdfSummary {
  const productCount = rows.length;
  const productsWithPvp = rows.filter((row) => row.pvpFinal !== null).length;
  const productsWithProposedPrice = rows.filter((row) => row.proposedCatalogPrice !== null).length;
  const averageTargetMarginPercent = productCount === 0
    ? 0
    : rows.reduce((sum, row) => sum + row.targetMarginPercent, 0) / productCount;

  return {
    title: 'Margenes actuales y objetivo',
    catalogName,
    productCount,
    productsWithPvp,
    productsWithoutPvp: productCount - productsWithPvp,
    productsWithProposedPrice,
    averageTargetMarginPercent
  };
}
