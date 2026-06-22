import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { resolveStoragePath } from "@/lib/storage/local-storage";

export async function prependCoverPdf({ coverStorageKey, documentPdf }: { coverStorageKey?: string | null; documentPdf: Buffer }) {
  if (!coverStorageKey) return { buffer: documentPdf, merged: false, reason: "no_cover" };
  try {
    const coverBytes = await readFile(resolveStoragePath(coverStorageKey));
    const coverPdf = await PDFDocument.load(coverBytes, { ignoreEncryption: true });
    const bodyPdf = await PDFDocument.load(documentPdf, { ignoreEncryption: true });
    const mergedPdf = await PDFDocument.create();
    const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
    coverPages.forEach((page) => mergedPdf.addPage(page));
    const bodyPages = await mergedPdf.copyPages(bodyPdf, bodyPdf.getPageIndices());
    bodyPages.forEach((page) => mergedPdf.addPage(page));
    const mergedBytes = await mergedPdf.save();
    return { buffer: Buffer.from(mergedBytes), merged: true, reason: null };
  } catch (error) {
    return { buffer: documentPdf, merged: false, reason: error instanceof Error ? error.message : "cover_merge_failed" };
  }
}
