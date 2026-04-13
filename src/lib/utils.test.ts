import { describe, it, expect } from 'vitest';
import { cn, getErrorMessage } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should handle falsy conditionals', () => {
      const isActive = false;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('test error');
      expect(getErrorMessage(error)).toBe('test error');
    });

    it('should convert string to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    it('should convert number to string', () => {
      expect(getErrorMessage(123)).toBe('123');
    });

    it('should handle null', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    it('should handle undefined', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle object', () => {
      expect(getErrorMessage({ message: 'obj' })).toBe('[object Object]');
    });
  });
});
