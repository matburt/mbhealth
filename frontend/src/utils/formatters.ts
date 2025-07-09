/**
 * Utility functions for formatting health data values
 */

/**
 * Format a health metric value with appropriate decimal places
 * @param value - The numeric value to format
 * @param metricType - The type of metric (for future customization)
 * @param decimalPlaces - Number of decimal places (default: 1)
 * @returns Formatted string or 'N/A' if value is invalid
 */
export const formatHealthValue = (
  value: number | string | null | undefined,
  _metricType?: string,
  decimalPlaces: number = 1
): string => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return 'N/A';
  }

  // Special handling for specific metric types can be added here
  // For now, use consistent decimal places for all metrics
  return numValue.toFixed(decimalPlaces);
};

/**
 * Format statistical values (averages, etc.) with higher precision
 * @param value - The numeric value to format
 * @returns Formatted string with 2 decimal places or 'N/A'
 */
export const formatStatValue = (value: number | null | undefined): string => {
  return formatHealthValue(value, 'stat', 2);
};