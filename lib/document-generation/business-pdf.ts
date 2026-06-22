import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type BusinessPdfColumn<T> = {
  key: keyof T | string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
  render?: (row: T) => string;
};

export type BusinessPdfSection = {
  title: string;
  lines: string[];
};

export type BusinessPdfOptions<T> = {
  title: string;
  subtitle?: string;
  metadataRows: Array<[string, string]>;
  columns: BusinessPdfColumn<T>[];
  rows: T[];
  summarySections?: BusinessPdfSection[];
  footerNotes?: string[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 30;
const TOP_Y = 760;
const BOTTOM_Y = 82;
const LINE_HEIGHT = 10;
const BODY_FONT_SIZE = 7.2;
const HEADER_FONT_SIZE = 7.5;
const TITLE_FONT_SIZE = 16;

function text(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function measure(font: PDFFont, value: string, size: number) {
  return font.widthOfTextAtSize(value, size);
}

function wrapText(font: PDFFont, value: unknown, maxWidth: number, size = BODY_FONT_SIZE) {
  const input = text(value);
  if (!input) return [""];
  const words = input.split(" ");
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
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: 0.4,
    borderColor: rgb(0.68, 0.72, 0.78),
    color: fill ? rgb(0.93, 0.95, 0.97) : undefined,
  });
}

function addPage(pdf: PDFDocument, fonts: { regular: PDFFont; bold: PDFFont }, title: string, subtitle?: string) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawText(page, fonts.regular, title, MARGIN_X, 800, { size: TITLE_FONT_SIZE, bold: fonts.bold });
  if (subtitle) drawText(page, fonts.regular, subtitle, MARGIN_X, 783, { size: 9 });
  page.drawLine({ start: { x: MARGIN_X, y: 775 }, end: { x: PAGE_WIDTH - MARGIN_X, y: 775 }, thickness: 0.6, color: rgb(0.63, 0.68, 0.74) });
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

function drawTableHeader<T>(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, columns: BusinessPdfColumn<T>[], x: number, y: number) {
  let cursorX = x;
  for (const column of columns) {
    drawBox(page, cursorX, y - 16, column.width, 16, true);
    drawText(page, fonts.regular, column.label, cursorX + 3, y - 11, { size: HEADER_FONT_SIZE, bold: fonts.bold, maxWidth: column.width - 6, align: column.align || "left" });
    cursorX += column.width;
  }
  return y - 16;
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

export async function buildBusinessPdfBuffer<T>(options: BusinessPdfOptions<T>) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const pages: PDFPage[] = [];

  let page = addPage(pdf, fonts, options.title, options.subtitle);
  pages.push(page);
  let y = drawMetadata(page, fonts, options.metadataRows, TOP_Y);
  y = drawTableHeader(page, fonts, options.columns, MARGIN_X, y);

  for (const row of options.rows) {
    const height = rowHeight(fonts, row, options.columns);
    if (y - height < BOTTOM_Y) {
      page = addPage(pdf, fonts, options.title, options.subtitle);
      pages.push(page);
      y = drawTableHeader(page, fonts, options.columns, MARGIN_X, TOP_Y);
    }
    y = drawRow(page, fonts, row, options.columns, MARGIN_X, y, height);
  }

  const sections = options.summarySections || [];
  for (const section of sections) {
    const estimated = 28 + section.lines.length * 13;
    if (y - estimated < BOTTOM_Y) {
      page = addPage(pdf, fonts, options.title, options.subtitle);
      pages.push(page);
      y = TOP_Y;
    }
    y = drawSection(page, fonts, section, y - 18);
  }

  const notes = options.footerNotes || [];
  if (notes.length) {
    if (y - notes.length * 12 < BOTTOM_Y) {
      page = addPage(pdf, fonts, options.title, options.subtitle);
      pages.push(page);
      y = TOP_Y;
    }
    y = drawSection(page, fonts, { title: "Notes", lines: notes }, y - 18);
  }

  pages.forEach((pdfPage, index) => drawPageNumber(pdfPage, regular, index + 1, pages.length));
  return Buffer.from(await pdf.save());
}
