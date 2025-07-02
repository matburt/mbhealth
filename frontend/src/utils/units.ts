/**
 * Unit Conversion Utilities for Frontend
 * 
 * Provides conversion functions and formatting for health data units.
 */

export type WeightUnit = 'kg' | 'lbs';
export type TemperatureUnit = 'c' | 'f';
export type HeightUnit = 'cm' | 'ft';

export interface UnitPreferences {
  weight_unit: WeightUnit;
  temperature_unit: TemperatureUnit;
  height_unit: HeightUnit;
}

/**
 * Convert weight between kg and lbs
 */
export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value * 2.20462;
  } else if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value / 2.20462;
  }
  
  return value;
}

/**
 * Convert temperature between Celsius and Fahrenheit
 */
export function convertTemperature(value: number, fromUnit: TemperatureUnit, toUnit: TemperatureUnit): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'c' && toUnit === 'f') {
    return (value * 9/5) + 32;
  } else if (fromUnit === 'f' && toUnit === 'c') {
    return (value - 32) * 5/9;
  }
  
  return value;
}

/**
 * Convert height between cm and ft (decimal feet)
 */
export function convertHeight(value: number, fromUnit: HeightUnit, toUnit: HeightUnit): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'cm' && toUnit === 'ft') {
    return value / 30.48;
  } else if (fromUnit === 'ft' && toUnit === 'cm') {
    return value * 30.48;
  }
  
  return value;
}

/**
 * Format decimal feet to feet and inches (e.g., 5.75 -> "5' 9\"")
 */
export function formatHeightImperial(feetDecimal: number): string {
  const feet = Math.floor(feetDecimal);
  const inches = Math.round((feetDecimal - feet) * 12);
  return `${feet}' ${inches}"`;
}

/**
 * Parse height string like "5' 9\"" to decimal feet
 */
export function parseHeightImperial(heightStr: string): number {
  try {
    // Remove quotes and split
    const cleaned = heightStr.replace(/['"]/g, '').replace(/'/g, '').replace(/"/g, '');
    const parts = cleaned.split(/\s+/);
    
    if (parts.length === 2) {
      const feet = parseInt(parts[0]);
      const inches = parseInt(parts[1]);
      return feet + (inches / 12);
    } else if (parts.length === 1) {
      return parseFloat(parts[0]);
    }
    
    throw new Error('Invalid format');
  } catch (error) {
    throw new Error(`Cannot parse height: ${heightStr}. Expected format like '5 9' or '5' 9"'`);
  }
}

/**
 * Get user-friendly unit label
 */
export function getUnitLabel(metricType: string, unit: string): string {
  const labels: Record<string, Record<string, string>> = {
    weight: {
      kg: 'kg',
      lbs: 'lbs'
    },
    temperature: {
      c: '°C',
      f: '°F'
    },
    height: {
      cm: 'cm',
      ft: 'ft'
    }
  };
  
  return labels[metricType]?.[unit] || unit;
}

/**
 * Convert health data value based on metric type
 */
export function convertHealthDataValue(
  value: number,
  metricType: string,
  fromUnit: string,
  toUnit: string
): number {
  switch (metricType) {
    case 'weight':
      return convertWeight(value, fromUnit as WeightUnit, toUnit as WeightUnit);
    case 'temperature':
      return convertTemperature(value, fromUnit as TemperatureUnit, toUnit as TemperatureUnit);
    case 'height':
      return convertHeight(value, fromUnit as HeightUnit, toUnit as HeightUnit);
    default:
      return value;
  }
}

/**
 * Get default unit for a metric type
 */
export function getDefaultUnit(metricType: string, system: 'imperial' | 'metric' = 'imperial'): string {
  {const defaults: Record<string, Record<string, string>> = {
    imperial: {
      weight: 'lbs',
      temperature: 'f',
      height: 'ft',
      blood_pressure: 'mmHg',
      blood_sugar: 'mg/dL',
      heart_rate: 'bpm'
    },
    metric: {
      weight: 'kg',
      temperature: 'c',
      height: 'cm',
      blood_pressure: 'mmHg',
      blood_sugar: 'mmol/L',
      heart_rate: 'bpm'
    }
  };
  
  return defaults[system]?.[metricType] || '';
}

/**
 * Format a value with its unit for display
 */
export function formatValueWithUnit(
  value: number,
  metricType: string,
  unit: string,
  precision: number = 1
): string {
  if (metricType === 'height' && unit === 'ft') {
    return formatHeightImperial(value);
  } else {
    {const unitLabel = getUnitLabel(metricType, unit);
    return `${value.toFixed(precision)} ${unitLabel}`;
  }
}

/**
 * Check if a metric type supports unit conversion
 */
export function shouldConvertMetric(metricType: string): boolean {
  {const convertibleMetrics = new Set(['weight', 'temperature', 'height']);
  return convertibleMetrics.has(metricType);
}

/**
 * Unit converter class with user preferences
 */
export class UnitConverter {
  constructor(private preferences: UnitPreferences) {}
  
  /**
   * Convert a stored value to user's preferred units
   */
  convertToUserUnits(value: number, metricType: string, storedUnit: string): { value: number; unit: string } {
    {const userUnit = this.getUserUnitForMetric(metricType);
    
    if (shouldConvertMetric(metricType)) {
      {const convertedValue = convertHealthDataValue(value, metricType, storedUnit, userUnit);
      return { value: convertedValue, unit: userUnit };
    } else {
      return { value, unit: storedUnit };
    }
  }
  
  /**
   * Convert a value from user's units to target storage unit
   */
  convertFromUserUnits(value: number, metricType: string, targetUnit: string): number {
    {const userUnit = this.getUserUnitForMetric(metricType);
    
    if (shouldConvertMetric(metricType)) {
      return convertHealthDataValue(value, metricType, userUnit, targetUnit);
    } else {
      return value;
    }
  }
  
  /**
   * Get user's preferred unit for a metric type
   */
  getUserUnitForMetric(metricType: string): string {
    switch (metricType) {
      case 'weight':
        return this.preferences.weight_unit;
      case 'temperature':
        return this.preferences.temperature_unit;
      case 'height':
        return this.preferences.height_unit;
      default:
        return getDefaultUnit(metricType, 'imperial');
    }
  }
  
  /**
   * Format value with user's preferred units
   */
  formatValue(value: number, metricType: string, precision: number = 1): string {
    {const userUnit = this.getUserUnitForMetric(metricType);
    return formatValueWithUnit(value, metricType, userUnit, precision);
  }
}

/**
 * Create a unit converter from user object
 */
export function createUnitConverter(user: { weight_unit: WeightUnit; temperature_unit: TemperatureUnit; height_unit: HeightUnit }): UnitConverter {
  return new UnitConverter({
    weight_unit: user.weight_unit,
    temperature_unit: user.temperature_unit,
    height_unit: user.height_unit
  });
}