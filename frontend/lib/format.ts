/**
 * Format price in Crores only (compact, 2 decimals)
 */
export function formatPriceCr(price: number): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return '₹0.00 Cr';
  const crValue = value / 10000000;
  return `₹${crValue.toFixed(2)} Cr`;
}

/**
 * Format price with intelligent scaling: Cr, Lakh, or raw (with locale separator)
 */
export function formatInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

/**
 * Format budget value for chat/display: lakh or crore with flexible decimals
 */
export function formatBudget(value: number): string {
  if (!value || Number.isNaN(value)) return '';
  if (value >= 10000000) {
    const crores = value / 10000000;
    const formatted = crores >= 10 ? crores.toFixed(0) : crores.toFixed(1);
    return `₹${formatted} crore`;
  }
  const lakhs = value / 100000;
  const formattedLakhs = lakhs >= 10 ? Math.round(lakhs).toString() : lakhs.toFixed(1);
  return `₹${formattedLakhs} lakh`;
}

export function formatPriceInrCompact(price: number): string {
  return formatPriceCr(price);
}
