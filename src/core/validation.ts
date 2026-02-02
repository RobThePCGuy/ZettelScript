/**
 * Safe parsing and validation utilities
 */

/**
 * Parse an integer from a string with fallback to default value
 * Returns defaultValue if the string is not a valid integer
 */
export function parseIntSafe(value: string, defaultValue: number): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a float from a string with fallback to default value
 * Returns defaultValue if the string is not a valid number
 */
export function parseFloatSafe(value: string, defaultValue: number): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clamp a number between min and max values
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parse an integer with bounds checking
 * Returns defaultValue if parsing fails or value is out of bounds
 */
export function parseIntBounded(
  value: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  const parsed = parseIntSafe(value, defaultValue);
  return clampNumber(parsed, min, max);
}

/**
 * Parse a float with bounds checking
 * Returns defaultValue if parsing fails or value is out of bounds
 */
export function parseFloatBounded(
  value: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  const parsed = parseFloatSafe(value, defaultValue);
  return clampNumber(parsed, min, max);
}

/**
 * Validate that a value is a positive integer
 */
export function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate that a value is a non-negative integer
 */
export function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Validate that a value is a number in range [0, 1]
 */
export function isNormalizedNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}
