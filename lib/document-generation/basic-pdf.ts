export type PdfLine = string | number | null | undefined;

export function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

export function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrapLine(line: PdfLine, maxChars = 112) {
  const text = String(line ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [""];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const breakAt = Math.max(slice.lastIndexOf(" "), Math.floor(maxChars * 0.7));
    chunks.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

export function section(title: string, lines: PdfLine[]) {
  return ["", title, "-".repeat(Math.min(title.length, 80)), ...lines];
}

export function paginateLines(lines: PdfLine[], options: { maxLinesPerPage?: number; maxChars?: number } = {}) {
  const maxLinesPerPage = options.maxLinesPerPage || 46;
  const maxChars = options.maxChars || 112;
  const pages: string[][] = [[]];
  for (const line of lines) {
    const wrapped = wrapLine(line, maxChars);
    for (const part of wrapped) {
      const current = pages[pages.length - 1];
      if (current.length >= maxLinesPerPage) pages.push([]);
      pages[pages.length - 1].push(part);
    }
  }
  return pages.filter((page) => page.length > 0);
}

function pageStream(lines: string[], pageNumber: number, pageCount: number) {
  const commands = ["BT", "/F1 9 Tf", "42 800 Td"];
  lines.forEach((line, index) => {
    if (index > 0) commands.push("0 -14 Td");
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push("0 -20 Td");
  commands.push(`(Page ${pageNumber} of ${pageCount}) Tj`);
  commands.push("ET");
  return commands.join("\n");
}

export function buildBasicPdfBuffer({ lines, maxLinesPerPage = 46, maxChars = 112 }: { lines: PdfLine[]; maxLinesPerPage?: number; maxChars?: number }) {
  const pages = paginateLines(lines, { maxLinesPerPage, maxChars });
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];

  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("__PAGES_OBJECT__");
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 4 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const stream = pageStream(pageLines, index + 1, pages.length);
    objects.push(`${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`);
    objects.push(`${contentObjectNumber} 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`);
  });

  objects[1] = `2 0 obj << /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >> endobj`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
