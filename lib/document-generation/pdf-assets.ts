import { readFile } from "node:fs/promises";
import { PDFDocument, type PDFImage, type PDFPage } from "pdf-lib";
import { resolveStoragePath } from "@/lib/storage/local-storage";

export type PdfAssetMode = "none" | "letterhead-only" | "logo-only" | "both";
export type PdfDocumentType = "offer" | "challan" | "purchase-order";

export type PdfAssetResult = {
  buffer: Buffer;
  applied: {
    assetMode: PdfAssetMode;
    letterhead: boolean;
    logo: boolean;
    signature: boolean;
  };
  warnings: string[];
};

function assetKey(name: string, explicit?: string | null) {
  return explicit || process.env[name] || "";
}

function parseAssetMode(): PdfAssetMode {
  const raw = (process.env.FOS_PDF_ASSET_MODE || "letterhead-only").trim().toLowerCase();
  if (raw === "none" || raw === "letterhead-only" || raw === "logo-only" || raw === "both") return raw;
  return "letterhead-only";
}

function documentLogoKey(documentType?: PdfDocumentType, explicit?: string | null) {
  if (explicit) return explicit;
  if (documentType === "offer" && process.env.FOS_OFFER_LOGO_STORAGE_KEY) return process.env.FOS_OFFER_LOGO_STORAGE_KEY;
  if (documentType === "challan" && process.env.FOS_CHALLAN_LOGO_STORAGE_KEY) return process.env.FOS_CHALLAN_LOGO_STORAGE_KEY;
  if (documentType === "purchase-order" && (process.env.FOS_PURCHASE_ORDER_LOGO_STORAGE_KEY || process.env.FOS_PO_LOGO_STORAGE_KEY)) {
    return process.env.FOS_PURCHASE_ORDER_LOGO_STORAGE_KEY || process.env.FOS_PO_LOGO_STORAGE_KEY || "";
  }
  return process.env.FOS_LOGO_STORAGE_KEY || "";
}

function readNumberEnv(name: string) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

async function readStorageFile(storageKey: string, label: string, warnings: string[]) {
  if (!storageKey) return null;
  try {
    return await readFile(resolveStoragePath(storageKey));
  } catch (error) {
    warnings.push(`${label} asset could not be read: ${error instanceof Error ? error.message : "unknown error"}`);
    return null;
  }
}

async function embedImage(pdf: PDFDocument, bytes: Buffer, storageKey: string, label: string, warnings: string[]) {
  try {
    const lower = storageKey.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return await pdf.embedJpg(bytes);
    if (lower.endsWith(".png")) return await pdf.embedPng(bytes);
    warnings.push(`${label} asset skipped: only PNG/JPG images are supported`);
    return null;
  } catch (error) {
    warnings.push(`${label} asset could not be embedded: ${error instanceof Error ? error.message : "unknown error"}`);
    return null;
  }
}

function drawLogo(page: PDFPage, logo: PDFImage) {
  const { width, height } = page.getSize();
  const maxWidth = readNumberEnv("FOS_LOGO_MAX_WIDTH") ?? 92;
  const maxHeight = readNumberEnv("FOS_LOGO_MAX_HEIGHT") ?? 42;
  const size = fitImage(logo, maxWidth, maxHeight);
  const x = readNumberEnv("FOS_LOGO_X") ?? width - size.width - 42;
  const y = readNumberEnv("FOS_LOGO_Y") ?? height - size.height - 30;
  page.drawImage(logo, { x, y, width: size.width, height: size.height });
}

function drawSignature(page: PDFPage, signature: PDFImage) {
  const { width } = page.getSize();
  const maxWidth = readNumberEnv("FOS_SIGNATURE_MAX_WIDTH") ?? 120;
  const maxHeight = readNumberEnv("FOS_SIGNATURE_MAX_HEIGHT") ?? 55;
  const size = fitImage(signature, maxWidth, maxHeight);
  const x = readNumberEnv("FOS_SIGNATURE_X") ?? width - size.width - 54;
  const y = readNumberEnv("FOS_SIGNATURE_Y") ?? 54;
  page.drawImage(signature, { x, y, width: size.width, height: size.height });
}

async function loadLetterheadPage(pdf: PDFDocument, storageKey: string, label: string, warnings: string[]) {
  const bytes = await readStorageFile(storageKey, label, warnings);
  if (!bytes) return null;
  try {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const [embedded] = await pdf.embedPages([source.getPage(0)]);
    return embedded;
  } catch (error) {
    warnings.push(`${label} asset could not be applied: ${error instanceof Error ? error.message : "unknown error"}`);
    return null;
  }
}

async function applyLetterheads({
  documentPdf,
  firstPageStorageKey,
  continuationStorageKey,
  warnings,
}: {
  documentPdf: PDFDocument;
  firstPageStorageKey: string;
  continuationStorageKey: string;
  warnings: string[];
}) {
  if (!firstPageStorageKey && !continuationStorageKey) return { pdf: documentPdf, applied: false };

  const output = await PDFDocument.create();
  const firstPageLetterhead = firstPageStorageKey ? await loadLetterheadPage(output, firstPageStorageKey, "First-page letterhead", warnings) : null;
  const continuationLetterhead = continuationStorageKey
    ? await loadLetterheadPage(output, continuationStorageKey, "Continuation-page letterhead", warnings)
    : firstPageLetterhead;

  if (!firstPageLetterhead && !continuationLetterhead) return { pdf: documentPdf, applied: false };

  for (const [index, page] of documentPdf.getPages().entries()) {
    const { width, height } = page.getSize();
    const outputPage = output.addPage([width, height]);
    const letterhead = index === 0 ? firstPageLetterhead || continuationLetterhead : continuationLetterhead || firstPageLetterhead;
    if (letterhead) outputPage.drawPage(letterhead, { x: 0, y: 0, width, height });
    const embeddedContent = await output.embedPage(page);
    outputPage.drawPage(embeddedContent, { x: 0, y: 0, width, height });
  }

  return { pdf: output, applied: true };
}

export async function applyBusinessPdfAssets({
  documentPdf,
  includeSignature = false,
  letterheadStorageKey,
  logoStorageKey,
  signatureStorageKey,
  documentType,
}: {
  documentPdf: Buffer;
  includeSignature?: boolean;
  letterheadStorageKey?: string | null;
  logoStorageKey?: string | null;
  signatureStorageKey?: string | null;
  documentType?: PdfDocumentType;
}): Promise<PdfAssetResult> {
  const warnings: string[] = [];
  const assetMode = parseAssetMode();
  const keys = {
    firstPageLetterhead: assetKey("FOS_LETTERHEAD_FIRST_PAGE_STORAGE_KEY", letterheadStorageKey) || assetKey("FOS_LETTERHEAD_STORAGE_KEY"),
    continuationLetterhead: assetKey("FOS_LETTERHEAD_CONTINUATION_STORAGE_KEY") || assetKey("FOS_LETTERHEAD_STORAGE_KEY", letterheadStorageKey),
    logo: documentLogoKey(documentType, logoStorageKey),
    signature: assetKey("FOS_SIGNATURE_STORAGE_KEY", signatureStorageKey),
  };

  let pdf = await PDFDocument.load(documentPdf, { ignoreEncryption: true });
  let letterheadApplied = false;
  let logoApplied = false;
  let signatureApplied = false;

  if (assetMode === "letterhead-only" || assetMode === "both") {
    const result = await applyLetterheads({
      documentPdf: pdf,
      firstPageStorageKey: keys.firstPageLetterhead,
      continuationStorageKey: keys.continuationLetterhead,
      warnings,
    });
    pdf = result.pdf;
    letterheadApplied = result.applied;
  }

  if (assetMode === "logo-only" || assetMode === "both") {
    const logoBytes = await readStorageFile(keys.logo, "Logo", warnings);
    if (logoBytes) {
      const logo = await embedImage(pdf, logoBytes, keys.logo, "Logo", warnings);
      if (logo) {
        for (const page of pdf.getPages()) drawLogo(page, logo);
        logoApplied = true;
      }
    }
  }

  const signatureBytes = includeSignature ? await readStorageFile(keys.signature, "Signature", warnings) : null;
  if (signatureBytes) {
    const signature = await embedImage(pdf, signatureBytes, keys.signature, "Signature", warnings);
    if (signature) {
      const pages = pdf.getPages();
      if (pages.length) drawSignature(pages[pages.length - 1], signature);
      signatureApplied = true;
    }
  }

  return {
    buffer: Buffer.from(await pdf.save()),
    applied: { assetMode, letterhead: letterheadApplied, logo: logoApplied, signature: signatureApplied },
    warnings,
  };
}
