import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_STORAGE_ROOT = "./storage";

export function getStorageRoot() {
  return process.env.FOS_STORAGE_ROOT || DEFAULT_STORAGE_ROOT;
}

export function resolveStoragePath(storageKey: string) {
  const root = path.resolve(getStorageRoot());
  const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const fullPath = path.resolve(root, normalizedKey);
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage path");
  }
  return fullPath;
}

export function safeOriginalFilename(filename: string) {
  return filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim() || "upload.bin";
}

export async function saveUploadToLocalStorage({ folder, filename, bytes }: { folder: string; filename: string; bytes: Buffer }) {
  const cleanName = safeOriginalFilename(filename);
  const extension = path.extname(cleanName).toLowerCase();
  const storageKey = `${folder}/${randomUUID()}${extension || ".bin"}`;
  const fullPath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
  return { storageKey, originalFilename: cleanName, fullPath };
}

export async function saveGeneratedFileToLocalStorage({ folder, filename, bytes }: { folder: string; filename: string; bytes: Buffer }) {
  const cleanName = safeOriginalFilename(filename);
  const extension = path.extname(cleanName).toLowerCase();
  const storageKey = `${folder}/${randomUUID()}${extension || ".bin"}`;
  const fullPath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
  return { storageKey, originalFilename: cleanName, fullPath };
}
