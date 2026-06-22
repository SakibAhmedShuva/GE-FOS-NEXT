"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SourceType = "FOREIGN" | "LOCAL" | "CUSTOM";
type ProjectStatus = "PENDING" | "DELIVERED" | "ARCHIVED";
type VisibleColumns = {
  foreign_price: boolean;
  po_price: boolean;
  local_supply_price: boolean;
  installation_price: boolean;
};

type OfferRow = {
  descriptionPlain: string;
  descriptionHtml?: string | null;
  qty: string;
  unit: string;
  foreignPriceUsd: string;
  poPriceUsd: string;
  localSupplyPriceBdt: string;
  installationPriceBdt: string;
  productType: string;
  itemCode?: string | null;
  make?: string | null;
  model?: string | null;
  approvals?: string | null;
  sourceType?: SourceType;
  catalogItemId?: string | null;
};

type CalculationResult = {
  subtotals: Record<string, number>;
  adjustments: Record<string, number>;
  grandTotals: Record<string, number>;
  labels: Record<string, string>;
};

type OfferProjectDto = {
  id: string;
  referenceNumber: string;
  status: ProjectStatus;
  clientSnapshot?: Record<string, unknown> | null;
  items: Array<{
    sourceType: SourceType;
    catalogItemId?: string | null;
    itemCode?: string | null;
    productType?: string | null;
    make?: string | null;
    model?: string | null;
    approvals?: string | null;
    descriptionHtml?: string | null;
    descriptionPlain?: string | null;
    qty?: string | null;
    unit?: string | null;
    foreignPriceUsd?: string | null;
    poPriceUsd?: string | null;
    localSupplyPriceBdt?: string | null;
    installationPriceBdt?: string | null;
  }>;
  offerSetting?: {
    financials?: Record<string, unknown> | null;
    visibleColumns?: Partial<VisibleColumns> | null;
    includeSignature?: boolean;
    tncState?: Record<string, unknown> | null;
    selectedCoverId?: string | null;
    isSummaryPageEnabled?: boolean;
    summaryScopeDescriptions?: Record<string, unknown> | null;
    financialLabels?: Record<string, unknown> | null;
  } | null;
};

type CatalogItem = {
  id: string;
  sourceType: SourceType;
  productType?: string | null;
  itemCode?: string | null;
  make?: string | null;
  approvals?: string | null;
  model?: string | null;
  descriptionHtml?: string | null;
  descriptionPlain: string;
  poPrice?: string | number | null;
  offerPrice?: string | number | null;
  installationPrice?: string | number | null;
  unit?: string | null;
};

type ClientResult = {
  id: string;
  clientName: string;
  clientAddress?: string | null;
};

type CoverResult = {
  id: string;
  filename: string;
  projectReference?: string | null;
  thumbnailStorageKey?: string | null;
};

type FilterOptions = {
  productTypes: string[];
  makes: string[];
  approvals: string[];
  models: string[];
};

const emptyRow = (): OfferRow => ({
  descriptionPlain: "",
  qty: "1",
  unit: "Pcs",
  foreignPriceUsd: "0",
  poPriceUsd: "0",
  localSupplyPriceBdt: "0",
  installationPriceBdt: "0",
  productType: "Custom",
  sourceType: "CUSTOM",
});

function textFromJson(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function numberText(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function sourceParam(value: string) {
  if (value === "FOREIGN") return "foreign";
  if (value === "LOCAL") return "local";
  return "all";
}

function moneyText(value: unknown) {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function visibleFromRows(rows: OfferRow[]): VisibleColumns {
  return {
    foreign_price: rows.some((row) => Number(row.foreignPriceUsd) > 0),
    po_price: rows.some((row) => Number(row.poPriceUsd) > 0),
    local_supply_price: rows.some((row) => Number(row.localSupplyPriceBdt) > 0),
    installation_price: rows.some((row) => Number(row.installationPriceBdt) > 0),
  };
}

function initialRows(project?: OfferProjectDto | null): OfferRow[] {
  if (!project?.items?.length) {
    return [emptyRow()];
  }

  return project.items.map((item) => ({
    descriptionPlain: item.descriptionPlain || item.descriptionHtml || "",
    descriptionHtml: item.descriptionHtml,
    qty: numberText(item.qty, "1"),
    unit: item.unit || "Pcs",
    foreignPriceUsd: numberText(item.foreignPriceUsd),
    poPriceUsd: numberText(item.poPriceUsd),
    localSupplyPriceBdt: numberText(item.localSupplyPriceBdt),
    installationPriceBdt: numberText(item.installationPriceBdt),
    productType: item.productType || "Custom",
    itemCode: item.itemCode,
    make: item.make,
    model: item.model,
    approvals: item.approvals,
    sourceType: item.sourceType || "CUSTOM",
    catalogItemId: item.catalogItemId,
  }));
}

function initialVisibleColumns(project: OfferProjectDto | null | undefined, rows: OfferRow[]): VisibleColumns {
  return {
    ...visibleFromRows(rows),
    ...(project?.offerSetting?.visibleColumns ?? {}),
  };
}

export default function OfferCalculatorClient({ initialProject = null }: { initialProject?: OfferProjectDto | null }) {
  const router = useRouter();
  const initialOfferRows = useMemo(() => initialRows(initialProject), [initialProject]);
  const initialFinancials = (initialProject?.offerSetting?.financials ?? {}) as Record<string, unknown>;
  const initialTnc = (initialProject?.offerSetting?.tncState ?? {}) as Record<string, unknown>;
  const clientSnapshot = (initialProject?.clientSnapshot ?? {}) as Record<string, unknown>;
  const isEditing = Boolean(initialProject?.id);

  const [projectId, setProjectId] = useState(initialProject?.id || null);
  const [referenceNumber, setReferenceNumber] = useState(
    initialProject?.referenceNumber || `FO_DRAFT_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
  );
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status || "PENDING");
  const [clientName, setClientName] = useState(textFromJson(clientSnapshot.name ?? clientSnapshot.client_name));
  const [clientAddress, setClientAddress] = useState(textFromJson(clientSnapshot.address ?? clientSnapshot.client_address));
  const [clientQuery, setClientQuery] = useState(textFromJson(clientSnapshot.name ?? clientSnapshot.client_name));
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [rows, setRows] = useState<OfferRow[]>(initialOfferRows);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => initialVisibleColumns(initialProject, initialOfferRows));
  const [freight, setFreight] = useState(numberText(initialFinancials.freight_foreign_usd));
  const [discountForeign, setDiscountForeign] = useState(numberText(initialFinancials.discount_foreign_usd));
  const [useTotalBdt, setUseTotalBdt] = useState(Boolean(initialFinancials.use_total_in_bdt ?? true));
  const [useCustoms, setUseCustoms] = useState(Boolean(initialFinancials.use_customs_duty ?? false));
  const [includeSignature, setIncludeSignature] = useState(Boolean(initialProject?.offerSetting?.includeSignature ?? true));
  const [tncInternational, setTncInternational] = useState(Boolean(initialTnc.international ?? visibleColumns.foreign_price));
  const [tncLocalSupply, setTncLocalSupply] = useState(Boolean(initialTnc.local_supply ?? visibleColumns.local_supply_price));
  const [tncLocalInstallation, setTncLocalInstallation] = useState(Boolean(initialTnc.local_installation ?? visibleColumns.installation_price));
  const [tncText, setTncText] = useState(textFromJson(initialTnc.value));
  const [selectedCoverId, setSelectedCoverId] = useState(initialProject?.offerSetting?.selectedCoverId || "");

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogSource, setCatalogSource] = useState<"all" | "FOREIGN" | "LOCAL">("all");
  const [catalogProductType, setCatalogProductType] = useState("");
  const [catalogMake, setCatalogMake] = useState("");
  const [catalogApprovals, setCatalogApprovals] = useState("");
  const [catalogModel, setCatalogModel] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ productTypes: [], makes: [], approvals: [], models: [] });
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [coverQuery, setCoverQuery] = useState("");
  const [coverResults, setCoverResults] = useState<CoverResult[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog/filter-options")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Failed to load catalog filters");
        return body as FilterOptions;
      })
      .then((body) => active && setFilterOptions(body))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const rowTotals = useMemo(() => ({
    count: rows.length,
    foreignRows: rows.filter((row) => Number(row.foreignPriceUsd) > 0).length,
    localRows: rows.filter((row) => Number(row.localSupplyPriceBdt) > 0).length,
    installationRows: rows.filter((row) => Number(row.installationPriceBdt) > 0).length,
  }), [rows]);

  function updateRow(index: number, key: keyof OfferRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  function toggleColumn(key: keyof VisibleColumns) {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  }

  function applyAutoColumns() {
    setVisibleColumns(visibleFromRows(rows));
  }

  function payload() {
    return {
      referenceNumber,
      status,
      clientSnapshot: { name: clientName, address: clientAddress },
      visibleColumns,
      includeSignature,
      financials: {
        use_freight: Number(freight) > 0,
        freight_foreign_usd: freight,
        use_discount_foreign: Number(discountForeign) > 0,
        discount_foreign_usd: discountForeign,
        use_total_in_bdt: useTotalBdt,
        total_in_bdt_is_auto: true,
        use_customs_duty: useCustoms,
        customs_duty_is_auto: true,
        vat_is_percentage: true,
        ait_is_percentage: true,
        vat_percentage: 7.5,
        ait_percentage: 5,
      },
      financialLabels: initialProject?.offerSetting?.financialLabels ?? {},
      isSummaryPageEnabled: initialProject?.offerSetting?.isSummaryPageEnabled ?? false,
      summaryScopeDescriptions: initialProject?.offerSetting?.summaryScopeDescriptions ?? {},
      selectedCoverId: selectedCoverId || null,
      tncState: {
        international: tncInternational,
        local_supply: tncLocalSupply,
        local_installation: tncLocalInstallation,
        value: tncText,
      },
      items: rows.map((row) => ({
        sourceType: row.sourceType || "CUSTOM",
        catalogItemId: row.catalogItemId || null,
        isCustom: !row.catalogItemId,
        itemCode: row.itemCode || null,
        productType: row.productType,
        make: row.make || null,
        model: row.model || null,
        approvals: row.approvals || null,
        descriptionPlain: row.descriptionPlain,
        descriptionHtml: row.descriptionHtml || row.descriptionPlain,
        qty: row.qty,
        unit: row.unit,
        foreignPriceUsd: row.foreignPriceUsd,
        poPriceUsd: row.poPriceUsd,
        localSupplyPriceBdt: row.localSupplyPriceBdt,
        installationPriceBdt: row.installationPriceBdt,
      })),
    };
  }

  async function searchClients(event?: FormEvent) {
    event?.preventDefault();
    setClientLoading(true);
    setClientError(null);
    const params = new URLSearchParams({ q: clientQuery, limit: "25" });

    try {
      const response = await fetch(`/api/clients/search?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client search failed");
      setClientResults(body.clients || []);
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Client search failed");
    } finally {
      setClientLoading(false);
    }
  }

  function selectClient(client: ClientResult) {
    setClientName(client.clientName);
    setClientAddress(client.clientAddress || "");
    setClientQuery(client.clientName);
    setSuccess(`Selected client ${client.clientName}`);
  }

  async function calculate(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setSuccess(null);
    const bodyPayload = payload();
    const response = await fetch("/api/offer/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: bodyPayload.items.map((item) => ({
          qty: item.qty,
          foreign_price_usd: item.foreignPriceUsd,
          po_price_usd: item.poPriceUsd,
          local_supply_price_bdt: item.localSupplyPriceBdt,
          installation_price_bdt: item.installationPriceBdt,
        })),
        visibleColumns: bodyPayload.visibleColumns,
        financials: bodyPayload.financials,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Calculation failed");
      return null;
    }
    setResult(body);
    return body;
  }

  async function saveOffer() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await calculate();
      const response = await fetch(projectId ? `/api/offers/${projectId}` : "/api/offers", {
        method: projectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Offer save failed");
        return;
      }
      setProjectId(body.project.id);
      setSuccess(`Saved offer ${body.project.referenceNumber}`);
      if (!projectId && body.project.id) {
        router.replace(`/offer/${body.project.id}`);
      }
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function exportOfferXlsx() {
    await exportOfferDocument("xlsx");
  }

  async function exportOfferPdf() {
    await exportOfferDocument("pdf");
  }

  async function exportOfferDocument(kind: "xlsx" | "pdf") {
    if (!projectId) {
      setError(`Save the offer before exporting ${kind.toUpperCase()}`);
      return;
    }
    setError(null);
    setSuccess(null);
    if (kind === "xlsx") setIsExportingXlsx(true);
    if (kind === "pdf") setIsExportingPdf(true);
    try {
      const response = await fetch(`/api/exports/offer/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${kind.toUpperCase()} export failed`);
      const warnings = Array.isArray(body.warnings) && body.warnings.length ? ` Warning: ${body.warnings.join(" ")}` : "";
      setSuccess(`Generated ${kind.toUpperCase()} ${body.export.filename}.${warnings}`);
      window.open(body.downloadUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : `${kind.toUpperCase()} export failed`);
    } finally {
      if (kind === "xlsx") setIsExportingXlsx(false);
      if (kind === "pdf") setIsExportingPdf(false);
    }
  }

  async function searchCatalog(event?: FormEvent) {
    event?.preventDefault();
    setCatalogLoading(true);
    setCatalogError(null);
    const params = new URLSearchParams({ q: catalogQuery, limit: "25" });
    const source = sourceParam(catalogSource);
    if (source !== "all") params.set("source", source);
    if (catalogProductType) params.set("productType", catalogProductType);
    if (catalogMake) params.set("make", catalogMake);
    if (catalogApprovals) params.set("approvals", catalogApprovals);
    if (catalogModel) params.set("model", catalogModel);

    try {
      const response = await fetch(`/api/catalog/search?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Catalog search failed");
      setCatalogItems(body.items || []);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Catalog search failed");
    } finally {
      setCatalogLoading(false);
    }
  }

  function addCatalogItem(item: CatalogItem) {
    const isForeign = item.sourceType === "FOREIGN";
    const row: OfferRow = {
      sourceType: item.sourceType,
      catalogItemId: item.id,
      itemCode: item.itemCode,
      productType: item.productType || "Catalog",
      make: item.make,
      model: item.model,
      approvals: item.approvals,
      descriptionPlain: item.descriptionPlain || item.descriptionHtml || "",
      descriptionHtml: item.descriptionHtml || item.descriptionPlain,
      qty: "1",
      unit: item.unit || "Pcs",
      foreignPriceUsd: isForeign ? moneyText(item.offerPrice) : "0",
      poPriceUsd: isForeign ? moneyText(item.poPrice) : "0",
      localSupplyPriceBdt: isForeign ? "0" : moneyText(item.offerPrice),
      installationPriceBdt: moneyText(item.installationPrice),
    };
    setRows((current) => [...current, row]);
    setVisibleColumns((current) => ({
      ...current,
      foreign_price: current.foreign_price || Number(row.foreignPriceUsd) > 0,
      po_price: current.po_price || Number(row.poPriceUsd) > 0,
      local_supply_price: current.local_supply_price || Number(row.localSupplyPriceBdt) > 0,
      installation_price: current.installation_price || Number(row.installationPriceBdt) > 0,
    }));
    setSuccess(`Added ${item.itemCode || item.productType || "catalog item"} to offer.`);
  }

  async function searchCovers(event?: FormEvent) {
    event?.preventDefault();
    setCoverLoading(true);
    setCoverError(null);
    const params = new URLSearchParams({ q: coverQuery, limit: "30" });

    try {
      const response = await fetch(`/api/covers?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Cover search failed");
      setCoverResults(body.covers || []);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Cover search failed");
    } finally {
      setCoverLoading(false);
    }
  }

  async function uploadCover(event?: FormEvent) {
    event?.preventDefault();
    if (!coverFile) {
      setCoverError("Select a PDF cover first");
      return;
    }
    setCoverUploading(true);
    setCoverError(null);
    const formData = new FormData();
    formData.set("file", coverFile);
    formData.set("projectReference", referenceNumber);

    try {
      const response = await fetch("/api/covers/upload", { method: "POST", body: formData });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Cover upload failed");
      setCoverResults((current) => [body.cover, ...current]);
      setSelectedCoverId(body.cover.id);
      setCoverFile(null);
      setSuccess(`Uploaded and selected cover ${body.cover.filename}`);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Offer builder foundation</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">{isEditing ? "Edit Offer Draft" : "Create Offer Draft"}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          This now has a real save/load loop, client selection, catalog picker, offer settings, and cover/T&C foundations before export parity work starts.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Client selector</h2>
            <p className="mt-1 text-sm text-slate-500">Search the imported client list and save the selected client snapshot into the offer.</p>
            <form onSubmit={searchClients} className="mt-4 flex gap-2">
              <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search client name or address" className="min-w-0 flex-1 rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
              <button disabled={clientLoading} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">{clientLoading ? "Searching..." : "Search"}</button>
            </form>
            {clientError && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{clientError}</p>}
            <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-slate-200">
              {clientResults.map((client) => (
                <button key={client.id} type="button" onClick={() => selectClient(client)} className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="block font-semibold text-slate-900">{client.clientName}</span>
                  <span className="mt-1 block text-xs text-slate-500">{client.clientAddress || "No address"}</span>
                </button>
              ))}
              {!clientResults.length && <p className="px-4 py-8 text-center text-sm text-slate-500">Search to pick an existing client, or type manually below.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Selected client snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">These values are stored in the project so old offers do not change if the client master later changes.</p>
            <div className="mt-4 grid gap-3">
              <label className="block text-sm font-semibold text-slate-700">Client name
                <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Client address
                <textarea value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Catalog picker</h2>
            <p className="mt-1 text-sm text-slate-500">Search imported foreign/local items, including negative keywords like <code>-pump</code>, and add selected rows directly into this offer.</p>
          </div>
        </div>
        <form onSubmit={searchCatalog} className="mt-4 grid gap-2 lg:grid-cols-[1fr_140px_180px_160px_160px_160px_auto]">
          <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search code, description, make, model..." className="rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
          <select value={catalogSource} onChange={(event) => setCatalogSource(event.target.value as "all" | "FOREIGN" | "LOCAL")} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="all">All</option>
            <option value="FOREIGN">Foreign</option>
            <option value="LOCAL">Local</option>
          </select>
          <select value={catalogProductType} onChange={(event) => setCatalogProductType(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="">All product types</option>
            {filterOptions.productTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={catalogMake} onChange={(event) => setCatalogMake(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="">All makes</option>
            {filterOptions.makes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={catalogApprovals} onChange={(event) => setCatalogApprovals(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="">All approvals</option>
            {filterOptions.approvals.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={catalogModel} onChange={(event) => setCatalogModel(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="">All models</option>
            {filterOptions.models.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button disabled={catalogLoading} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">{catalogLoading ? "Searching..." : "Search"}</button>
        </form>

        {catalogError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{catalogError}</p>}

        <div className="mt-5 max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1080px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3">Source</th><th className="px-3 py-3">Code</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">Make</th><th className="px-3 py-3">Model</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Offer</th><th className="px-3 py-3">PO</th><th className="px-3 py-3">Install</th><th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {catalogItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-slate-600">{item.sourceType}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.itemCode || "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{item.productType || "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{item.make || "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{item.model || "—"}</td>
                  <td className="max-w-xl px-3 py-3 text-slate-600">{item.descriptionPlain}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{item.offerPrice ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{item.poPrice ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{item.installationPrice ?? "—"}</td>
                  <td className="px-3 py-3 text-right"><button type="button" onClick={() => addCatalogItem(item)} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">Add</button></td>
                </tr>
              ))}
              {!catalogItems.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Search the imported catalog, then add items into the offer table.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={calculate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">Reference
            <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Status
            <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm">
              <option value="PENDING">Pending</option><option value="DELIVERED">Delivered</option><option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <InfoPill label="Rows" value={String(rowTotals.count)} />
          <InfoPill label="Foreign / local / install" value={`${rowTotals.foreignRows} / ${rowTotals.localRows} / ${rowTotals.installationRows}`} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1120px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3">Description</th><th className="px-3 py-3">Code</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3">Foreign USD</th><th className="px-3 py-3">PO USD</th><th className="px-3 py-3">Local BDT</th><th className="px-3 py-3">Install BDT</th><th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2"><textarea value={row.descriptionPlain} onChange={(event) => updateRow(index, "descriptionPlain", event.target.value)} className="min-h-20 w-80 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-600">{row.itemCode || (row.catalogItemId ? "Catalog" : "Custom")}</td>
                  <td className="px-3 py-2"><input value={row.productType} onChange={(event) => updateRow(index, "productType", event.target.value)} className="w-32 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.qty} onChange={(event) => updateRow(index, "qty", event.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.foreignPriceUsd} onChange={(event) => updateRow(index, "foreignPriceUsd", event.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.poPriceUsd} onChange={(event) => updateRow(index, "poPriceUsd", event.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.localSupplyPriceBdt} onChange={(event) => updateRow(index, "localSupplyPriceBdt", event.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><input value={row.installationPriceBdt} onChange={(event) => updateRow(index, "installationPriceBdt", event.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2 text-sm" /></td>
                  <td className="px-3 py-2"><button type="button" onClick={() => removeRow(index)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={() => setRows((current) => [...current, emptyRow()])} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Add custom item</button>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <label className="block text-sm font-semibold text-slate-700">Freight USD
            <input value={freight} onChange={(event) => setFreight(event.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Discount USD
            <input value={discountForeign} onChange={(event) => setDiscountForeign(event.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <div className="space-y-2 text-sm font-semibold text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={useTotalBdt} onChange={(event) => setUseTotalBdt(event.target.checked)} /> Auto total BDT</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={useCustoms} onChange={(event) => setUseCustoms(event.target.checked)} /> Auto customs</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={includeSignature} onChange={(event) => setIncludeSignature(event.target.checked)} /> Include signature</label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">Calculate</button>
            <button type="button" onClick={saveOffer} disabled={isSaving} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : projectId ? "Update" : "Save"}</button>
            <button type="button" onClick={exportOfferXlsx} disabled={!projectId || isExportingXlsx} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{isExportingXlsx ? "Exporting..." : "Export XLSX"}</button>
            <button type="button" onClick={exportOfferPdf} disabled={!projectId || isExportingPdf} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">{isExportingPdf ? "Exporting..." : "Export PDF"}</button>
          </div>
        </div>
      </form>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Visible columns</h2>
          <p className="mt-1 text-sm text-slate-500">Saved to offer settings and used by later PDF/XLSX export.</p>
          <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={visibleColumns.foreign_price} onChange={() => toggleColumn("foreign_price")} /> Foreign price</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={visibleColumns.po_price} onChange={() => toggleColumn("po_price")} /> PO price</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={visibleColumns.local_supply_price} onChange={() => toggleColumn("local_supply_price")} /> Local supply</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={visibleColumns.installation_price} onChange={() => toggleColumn("installation_price")} /> Installation</label>
          </div>
          <button type="button" onClick={applyAutoColumns} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Auto from rows</button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">T&C state</h2>
          <p className="mt-1 text-sm text-slate-500">Preserved now as project settings; full template rendering comes in export stage.</p>
          <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={tncInternational} onChange={(event) => setTncInternational(event.target.checked)} /> International supply terms</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tncLocalSupply} onChange={(event) => setTncLocalSupply(event.target.checked)} /> Local supply terms</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tncLocalInstallation} onChange={(event) => setTncLocalInstallation(event.target.checked)} /> Installation terms</label>
          </div>
          <textarea value={tncText} onChange={(event) => setTncText(event.target.value)} placeholder="Custom T&C note/state" className="mt-4 min-h-24 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Cover selection</h2>
          <p className="mt-1 text-sm text-slate-500">Search migrated cover PDFs and save selected cover ID into offer settings.</p>
          <form onSubmit={searchCovers} className="mt-4 flex gap-2">
            <input value={coverQuery} onChange={(event) => setCoverQuery(event.target.value)} placeholder="Cover filename/ref" className="min-w-0 flex-1 rounded-xl border-slate-300 px-3 py-2.5 text-sm" />
            <button disabled={coverLoading} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">{coverLoading ? "..." : "Search"}</button>
          </form>
          <form onSubmit={uploadCover} className="mt-3 grid gap-2">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
            <button disabled={coverUploading || !coverFile} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              {coverUploading ? "Uploading..." : "Upload PDF cover"}
            </button>
          </form>
          {coverError && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{coverError}</p>}
          <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-slate-200">
            {coverResults.map((cover) => (
              <label key={cover.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50">
                <input type="radio" checked={selectedCoverId === cover.id} onChange={() => setSelectedCoverId(cover.id)} className="mt-1" />
                <span><span className="block font-semibold text-slate-900">{cover.filename}</span><span className="text-xs text-slate-500">{cover.projectReference || "General cover"}</span></span>
              </label>
            ))}
            {!coverResults.length && <p className="px-4 py-8 text-center text-sm text-slate-500">Search covers or leave blank.</p>}
          </div>
          {selectedCoverId && <button type="button" onClick={() => setSelectedCoverId("")} className="mt-3 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Clear selected cover</button>}
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">{success}</p>}

      {result && (
        <div className="grid gap-4 md:grid-cols-3">
          <ResultCard title="Subtotals" data={result.subtotals} />
          <ResultCard title="Adjustments" data={result.adjustments} />
          <ResultCard title="Grand totals" data={result.grandTotals} />
        </div>
      )}
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ResultCard({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-slate-500">{key}</dt>
            <dd className="font-semibold text-slate-900">{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
