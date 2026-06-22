export type PdfSignatureSourceType = "preparedBy" | "owner" | "exporter" | "global" | "none";

export type PdfSignatureCandidate = {
  type: Exclude<PdfSignatureSourceType, "global" | "none">;
  userId?: string | null;
  storageKey?: string | null;
};

export type PdfSignatureSource = {
  signatureRequested: boolean;
  signatureSourceType: PdfSignatureSourceType;
  signatureSourceUserId: string | null;
  signatureStorageKey: string | null;
};

export function resolvePdfSignatureSource({
  includeSignature,
  candidates,
  globalStorageKey = process.env.FOS_SIGNATURE_STORAGE_KEY || "",
}: {
  includeSignature: boolean;
  candidates: PdfSignatureCandidate[];
  globalStorageKey?: string | null;
}): PdfSignatureSource {
  if (!includeSignature) {
    return {
      signatureRequested: false,
      signatureSourceType: "none",
      signatureSourceUserId: null,
      signatureStorageKey: null,
    };
  }

  for (const candidate of candidates) {
    const storageKey = candidate.storageKey?.trim();
    if (candidate.userId && storageKey) {
      return {
        signatureRequested: true,
        signatureSourceType: candidate.type,
        signatureSourceUserId: candidate.userId,
        signatureStorageKey: storageKey,
      };
    }
  }

  const fallbackKey = globalStorageKey?.trim();
  if (fallbackKey) {
    return {
      signatureRequested: true,
      signatureSourceType: "global",
      signatureSourceUserId: null,
      signatureStorageKey: fallbackKey,
    };
  }

  return {
    signatureRequested: true,
    signatureSourceType: "none",
    signatureSourceUserId: null,
    signatureStorageKey: null,
  };
}

export function pdfSignatureMetadata(source: PdfSignatureSource, signatureApplied: boolean) {
  return {
    signatureRequested: source.signatureRequested,
    signatureApplied,
    signatureSourceType: source.signatureSourceType,
    signatureSourceUserId: source.signatureSourceUserId,
  };
}
