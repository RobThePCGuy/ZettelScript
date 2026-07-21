/**
 * Safe parsing and validation utilities
 */
/**
 * Parse an integer from a string with fallback to default value
 * Returns defaultValue if the string is not a valid integer
 */
export declare function parseIntSafe(value: string, defaultValue: number): number;
/**
 * Parse a float from a string with fallback to default value
 * Returns defaultValue if the string is not a valid number
 */
export declare function parseFloatSafe(value: string, defaultValue: number): number;
/**
 * Clamp a number between min and max values
 */
export declare function clampNumber(value: number, min: number, max: number): number;
/**
 * Parse an integer with bounds checking
 * Returns defaultValue if parsing fails or value is out of bounds
 */
export declare function parseIntBounded(value: string, defaultValue: number, min: number, max: number): number;
/**
 * Parse a float with bounds checking
 * Returns defaultValue if parsing fails or value is out of bounds
 */
export declare function parseFloatBounded(value: string, defaultValue: number, min: number, max: number): number;
/**
 * Validate that a value is a positive integer
 */
export declare function isPositiveInt(value: unknown): value is number;
/**
 * Validate that a value is a non-negative integer
 */
export declare function isNonNegativeInt(value: unknown): value is number;
/**
 * Validate that a value is a number in range [0, 1]
 */
export declare function isNormalizedNumber(value: unknown): value is number;
//# sourceMappingURL=validation.d.ts.map