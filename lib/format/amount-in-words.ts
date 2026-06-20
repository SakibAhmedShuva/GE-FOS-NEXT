const SMALL = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number): string {
  if (value < 20) return SMALL[value];
  const ten = Math.floor(value / 10);
  const rest = value % 10;
  return [TENS[ten], SMALL[rest]].filter(Boolean).join(" ");
}

function belowThousand(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return [hundred ? `${SMALL[hundred]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

export function amountInWords(value: number, currency = "Taka") {
  if (!Number.isFinite(value)) return `Zero ${currency} Only`;
  const rounded = Math.round(Math.abs(value));
  if (rounded === 0) return `Zero ${currency} Only`;

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const rest = rounded % 1000;

  const parts = [
    crore ? `${belowThousand(crore)} Crore` : "",
    lakh ? `${belowThousand(lakh)} Lakh` : "",
    thousand ? `${belowThousand(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : "",
  ].filter(Boolean);

  return `${parts.join(" ")} ${currency} Only`;
}
