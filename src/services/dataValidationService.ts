// Data Validation Service - Comprehensive Data Validation and Sanitization
// src/services/dataValidationService.ts

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface ValidationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null;
}

export interface SanitizationOptions {
  trimStrings: boolean;
  removeEmptyStrings: boolean;
  normalizeNumbers: boolean;
  validateDates: boolean;
  sanitizeHtml: boolean;
  removeNullValues: boolean;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
}

// ============================================================================
// Predefined Schemas
// ============================================================================

export const TRACKING_DATA_SCHEMA: ValidationSchema = {
  type: 'object',
  required: true,
  properties: {
    timestamp_processed_utc: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    },
    frame_data: {
      type: 'object',
      properties: {
        c09: { type: 'object' },
        c12: { type: 'object' },
        c13: { type: 'object' },
        c16: { type: 'object' },
      },
    },
  },
};

export const PERSON_TRACK_SCHEMA: ValidationSchema = {
  type: 'object',
  required: true,
  properties: {
    track_id: { type: 'number', required: true, min: 0 },
    global_id: { type: 'string', required: false },
    bbox: {
      type: 'array',
      required: true,
      items: { type: 'number', min: 0 },
    },
    confidence: { type: 'number', required: true, min: 0, max: 1 },
    center: {
      type: 'array',
      required: true,
      items: { type: 'number', min: 0 },
    },
    map_coords: {
      type: 'array',
      required: false,
      items: { type: 'number' },
    },
  },
};

export const SYSTEM_HEALTH_SCHEMA: ValidationSchema = {
  type: 'object',
  required: true,
  properties: {
    status: {
      type: 'string',
      required: true,
      enum: ['healthy', 'warning', 'error'],
    },
    detector_model_status: {
      type: 'string',
      required: true,
      enum: ['healthy', 'warning', 'error'],
    },
    tracker_factory_status: {
      type: 'string',
      required: true,
      enum: ['healthy', 'warning', 'error'],
    },
    homography_matrices_status: {
      type: 'string',
      required: true,
      enum: ['healthy', 'warning', 'error'],
    },
    timestamp: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    },
  },
};

export const ENVIRONMENT_ID_SCHEMA: ValidationSchema = {
  type: 'string',
  required: true,
  enum: ['scene_1', 'scene_2', 'scene_3', 'scene_4'],
};

export const CAMERA_ID_SCHEMA: ValidationSchema = {
  type: 'string',
  required: true,
  enum: ['c01', 'c02', 'c03', 'c05', 'c09', 'c12', 'c13', 'c16'],
};

// ============================================================================
// Data Validation Service
// ============================================================================

export class DataValidationService {
  private defaultSanitizationOptions: SanitizationOptions = {
    trimStrings: true,
    removeEmptyStrings: true,
    normalizeNumbers: true,
    validateDates: true,
    sanitizeHtml: true,
    removeNullValues: false,
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
  };

  // ========================================================================
  // Core Validation Methods
  // ========================================================================

  /**
   * Validate data against a schema
   */
  validate(data: any, schema: ValidationSchema, path = ''): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required
      if (schema.required && (data === null || data === undefined)) {
        errors.push(`${path || 'root'}: Field is required but missing`);
        return { isValid: false, errors, warnings };
      }

      // Skip validation if not required and missing
      if (!schema.required && (data === null || data === undefined)) {
        return { isValid: true, errors, warnings };
      }

      // Type validation
      const typeResult = this.validateType(data, schema, path);
      errors.push(...typeResult.errors);
      warnings.push(...typeResult.warnings);

      if (!typeResult.isValid) {
        return { isValid: false, errors, warnings };
      }

      // Additional validations based on type
      switch (schema.type) {
        case 'string':
          const stringResult = this.validateString(data, schema, path);
          errors.push(...stringResult.errors);
          warnings.push(...stringResult.warnings);
          break;

        case 'number':
          const numberResult = this.validateNumber(data, schema, path);
          errors.push(...numberResult.errors);
          warnings.push(...numberResult.warnings);
          break;

        case 'array':
          const arrayResult = this.validateArray(data, schema, path);
          errors.push(...arrayResult.errors);
          warnings.push(...arrayResult.warnings);
          break;

        case 'object':
          const objectResult = this.validateObject(data, schema, path);
          errors.push(...objectResult.errors);
          warnings.push(...objectResult.warnings);
          break;

        case 'date':
          const dateResult = this.validateDate(data, schema, path);
          errors.push(...dateResult.errors);
          warnings.push(...dateResult.warnings);
          break;
      }

      // Custom validation
      if (schema.custom) {
        const customError = schema.custom(data);
        if (customError) {
          errors.push(`${path}: ${customError}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `${path}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Sanitize data with optional validation
   */
  sanitize(
    data: any,
    options: Partial<SanitizationOptions> = {},
    schema?: ValidationSchema
  ): ValidationResult {
    const fullOptions = { ...this.defaultSanitizationOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const sanitized = this.performSanitization(data, fullOptions, 0);

      // Validate sanitized data if schema provided
      if (schema) {
        const validationResult = this.validate(sanitized, schema);
        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitized,
      };
    } catch (error) {
      errors.push(
        `Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { isValid: false, errors, warnings, sanitized: data };
    }
  }

  /**
   * Validate and sanitize in one operation
   */
  validateAndSanitize(
    data: any,
    schema: ValidationSchema,
    sanitizationOptions: Partial<SanitizationOptions> = {}
  ): ValidationResult {
    // First sanitize
    const sanitizationResult = this.sanitize(data, sanitizationOptions);

    // Then validate the sanitized data
    const validationResult = this.validate(sanitizationResult.sanitized, schema);

    return {
      isValid: validationResult.isValid && sanitizationResult.isValid,
      errors: [...sanitizationResult.errors, ...validationResult.errors],
      warnings: [...sanitizationResult.warnings, ...validationResult.warnings],
      sanitized: sanitizationResult.sanitized,
    };
  }

  // ========================================================================
  // Type-Specific Validation Methods
  // ========================================================================

  private validateType(data: any, schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const actualType = this.getDataType(data);

    if (actualType !== schema.type) {
      // Special case: numbers can be strings if they parse correctly
      if (schema.type === 'number' && actualType === 'string') {
        const parsed = parseFloat(data);
        if (!isNaN(parsed)) {
          warnings.push(`${path}: String "${data}" will be converted to number ${parsed}`);
          return { isValid: true, errors, warnings };
        }
      }

      // Special case: dates can be strings if they parse correctly
      if (schema.type === 'date' && actualType === 'string') {
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate.getTime())) {
          warnings.push(`${path}: String "${data}" will be converted to date`);
          return { isValid: true, errors, warnings };
        }
      }

      errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  private validateString(data: string, schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: String length ${data.length} is below minimum ${schema.minLength}`);
    }

    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: String length ${data.length} exceeds maximum ${schema.maxLength}`);
    }

    // Pattern validation
    if (schema.pattern && !schema.pattern.test(data)) {
      errors.push(`${path}: String "${data}" does not match required pattern`);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(
        `${path}: String "${data}" is not one of allowed values: ${schema.enum.join(', ')}`
      );
    }

    // Check for potentially dangerous content
    if (this.containsHtml(data)) {
      warnings.push(`${path}: String contains HTML content that may need sanitization`);
    }

    if (this.containsSqlInjection(data)) {
      errors.push(`${path}: String contains potential SQL injection patterns`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateNumber(data: number, schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Range validation
    if (schema.min !== undefined && data < schema.min) {
      errors.push(`${path}: Number ${data} is below minimum ${schema.min}`);
    }

    if (schema.max !== undefined && data > schema.max) {
      errors.push(`${path}: Number ${data} exceeds maximum ${schema.max}`);
    }

    // Check for special values
    if (!isFinite(data)) {
      errors.push(`${path}: Number is not finite (${data})`);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(
        `${path}: Number ${data} is not one of allowed values: ${schema.enum.join(', ')}`
      );
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateArray(data: any[], schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: Array length ${data.length} is below minimum ${schema.minLength}`);
    }

    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: Array length ${data.length} exceeds maximum ${schema.maxLength}`);
    }

    // Validate each item if schema provided
    if (schema.items) {
      data.forEach((item, index) => {
        const itemResult = this.validate(item, schema.items!, `${path}[${index}]`);
        errors.push(...itemResult.errors);
        warnings.push(...itemResult.warnings);
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateObject(data: object, schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema.properties) {
      return { isValid: true, errors, warnings };
    }

    // Validate each property
    Object.entries(schema.properties).forEach(([prop, propSchema]) => {
      const propPath = path ? `${path}.${prop}` : prop;
      const propValue = (data as any)[prop];

      const propResult = this.validate(propValue, propSchema, propPath);
      errors.push(...propResult.errors);
      warnings.push(...propResult.warnings);
    });

    // Check for unexpected properties
    const expectedProps = Object.keys(schema.properties);
    const actualProps = Object.keys(data);
    const unexpectedProps = actualProps.filter((prop) => !expectedProps.includes(prop));

    if (unexpectedProps.length > 0) {
      warnings.push(`${path}: Unexpected properties found: ${unexpectedProps.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateDate(data: any, schema: ValidationSchema, path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let dateValue: Date;

    if (data instanceof Date) {
      dateValue = data;
    } else if (typeof data === 'string') {
      dateValue = new Date(data);
    } else if (typeof data === 'number') {
      dateValue = new Date(data);
    } else {
      errors.push(`${path}: Cannot convert ${typeof data} to Date`);
      return { isValid: false, errors, warnings };
    }

    if (isNaN(dateValue.getTime())) {
      errors.push(`${path}: Invalid date value`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ========================================================================
  // Sanitization Methods
  // ========================================================================

  private performSanitization(data: any, options: SanitizationOptions, depth: number): any {
    // Prevent infinite recursion
    if (depth > options.maxObjectDepth) {
      console.warn(`Maximum object depth ${options.maxObjectDepth} exceeded`);
      return null;
    }

    if (data === null || data === undefined) {
      return options.removeNullValues ? undefined : data;
    }

    switch (typeof data) {
      case 'string':
        return this.sanitizeString(data, options);
      case 'number':
        return this.sanitizeNumber(data, options);
      case 'boolean':
        return data;
      case 'object':
        if (Array.isArray(data)) {
          return this.sanitizeArray(data, options, depth);
        } else if (data instanceof Date) {
          return this.sanitizeDate(data, options);
        } else {
          return this.sanitizeObject(data, options, depth);
        }
      default:
        return data;
    }
  }

  private sanitizeString(str: string, options: SanitizationOptions): string {
    let result = str;

    // Trim whitespace
    if (options.trimStrings) {
      result = result.trim();
    }

    // Remove empty strings
    if (options.removeEmptyStrings && result === '') {
      return '';
    }

    // Limit length
    if (result.length > options.maxStringLength) {
      result = result.substring(0, options.maxStringLength);
    }

    // Sanitize HTML
    if (options.sanitizeHtml) {
      result = this.stripHtml(result);
    }

    return result;
  }

  private sanitizeNumber(num: number, options: SanitizationOptions): number {
    if (!options.normalizeNumbers) {
      return num;
    }

    // Handle special values
    if (!isFinite(num)) {
      return 0;
    }

    // Round to reasonable precision
    if (num % 1 !== 0) {
      return Math.round(num * 1000000) / 1000000; // 6 decimal places
    }

    return num;
  }

  private sanitizeArray(arr: any[], options: SanitizationOptions, depth: number): any[] {
    // Limit array length
    const limitedArray = arr.slice(0, options.maxArrayLength);

    return limitedArray
      .map((item) => this.performSanitization(item, options, depth + 1))
      .filter((item) => !options.removeNullValues || (item !== null && item !== undefined));
  }

  private sanitizeObject(obj: object, options: SanitizationOptions, depth: number): object {
    const result: any = {};

    Object.entries(obj).forEach(([key, value]) => {
      const sanitizedKey = options.sanitizeHtml ? this.stripHtml(key) : key;
      const sanitizedValue = this.performSanitization(value, options, depth + 1);

      if (!options.removeNullValues || (sanitizedValue !== null && sanitizedValue !== undefined)) {
        result[sanitizedKey] = sanitizedValue;
      }
    });

    return result;
  }

  private sanitizeDate(date: Date, options: SanitizationOptions): Date | string {
    if (!options.validateDates) {
      return date;
    }

    if (isNaN(date.getTime())) {
      return new Date(); // Return current date for invalid dates
    }

    return date;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getDataType(data: any): string {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (Array.isArray(data)) return 'array';
    if (data instanceof Date) return 'date';
    return typeof data;
  }

  private containsHtml(str: string): boolean {
    const htmlPattern = /<[^>]*>/;
    return htmlPattern.test(str);
  }

  private containsSqlInjection(str: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(UNION|OR\s+1=1|AND\s+1=1|'|")/i,
      /(-{2}|\/\*|\*\/)/,
    ];

    return sqlPatterns.some((pattern) => pattern.test(str));
  }

  private stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '');
  }

  // ========================================================================
  // Public Utility Methods
  // ========================================================================

  /**
   * Validate tracking data from WebSocket
   */
  validateTrackingData(data: any): ValidationResult {
    return this.validateAndSanitize(data, TRACKING_DATA_SCHEMA, {
      maxStringLength: 1000,
      maxArrayLength: 100,
      removeNullValues: true,
    });
  }

  /**
   * Validate person track data
   */
  validatePersonTrack(data: any): ValidationResult {
    return this.validateAndSanitize(data, PERSON_TRACK_SCHEMA, {
      normalizeNumbers: true,
      removeNullValues: false,
    });
  }

  /**
   * Validate system health data
   */
  validateSystemHealth(data: any): ValidationResult {
    return this.validateAndSanitize(data, SYSTEM_HEALTH_SCHEMA);
  }

  /**
   * Validate environment ID
   */
  validateEnvironmentId(data: any): ValidationResult {
    return this.validate(data, ENVIRONMENT_ID_SCHEMA);
  }

  /**
   * Validate camera ID
   */
  validateCameraId(data: any): ValidationResult {
    return this.validate(data, CAMERA_ID_SCHEMA);
  }

  /**
   * Sanitize user input for display
   */
  sanitizeUserInput(input: string): string {
    const result = this.sanitize(input, {
      trimStrings: true,
      removeEmptyStrings: false,
      sanitizeHtml: true,
      maxStringLength: 1000,
    });

    return result.sanitized || '';
  }

  /**
   * Deep clone and sanitize data
   */
  deepSanitize(data: any, options?: Partial<SanitizationOptions>): any {
    try {
      // Deep clone first to avoid mutating original data
      const cloned = JSON.parse(JSON.stringify(data));
      const result = this.sanitize(cloned, options);
      return result.sanitized;
    } catch (error) {
      console.error('Deep sanitization failed:', error);
      return data;
    }
  }
}

// ============================================================================
// Global Service Instance
// ============================================================================

export const dataValidationService = new DataValidationService();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick validation helper
 */
export function validateData(data: any, schema: ValidationSchema): boolean {
  const result = dataValidationService.validate(data, schema);
  if (!result.isValid) {
    console.error('Validation errors:', result.errors);
  }
  return result.isValid;
}

/**
 * Quick sanitization helper
 */
export function sanitizeData(data: any, options?: Partial<SanitizationOptions>): any {
  const result = dataValidationService.sanitize(data, options);
  return result.sanitized;
}

/**
 * Create custom validation schema
 */
export function createSchema(
  baseType: ValidationSchema['type'],
  overrides: Partial<ValidationSchema> = {}
): ValidationSchema {
  return {
    type: baseType,
    required: false,
    ...overrides,
  };
}

export default DataValidationService;
