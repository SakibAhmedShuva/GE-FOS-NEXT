import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type BusinessPdfColumn<T> = {
  key: keyof T | string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
  group?: string;
  render?: (row: T) => string;
};

export type BusinessPdfSection = {
  title: string;
  lines: string[];
  startOnNewPage?: boolean;
};

export type BusinessPdfOptions<T> = {
  title: string;
  subtitle?: string;
  metadataRows: Array<[string, string]>;
  columns: BusinessPdfColumn<T>[];
  rows: T[];
  summarySections?: BusinessPdfSection[];
  footerNotes?: string[];
  reserveSignatureSpace?: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 30;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const LINE_HEIGHT = 10;
const BODY_FONT_SIZE = 7.2;
const HEADER_FONT_SIZE = 7.2;
const TITLE_FONT_SIZE = 15;

function readNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function layoutConfig(reserveSignatureSpace = false) {
  const signatureY = readNumberEnv("FOS_SIGNATURE_Y", 54);
  const signatureMaxHeight = readNumberEnv("FOS_SIGNATURE_MAX_HEIGHT", 55);
  const signaturePadding = readNumberEnv("FOS_SIGNATURE_SAFE_PADDING", 18);
  const signatureBottom = signatureY + signatureMaxHeight + signaturePadding;
  return {
    titleY: readNumberEnv("FOS_PDF_TITLE_Y", 800),
    subtitleY: readNumberEnv("FOS_PDF_SUBTITLE_Y", 783),
    separatorY: readNumberEnv("FOS_PDF_SEPARATOR_Y", 775),
    topY: readNumberEnv("FOS_PDF_CONTENT_TOP_Y", 760),
    bottomY: reserveSignatureSpace ? Math.max(readNumberEnv("FOS_PDF_BOTTOM_Y", 125), signatureBottom) : readNumberEnv("FOS_PDF_BOTTOM_Y", 82),
  };
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function measure(font: PDFFont, value: string, size: number) {
  return font.widthOfTextAtSize(value, size);
}

function wrapParagraph(font: PDFFont, input: string, maxWidth: number, size = BODY_FONT_SIZE) {
  const text = input.trim();
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measure(font, next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (measure(font, word, size) <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const char of word) {
        const nextChunk = chunk + char;
        if (measure(font, nextChunk, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = nextChunk;
        }
      }
      current = chunk;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function wrapText(font: PDFFont, value: unknown, maxWidth: number, size = BODY_FONT_SIZE) {
  const normalized = normalizeText(value);
  if (!normalized) return [""];
  const output: string[] = [];
  for (const paragraph of normalized.split(/\n/)) output.push(...wrapParagraph(font, paragraph, maxWidth, size));
  return output.length ? output : [""];
}

function drawText(page: PDFPage, font: PDFFont, value: string, x: number, y: number, options: { size?: number; bold?: PDFFont; maxWidth?: number; align?: "left" | "right" | "center" } = {}) {
  const size = options.size ?? BODY_FONT_SIZE;
  const activeFont = options.bold || font;
  let drawX = x;
  if (options.maxWidth && options.align && options.align !== "left") {
    const width = measure(activeFont, value, size);
    if (options.align === "right") drawX = x + options.maxWidth - width;
    if (options.align === "center") drawX = x + (options.maxWidth - width) / 2;
  }
  page.drawText(value, { x: drawX, y, size, font: activeFont, color: rgb(0.07, 0.09, 0.13) });
}

function drawBox(page: PDFPage, x: number, y: number, width: number, height: number, fill = false) {
  page.drawRectangle({ x, y, width, height, borderWidth: 0.4, borderColor: rgb(0.68, 0.72, 0.78), color: fill ? rgb(0.93, 0.95, 0.97) : undefined });
}

function addPage(pdf: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont }, title: string, subtitle: string | undefined, config: ReturnType<typeof layoutConfig>) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawText(page, fonts.regular, title, MARGIN_X, config.titleY, { size: TITLE_FONT_SIZE, bold: fonts.bold });
  if (subtitle) drawText(page, fonts.regular, subtitle, MARGIN_X, config.subtitleY, { size: 9 });
  page.drawLine({ start: { x: MARGIN_X, y: config.separatorY }, end: { x: PAGE_WIDTH - MARGIN_X, y: config.separatorY }, thickness: 0.6, color: rgb(0.63, 0.68, 0.74) });
  return page;
}

function drawPageNumber(page: PDFPage, font: PDFFont, index: number, count: number) {
  drawText(page, font, `Page ${index} of ${count}`, PAGE_WIDTH - 95, 34, { size: 8 });
}

function drawMetadata(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, rows: Array<[string, string]>, startY: number) {
  let y = startY;
  for (const [label, value] of rows) {
    drawText(page, fonts.regular, `${label}:`, MARGIN_X, y, { size: 8.5, bold: fonts.bold });
    const lines = wrapText(fonts.regular, value, PAGE_WIDTH - MARGIN_X * 2 - 100, 8.5);
    lines.forEach((line, index) => drawText(page, fonts.regular, line, MARGIN_X + 95, y - index * 11, { size: 8.5 }));
    y -= Math.max(1, lines.length) * 11;
  }
  return y - 8;
}

function drawWrappedCellText(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, value: string, x: number, y: number, width: number, height: number, options: { align?: "left" | "right" | "center"; bold?: boolean; size?: number } = {}) {
  const size = options.size ?? HEADER_FONT_SIZE;
  const font = options.bold ? fonts.bold : fonts.regular;
  const lines = wrapText(font, value, width - 6, size);
  const blockHeight = lines.length * (size + 1.8);
  let textY = y - (height - blockHeight) / 2 - size;
  for (const line of lines) {
    drawText(page, fonts.regular, line, x + 3, textY, { size, bold: options.bold ? fonts.bold : undefined, maxWidth: width - 6, align: options.align || "center" });
    textY -= size + 1.8;
  }
}

function drawTableHeader<T>(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, columns: BusinessPdfColumn<T>[], x: number, y: number) {
  const hasGroups = columns.some((column) => column.group);
  if (!hasGroups) {
    const headerLinesByColumn = columns.map((column) => wrapText(fonts.bold, column.label, column.width - 6, HEADER_FONT_SIZE));
    const headerHeight = Math.max(18, Math.max(...headerLinesByColumn.map((lines) => lines.length)) * 9 + 7);
    let cursorX = x;
    columns.forEach((column, index) => {
      drawBox(page, cursorX, y - headerHeight, column.width, headerHeight, true);
      const lines = headerLinesByColumn[index];
      const blockHeight = lines.length * 9;
      let textY = y - (headerHeight - blockHeight) / 2 - 7;
      for (const line of lines) {
        drawText(page, fonts.regular, line, cursorX + 3, textY, { size: HEADER_FONT_SIZE, bold: fonts.bold, maxWidth: column.width - 6, align: column.align || "center" });
        textY -= 9;
      }
      cursorX += column.width;
    });
    return y - headerHeight;
  }

  const headerHeight = 30;
  const groupHeight = 14;
  const subHeight = headerHeight - groupHeight;
  let cursorX = x;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column.group) {
      drawBox(page, cursorX, y - headerHeight, column.width, headerHeight, true);
      drawWrappedCellText(page, fonts, column.label, cursorX, y, column.width, headerHeight, { bold: true, align: column.align || "center" });
      cursorX += column.width;
      continue;
    }
    const startIndex = index;
    const group = column.group;
    while (index + 1 < columns.length && columns[index + 1].group === group) index += 1;
    const grouped = columns.slice(startIndex, index + 1);
    const groupWidth = grouped.reduce((sum, item) => sum + item.width, 0);
    drawBox(page, cursorX, y - groupHeight, groupWidth, groupHeight, true);
    drawWrappedCellText(page, fonts, group || "", cursorX, y, groupWidth, groupHeight, { bold: true, align: "center" });
    let subX = cursorX;
    for (const subColumn of grouped) {
      drawBox(page, subX, y - headerHeight, subColumn.width, subHeight, true);
      drawWrappedCellText(page, fonts, subColumn.label, subX, y - groupHeight, subColumn.width, subHeight, { bold: true, align: subColumn.align || "center" });
      subX += subColumn.width;
    }
    cursorX += groupWidth;
  }
  return y - headerHeight;
}

function rowHeight<T>(fonts: { regular: PDFFont }, row: T, columns: BusinessPdfColumn<T>[]) {
  let lines = 1;
  for (const column of columns) {
    const value = column.render ? column.render(row) : String((row as Record<string, unknown>)[String(column.key)] ?? "");
    lines = Math.max(lines, wrapText(fonts.regular, value, column.width - 6).length);
  }
  return Math.max(18, lines * LINE_HEIGHT + 8);
}

function drawRow<T>(page: PDFPage, fonts: { regular: PDFFont }, row: T, columns: BusinessPdfColumn<T>[], x: number, y: number, height: number) {
  let cursorX = x;
  for (const column of columns) {
    drawBox(page, cursorX, y - height, column.width, height);
    const value = column.render ? column.render(row) : String((row as Record<string, unknown>)[String(column.key)] ?? "");
    const lines = wrapText(fonts.regular, value, column.width - 6);
    lines.forEach((line, index) => drawText(page, fonts.regular, line, cursorX + 3, y - 12 - index * LINE_HEIGHT, { size: BODY_FONT_SIZE, maxWidth: column.width - 6, align: column.align || "left" }));
    cursorX += column.width;
  }
  return y - height;
}

function drawSection(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, section: BusinessPdfSection, startY: number) {
  let y = startY;
  drawText(page, fonts.regular, section.title, MARGIN_X, y, { size: 10, bold: fonts.bold });
  y -= 13;
  for (const line of section.lines) {
    const wrapped = wrapText(fonts.regular, line, PAGE_WIDTH - MARGIN_X * 2, 8);
    for (const part of wrapped) {
      drawText(page, fonts.regular, part, MARGIN_X, y, { size: 8 });
      y -= 11;
    }
  }
  return y - 8;
}

export function fitColumns<T>(columns: BusinessPdfColumn<T>[]) {
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  if (!total || Math.abs(total - TABLE_WIDTH) < 0.5) return columns;
  const scale = TABLE_WIDTH / total;
  const scaled = columns.map((column) => ({ ...column, width: Math.floor(column.width * scale) }));
  const diff = TABLE_WIDTH - scaled.reduce((sum, column) => sum + column.width, 0);
  if (scaled.length) scaled[scaled.length - 1].width += diff;
  return scaled;
}

export async function buildBusinessPdfBuffer<T>(options: BusinessPdfOptions<T>) {
  const config = layoutConfig(options.reserveSignatureSpace);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const pages: PDFPage[] = [];
  const columns = fitColumns(options.columns);

  let page = addPage(pdf, fonts, options.title, options.subtitle, config);
  pages.push(page);
  let y = drawMetadata(page, fonts, options.metadataRows, config.topY);
  y = drawTableHeader(page, fonts, columns, MARGIN_X, y);

  for (const row of options.rows) {
    const height = rowHeight(fonts, row, columns);
    if (y - height < config.bottomY) {
      page = addPage(pdf, fonts, options.title, options.subtitle, config);
      pages.push(page);
      y = drawTableHeader(page, fonts, columns, MARGIN_X, config.topY);
    }
    y = drawRow(page, fonts, row, columns, MARGIN_X, y, height);
  }

  const sections = options.summarySections || [];
  for (const section of sections) {
    const estimated = 28 + section.lines.reduce((count, line) => count + Math.max(1, String(line).split(/\r?\n/).length), 0) * 13;
    if (section.startOnNewPage || y - estimated < config.bottomY) {
      page = addPage(pdf, fonts, options.title, options.subtitle, config);
      pages.push(page);
      y = config.topY;
    }
    y = drawSection(page, fonts, section, y - 18);
  }

  const notes = options.footerNotes || [];
  if (notes.length) {
    if (y - notes.length * 12 < config.bottomY) {
      page = addPage(pdf, fonts, options.title, options.subtitle, config);
      pages.push(page);
      y = config.topY;
    }
    y = drawSection(page, fonts, { title: "Notes", lines: notes }, y - 18);
  }

  pages.forEach((pdfPage, index) => drawPageNumber(pdfPage, regular, index + 1, pages.length));
  return Buffer.from(await pdf.save());
}
