import { describe, it, expect, beforeEach } from 'vitest';
import { ModelValidator, ValidationError } from '../../models/validation';

describe('ModelValidator', () => {
  let validator: ModelValidator;

  beforeEach(() => {
    validator = new ModelValidator();
  });

  describe('Required Field Validation', () => {
    it('should pass for valid required values', () => {
      const result = validator
        .validateRequired('name', 'Test Name', 'Name')
        .getResult();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for null, undefined, or empty values', () => {
      validator
        .validateRequired('field1', null, 'Field 1')
        .validateRequired('field2', undefined, 'Field 2')
        .validateRequired('field3', '', 'Field 3');

      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].code).toBe('REQUIRED');
    });
  });

  describe('String Validation', () => {
    it('should validate string type', () => {
      validator.validateString('field', 123, 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate minimum length', () => {
      validator.validateString('field', 'ab', 'Field', { minLength: 3 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH');
    });

    it('should validate maximum length', () => {
      validator.validateString('field', 'abcdef', 'Field', { maxLength: 5 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_LENGTH');
    });

    it('should validate pattern', () => {
      validator.validateString('email', 'invalid-email', 'Email', { 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('should pass for valid string', () => {
      validator.validateString('field', 'valid string', 'Field', {
        minLength: 5,
        maxLength: 20,
        pattern: /^[a-z\s]+$/
      });
      const result = validator.getResult();

      expect(result.isValid).toBe(true);
    });
  });

  describe('Array Validation', () => {
    it('should validate array type', () => {
      validator.validateArray('field', 'not-array', 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate minimum length', () => {
      validator.validateArray('field', [1, 2], 'Field', { minLength: 3 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH');
    });

    it('should validate maximum length', () => {
      validator.validateArray('field', [1, 2, 3, 4], 'Field', { maxLength: 3 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_LENGTH');
    });

    it('should validate array items', () => {
      validator.validateArray('field', ['valid', '', 'also-valid'], 'Field', {
        itemValidator: (item, index) => {
          const errors: ValidationError[] = [];
          if (typeof item !== 'string' || item.length === 0) {
            errors.push(new ValidationError(
              `field[${index}]`,
              'Item must be non-empty string',
              'INVALID_ITEM',
              item
            ));
          }
          return errors;
        }
      });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Enum Validation', () => {
    enum TestEnum {
      VALUE1 = 'value1',
      VALUE2 = 'value2'
    }

    it('should pass for valid enum value', () => {
      validator.validateEnum('field', TestEnum.VALUE1, 'Field', TestEnum);
      const result = validator.getResult();

      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid enum value', () => {
      validator.validateEnum('field', 'invalid', 'Field', TestEnum);
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_ENUM');
    });
  });

  describe('Number Validation', () => {
    it('should validate number type', () => {
      validator.validateNumber('field', 'not-number', 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate integer requirement', () => {
      validator.validateNumber('field', 3.14, 'Field', { integer: true });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate minimum value', () => {
      validator.validateNumber('field', 5, 'Field', { min: 10 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_VALUE');
    });

    it('should validate maximum value', () => {
      validator.validateNumber('field', 15, 'Field', { max: 10 });
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_VALUE');
    });

    it('should pass for valid number', () => {
      validator.validateNumber('field', 42, 'Field', {
        min: 0,
        max: 100,
        integer: true
      });
      const result = validator.getResult();

      expect(result.isValid).toBe(true);
    });
  });

  describe('Date Validation', () => {
    it('should pass for valid date', () => {
      validator.validateDate('field', new Date(), 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid date', () => {
      validator.validateDate('field', new Date('invalid'), 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should fail for non-date value', () => {
      validator.validateDate('field', 'not-date', 'Field');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });
  });

  describe('Custom Validation', () => {
    it('should add custom errors', () => {
      validator.addCustomError('field', 'Custom error message', 'CUSTOM_ERROR', 'value');
      const result = validator.getResult();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Custom error message');
      expect(result.errors[0].code).toBe('CUSTOM_ERROR');
      expect(result.errors[0].value).toBe('value');
    });

    it('should add warnings', () => {
      validator.addWarning('This is a warning');
      const result = validator.getResult();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('This is a warning');
    });
  });

  describe('Validator State Management', () => {
    it('should reset validator state', () => {
      validator
        .validateRequired('field', null, 'Field')
        .addWarning('Warning message');

      let result = validator.getResult();
      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);

      validator.reset();
      result = validator.getResult();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should chain validation methods', () => {
      const result = validator
        .validateRequired('field1', 'value', 'Field 1')
        .validateString('field2', 'test', 'Field 2', { minLength: 2 })
        .validateNumber('field3', 42, 'Field 3', { min: 0 })
        .getResult();

      expect(result.isValid).toBe(true);
    });
  });
});

describe('ValidationError', () => {
  it('should create validation error with all properties', () => {
    const error = new ValidationError('field', 'Error message', 'ERROR_CODE', 'value');

    expect(error.name).toBe('ValidationError');
    expect(error.field).toBe('field');
    expect(error.message).toBe('Error message');
    expect(error.code).toBe('ERROR_CODE');
    expect(error.value).toBe('value');
  });

  it('should extend Error class', () => {
    const error = new ValidationError('field', 'Error message', 'ERROR_CODE');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });
});