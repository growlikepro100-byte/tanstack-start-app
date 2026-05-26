// Bangla number + price formatting
const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaNumber(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

export function formatPriceBn(price: number): string {
  // Bangladeshi Lakh format
  const rounded = Math.round(price);
  let s: string;
  if (rounded >= 100000) {
    const lakh = rounded / 100000;
    s = `${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)} লাখ`;
  } else if (rounded >= 1000) {
    s = `${(rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1)} হাজার`;
  } else {
    s = `${rounded}`;
  }
  return `৳ ${toBanglaNumber(s)}`;
}

export function formatAgeBn(months: number | null | undefined): string {
  if (!months) return "—";
  if (months < 12) return `${toBanglaNumber(months)} মাস`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0
    ? `${toBanglaNumber(years)} বছর`
    : `${toBanglaNumber(years)} বছর ${toBanglaNumber(rem)} মাস`;
}

export function formatWeightBn(kg: number | null | undefined): string {
  if (!kg) return "—";
  return `${toBanglaNumber(kg)} কেজি`;
}
