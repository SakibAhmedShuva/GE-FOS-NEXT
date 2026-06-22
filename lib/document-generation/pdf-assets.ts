import { readFile } from "node:fs/promises";
import { PDFDocument, type PDFImage, type PDFPage } from "pdf-lib";
import { resolveStoragePath } from "@/lib/storage/local-storage";

export type PdfAssetResult = {
  buffer: Buffer;
  applied: {
    letterhead: boolean;
    logo: boolean;
    signature: boolean;
  };
  warnings: string[];
};

function assetKey(name: string, explicit?: string | null) {
  return explicit || process.env[name] || "";
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
  const maxWidth = 92;
  const scale = Math.min(maxWidth / logo.width, 42 / logo.height);
  page.drawImage(logo, {
    x: width - logo.width * scale - 42,
    y: height - logo.height * scale - 30,
    width: logo.width * scale,
    height: logo.height * scale,
  });
}

function drawSignature(page: PDFPage, signature: PDFImage) {
  const { width } = page.getSize();
  const maxWidth = 120;
  const scale = Math.min(maxWidth / signature.width, 55 / signature.height);
  page.drawImage(signature, {
    x: width - signature.width * scale - 54,
    y: 54,
    width: signature.width * scale,
    height: signature.height * scale,
  });
}

async function applyLetterhead(documentPdf: PDFDocument, letterheadBytes: Buffer, warnings: string[]) {
  try {
    const letterheadPdf = await PDFDocument.load(letterheadBytes, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const [embeddedLetterhead] = await output.embedPages([letterheadPdf.getPage(0)]);
    for (const page of documentPdf.getPages()) {
      const { width, height } = page.getSize();
      const outputPage = output.addPage([width, height]);
      outputPage.drawPage(embeddedLetterhead, { x: 0, y: 0, width, height });
      const embeddedContent = await output.embedPage(page);
      outputPage.drawPage(embeddedContent, { x: 0, y: 0, width, height });
    }
    return { pdf: output, applied: true };
  } catch (error) {
    warnings.push(`Letterhead asset could not be applied: ${error instanceof Error ? error.message : "unknown error"}`);
    return { pdf: documentPdf, applied: false };
  }
}

export async function applyBusinessPdfAssets({
  documentPdf,
  includeSignature = false,
  letterheadStorageKey,
  logoStorageKey,
  signatureStorageKey,
}: {
  documentPdf: Buffer;
  includeSignature?: boolean;
  letterheadStorageKey?: string | null;
  logoStorageKey?: string | null;
  signatureStorageKey?: string | null;
}): Promise<PdfAssetResult> {
  const warnings: string[] = [];
  const keys = {
    letterhead: assetKey("FOS_LETTERHEAD_STORAGE_KEY", letterheadStorageKey),
    logo: assetKey("FOS_LOGO_STORAGE_KEY", logoStorageKey),
    signature: assetKey("FOS_SIGNATURE_STORAGE_KEY", signatureStorageKey),
  };

  let pdf = await PDFDocument.load(documentPdf, { ignoreEncryption: true });
  const letterheadBytes = await readStorageFile(keys.letterhead, "Letterhead", warnings);
  let letterheadApplied = false;
  if (letterheadBytes) {
    const result = await applyLetterhead(pdf, letterheadBytes, warnings);
    pdf = result.pdf;
    letterheadApplied = result.applied;
  }

  const logoBytes = await readStorageFile(keys.logo, "Logo", warnings);
  let logoApplied = false;
  if (logoBytes) {
    const logo = await embedImage(pdf, logoBytes, keys.logo, "Logo", warnings);
    if (logo) {
      for (const page of pdf.getPages()) drawLogo(page, logo);
      logoApplied = true;
    }
  }

  const signatureBytes = includeSignature ? await readStorageFile(keys.signature, "Signature", warnings) : null;
  let signatureApplied = false;
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
    applied: { letterhead: letterheadApplied, logo: logoApplied, signature: signatureApplied },
    warnings,
  };
}
