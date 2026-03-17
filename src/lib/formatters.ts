// Phone: format as XXX-XXX-XXXX
export function formatPhone(value: string | number | null | undefined): string {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Price/number: format with commas (1,000 / 10,000 / 1,000,000)
export function formatNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-US");
}

// Parse formatted number back to raw digits
export function parseNumber(value: string): string {
  return value.replace(/\D/g, "");
}
