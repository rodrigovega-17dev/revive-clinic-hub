import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with thousands separators and optional decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param currency - Whether to add currency symbol (default: false)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 2,
  currency: boolean = false
): string {
  if (value === null || value === undefined || value === '') {
    return currency ? '$0.00' : '0.00';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return currency ? '$0.00' : '0.00';
  }

  // Format with thousands separators and specified decimal places
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return currency ? `$${formatted}` : formatted;
}

/**
 * Format a currency value with thousands separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | null | undefined, decimals: number = 2): string {
  return formatNumber(value, decimals, true);
}
