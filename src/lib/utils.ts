import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get currency symbol and formatting options
 */
export function getCurrencyConfig(currency: string = 'USD') {
  const configs = {
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    MXN: { symbol: '$', locale: 'es-MX' },
  };
  
  return configs[currency as keyof typeof configs] || configs.USD;
}

/**
 * Format a number with thousands separators and optional decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param currency - Whether to add currency symbol (default: false)
 * @param currencyCode - Currency code for formatting (default: 'USD')
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 2,
  currency: boolean = false,
  currencyCode: string = 'USD'
): string {
  if (value === null || value === undefined || value === '') {
    if (currency) {
      const config = getCurrencyConfig(currencyCode);
      return `${config.symbol}0.00`;
    }
    return '0.00';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    if (currency) {
      const config = getCurrencyConfig(currencyCode);
      return `${config.symbol}0.00`;
    }
    return '0.00';
  }

  const config = getCurrencyConfig(currencyCode);

  // Format with thousands separators and specified decimal places
  const formatted = numValue.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return currency ? `${config.symbol}${formatted}` : formatted;
}

/**
 * Format a currency value with thousands separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param currencyCode - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  decimals: number = 2,
  currencyCode: string = 'USD'
): string {
  return formatNumber(value, decimals, true, currencyCode);
}

/**
 * Text color class for a balance amount: green when positive, red when
 * negative, neutral when exactly zero (a zero balance is neither a credit
 * nor a debt, so it shouldn't read as a "good" green number).
 */
export function getBalanceColorClass(balance: number): string {
  if (balance > 0) return 'text-green-600';
  if (balance < 0) return 'text-red-600';
  return 'text-muted-foreground';
}

/** "+" prefix for a balance amount; omitted for zero and negative values. */
export function getBalanceSign(balance: number): string {
  return balance > 0 ? '+' : '';
}

/**
 * Format a date with timezone support
 * @param date - Date to format
 * @param timezone - Timezone to use (default: 'UTC')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a datetime with timezone support
 * @param date - Date to format
 * @param timezone - Timezone to use (default: 'UTC')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted datetime string
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Convert a date to clinic timezone
 * @param date - Date to convert
 * @param timezone - Target timezone
 * @returns Date in target timezone
 */
export function convertToTimezone(
  date: Date | string,
  timezone: string = 'UTC'
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    // Get the current timezone offset
    const currentOffset = dateObj.getTimezoneOffset();
    
    // Get the target timezone offset
    const targetDate = new Date(dateObj.toLocaleString("en-US", { timeZone: timezone }));
    const targetOffset = targetDate.getTimezoneOffset();
    
    // Calculate the difference and adjust the date
    const offsetDiff = targetOffset - currentOffset;
    const adjustedDate = new Date(dateObj.getTime() + (offsetDiff * 60000));
    
    return adjustedDate;
  } catch (error) {
    console.error('Error converting timezone:', error);
    return dateObj;
  }
}
