// Validation utilities for models

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class ValidationError extends Error {
  public readonly field: string;
  public readonly code: string;
  public readonly value?: any;

  constructor(field: string, message: string, code: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
    this.value = value;
  }
}

export class ModelValidator {
  private errors: ValidationError[] = [];
  private warnings: string[] = [];

  public validateRequired(field: string, value: any, fieldName: string): this {
    if (value === null || value === undefined || value === '') {
      this.errors.push(new ValidationError(
        field,
        `${fieldName} is required`,
        'REQUIRED',
        value
      ));
    }
    return this;
  }

  public validateString(field: string, value: any, fieldName: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }): this {
    if (value !== null && value !== undefined) {
      if (typeof value !== 'string') {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be a string`,
          'INVALID_TYPE',
          value
        ));
        return this;
      }

      if (options?.minLength && value.length < options.minLength) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be at least ${options.minLength} characters long`,
          'MIN_LENGTH',
          value
        ));
      }

      if (options?.maxLength && value.length > options.maxLength) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be no more than ${options.maxLength} characters long`,
          'MAX_LENGTH',
          value
        ));
      }

      if (options?.pattern && !options.pattern.test(value)) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} format is invalid`,
          'INVALID_FORMAT',
          value
        ));
      }
    }
    return this;
  }

  public validateArray(field: string, value: any, fieldName: string, options?: {
    minLength?: number;
    maxLength?: number;
    itemValidator?: (item: any, index: number) => ValidationError[];
  }): this {
    if (value !== null && value !== undefined) {
      if (!Array.isArray(value)) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be an array`,
          'INVALID_TYPE',
          value
        ));
        return this;
      }

      if (options?.minLength && value.length < options.minLength) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must have at least ${options.minLength} items`,
          'MIN_LENGTH',
          value
        ));
      }

      if (options?.maxLength && value.length > options.maxLength) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must have no more than ${options.maxLength} items`,
          'MAX_LENGTH',
          value
        ));
      }

      if (options?.itemValidator) {
        value.forEach((item, index) => {
          const itemErrors = options.itemValidator!(item, index);
          this.errors.push(...itemErrors);
        });
      }
    }
    return this;
  }

  public validateEnum<T>(field: string, value: any, fieldName: string, enumObject: Record<string, T>): this {
    if (value !== null && value !== undefined) {
      const validValues = Object.values(enumObject);
      if (!validValues.includes(value)) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be one of: ${validValues.join(', ')}`,
          'INVALID_ENUM',
          value
        ));
      }
    }
    return this;
  }

  public validateNumber(field: string, value: any, fieldName: string, options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }): this {
    if (value !== null && value !== undefined) {
      if (typeof value !== 'number' || isNaN(value)) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be a valid number`,
          'INVALID_TYPE',
          value
        ));
        return this;
      }

      if (options?.integer && !Number.isInteger(value)) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be an integer`,
          'INVALID_TYPE',
          value
        ));
      }

      if (options?.min !== undefined && value < options.min) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be at least ${options.min}`,
          'MIN_VALUE',
          value
        ));
      }

      if (options?.max !== undefined && value > options.max) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be no more than ${options.max}`,
          'MAX_VALUE',
          value
        ));
      }
    }
    return this;
  }

  public validateDate(field: string, value: any, fieldName: string): this {
    if (value !== null && value !== undefined) {
      if (!(value instanceof Date) || isNaN(value.getTime())) {
        this.errors.push(new ValidationError(
          field,
          `${fieldName} must be a valid date`,
          'INVALID_TYPE',
          value
        ));
      }
    }
    return this;
  }

  public addWarning(message: string): this {
    this.warnings.push(message);
    return this;
  }

  public addCustomError(field: string, message: string, code: string, value?: any): this {
    this.errors.push(new ValidationError(field, message, code, value));
    return this;
  }

  public getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  public reset(): this {
    this.errors = [];
    this.warnings = [];
    return this;
  }
}