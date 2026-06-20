const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "br"]);
const TAG_RE = /<\/?([a-zA-Z0-9-]+)(\s[^>]*)?>/g;
const SCRIPT_STYLE_RE = /<\s*(script|style|iframe)[\s\S]*?<\s*\/\s*\1\s*>/gi;
const EVENT_ATTR_RE = /\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;

export function sanitizeLegacyRichText(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .replace(SCRIPT_STYLE_RE, "")
    .replace(TAG_RE, (full, tagName: string) => {
      const normalized = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(normalized)) return "";
      return full.replace(EVENT_ATTR_RE, "").replace(/\s+(style|class|id)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    });
}

export function richTextToPlainText(input: string | null | undefined): string {
  return sanitizeLegacyRichText(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
