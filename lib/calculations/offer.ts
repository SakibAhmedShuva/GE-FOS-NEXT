export type OfferVisibleColumns = {
  foreign_price?: boolean;
  po_price?: boolean;
  local_supply_price?: boolean;
  installation_price?: boolean;
};

export type OfferFinancials = {
  freight_foreign_usd?: number | string | null;
  discount_foreign_usd?: number | string | null;
  freight_po_usd?: number | string | null;
  discount_po_usd?: number | string | null;
  delivery_local_bdt?: number | string | null;
  vat_local_bdt?: number | string | null;
  ait_local_bdt?: number | string | null;
  discount_local_bdt?: number | string | null;
  discount_installation_bdt?: number | string | null;
  use_freight?: boolean;
  use_discount_foreign?: boolean;
  use_freight_po?: boolean;
  use_discount_po?: boolean;
  use_delivery?: boolean;
  use_vat?: boolean;
  use_ait?: boolean;
  use_discount_local?: boolean;
  use_discount_installation?: boolean;
  vat_is_percentage?: boolean;
  ait_is_percentage?: boolean;
  vat_percentage?: number | string | null;
  ait_percentage?: number | string | null;
  use_total_in_bdt?: boolean;
  use_customs_duty?: boolean;
  total_in_bdt?: number | string | null;
  customs_duty_bdt?: number | string | null;
  total_in_bdt_is_auto?: boolean;
  customs_duty_is_auto?: boolean;
};

export type OfferConfig = {
  bdt_conversion_rate: number;
  customs_duty_percentage: number;
};

export type OfferCalculationItem = {
  qty?: number | string | null;
  foreign_price_usd?: number | string | null;
  foreign_total_usd?: number | string | null;
  local_supply_price_bdt?: number | string | null;
  local_supply_total_bdt?: number | string | null;
  installation_price_bdt?: number | string | null;
  installation_total_bdt?: number | string | null;
  po_price_usd?: number | string | null;
  po_total_usd?: number | string | null;
};

export type NormalizedOfferItemTotals = {
  foreignTotalUsd: number;
  poTotalUsd: number;
  localSupplyTotalBdt: number;
  installationTotalBdt: number;
};

export type OfferCalculationResult = {
  items: NormalizedOfferItemTotals[];
  subtotals: {
    foreignUsd: number;
    poUsd: number;
    localSupplyBdt: number;
    installationBdt: number;
  };
  adjustments: {
    freightForeignUsd: number;
    discountForeignUsd: number;
    freightPoUsd: number;
    discountPoUsd: number;
    deliveryLocalBdt: number;
    vatLocalBdt: number;
    aitLocalBdt: number;
    discountLocalBdt: number;
    discountInstallationBdt: number;
    totalInBdt: number;
    customsDutyBdt: number;
  };
  grandTotals: {
    foreignUsd: number;
    poUsd: number;
    localSupplyBdt: number;
    installationBdt: number;
    foreignGrandTotalBdt: number;
  };
  updatedFinancials: OfferFinancials;
  labels: {
    subtotalForeign: string;
    grandtotalForeign: string;
  };
};

const DEFAULT_VISIBLE_COLUMNS: Required<OfferVisibleColumns> = {
  foreign_price: true,
  po_price: false,
  local_supply_price: false,
  installation_price: false,
};

const DEFAULT_CONFIG: OfferConfig = {
  bdt_conversion_rate: 125,
  customs_duty_percentage: 16,
};

function numberValue(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeVisibleColumns(visibleColumns?: OfferVisibleColumns): Required<OfferVisibleColumns> {
  return { ...DEFAULT_VISIBLE_COLUMNS, ...(visibleColumns || {}) };
}

function normalizeConfig(config?: Partial<OfferConfig>): OfferConfig {
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

export function calculateOfferItemTotals(item: OfferCalculationItem): NormalizedOfferItemTotals {
  const qty = numberValue(item.qty) || 0;

  const foreignTotalFromUnit = numberValue(item.foreign_price_usd) * qty;
  const poTotalFromUnit = numberValue(item.po_price_usd) * qty;
  const localTotalFromUnit = numberValue(item.local_supply_price_bdt) * qty;
  const installationTotalFromUnit = numberValue(item.installation_price_bdt) * qty;

  return {
    foreignTotalUsd: round2(numberValue(item.foreign_total_usd) || foreignTotalFromUnit),
    poTotalUsd: round2(numberValue(item.po_total_usd) || poTotalFromUnit),
    localSupplyTotalBdt: round2(numberValue(item.local_supply_total_bdt) || localTotalFromUnit),
    installationTotalBdt: round2(numberValue(item.installation_total_bdt) || installationTotalFromUnit),
  };
}

export function calculateOfferTotals({
  items,
  financials = {},
  visibleColumns,
  config,
}: {
  items: OfferCalculationItem[];
  financials?: OfferFinancials;
  visibleColumns?: OfferVisibleColumns;
  config?: Partial<OfferConfig>;
}): OfferCalculationResult {
  const columns = normalizeVisibleColumns(visibleColumns);
  const offerConfig = normalizeConfig(config);
  const normalizedItems = items.map(calculateOfferItemTotals);

  const subtotalForeign = columns.foreign_price ? normalizedItems.reduce((sum, item) => sum + item.foreignTotalUsd, 0) : 0;
  const subtotalPo = columns.po_price ? normalizedItems.reduce((sum, item) => sum + item.poTotalUsd, 0) : 0;
  const subtotalLocal = columns.local_supply_price ? normalizedItems.reduce((sum, item) => sum + item.localSupplyTotalBdt, 0) : 0;
  const subtotalInstallation = columns.installation_price ? normalizedItems.reduce((sum, item) => sum + item.installationTotalBdt, 0) : 0;

  const freightForeign = financials.use_freight && columns.foreign_price ? numberValue(financials.freight_foreign_usd) : 0;
  const discountForeign = financials.use_discount_foreign && columns.foreign_price ? numberValue(financials.discount_foreign_usd) : 0;
  const freightPo = financials.use_freight_po && columns.po_price ? numberValue(financials.freight_po_usd) : 0;
  const discountPo = financials.use_discount_po && columns.po_price ? numberValue(financials.discount_po_usd) : 0;

  const isLocalSectionVisible = columns.local_supply_price || columns.installation_price;
  const deliveryLocal = financials.use_delivery && isLocalSectionVisible ? numberValue(financials.delivery_local_bdt) : 0;

  const vatLocal = financials.use_vat && isLocalSectionVisible
    ? financials.vat_is_percentage !== false
      ? round2(subtotalLocal * (numberValue(financials.vat_percentage ?? 7.5) / 100))
      : numberValue(financials.vat_local_bdt)
    : 0;

  const aitLocal = financials.use_ait && isLocalSectionVisible
    ? financials.ait_is_percentage !== false
      ? round2(subtotalLocal * (numberValue(financials.ait_percentage ?? 5) / 100))
      : numberValue(financials.ait_local_bdt)
    : 0;

  const discountLocal = financials.use_discount_local && columns.local_supply_price ? numberValue(financials.discount_local_bdt) : 0;
  const discountInstallation = financials.use_discount_installation && columns.installation_price ? numberValue(financials.discount_installation_bdt) : 0;

  const grandForeign = round2(subtotalForeign + freightForeign - discountForeign);
  const grandPo = round2(subtotalPo + freightPo - discountPo);
  const grandLocal = round2(subtotalLocal + deliveryLocal + vatLocal + aitLocal - discountLocal);
  const grandInstallation = round2(subtotalInstallation - discountInstallation);

  let totalInBdt = financials.use_total_in_bdt ? numberValue(financials.total_in_bdt) : 0;
  if (financials.use_total_in_bdt && financials.total_in_bdt_is_auto !== false) {
    totalInBdt = round2(grandForeign * offerConfig.bdt_conversion_rate);
  }

  let customsDuty = financials.use_customs_duty ? numberValue(financials.customs_duty_bdt) : 0;
  if (financials.use_customs_duty && financials.customs_duty_is_auto !== false && totalInBdt > 0) {
    customsDuty = Math.ceil((totalInBdt * (offerConfig.customs_duty_percentage / 100)) / 100) * 100;
  }

  const updatedFinancials: OfferFinancials = {
    ...financials,
    vat_local_bdt: financials.use_vat && financials.vat_is_percentage !== false ? vatLocal.toFixed(2) : financials.vat_local_bdt,
    ait_local_bdt: financials.use_ait && financials.ait_is_percentage !== false ? aitLocal.toFixed(2) : financials.ait_local_bdt,
    total_in_bdt: financials.use_total_in_bdt && financials.total_in_bdt_is_auto !== false ? totalInBdt.toFixed(2) : financials.total_in_bdt,
    customs_duty_bdt: financials.use_customs_duty && financials.customs_duty_is_auto !== false ? customsDuty.toFixed(2) : financials.customs_duty_bdt,
  };

  const hasFreight = freightForeign > 0 && columns.foreign_price;

  return {
    items: normalizedItems,
    subtotals: {
      foreignUsd: round2(subtotalForeign),
      poUsd: round2(subtotalPo),
      localSupplyBdt: round2(subtotalLocal),
      installationBdt: round2(subtotalInstallation),
    },
    adjustments: {
      freightForeignUsd: round2(freightForeign),
      discountForeignUsd: round2(discountForeign),
      freightPoUsd: round2(freightPo),
      discountPoUsd: round2(discountPo),
      deliveryLocalBdt: round2(deliveryLocal),
      vatLocalBdt: round2(vatLocal),
      aitLocalBdt: round2(aitLocal),
      discountLocalBdt: round2(discountLocal),
      discountInstallationBdt: round2(discountInstallation),
      totalInBdt: round2(totalInBdt),
      customsDutyBdt: round2(customsDuty),
    },
    grandTotals: {
      foreignUsd: grandForeign,
      poUsd: grandPo,
      localSupplyBdt: grandLocal,
      installationBdt: grandInstallation,
      foreignGrandTotalBdt: round2(totalInBdt + customsDuty),
    },
    updatedFinancials,
    labels: {
      subtotalForeign: hasFreight ? "Subtotal, Ex-Works:" : "Subtotal:",
      grandtotalForeign: hasFreight ? "Grand Total, CFR, Chattogram (USD):" : "Grand Total, Ex-Works (USD):",
    },
  };
}
