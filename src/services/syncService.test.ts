import { describe, it, expect } from 'vitest';
import { syncService } from './syncService';

describe('syncService', () => {
  describe('validateId', () => {
    it('should validate valid 16-char alphanumeric IDs', () => {
      const validId = 'a1b2c3d4e5f6g7h8';
      expect(syncService.validateId(validId)).toBe(true);
    });

    it('should reject IDs with special characters', () => {
      const invalidId = 'a1b2c3d4e5f6g7h!';
      expect(syncService.validateId(invalidId)).toBe(false);
    });

    it('should reject IDs with incorrect length', () => {
      const shortId = 'a1b2c3';
      const longId = 'a1b2c3d4e5f6g7h8i9j0';
      expect(syncService.validateId(shortId)).toBe(false);
      expect(syncService.validateId(longId)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate a valid 16-char alphanumeric ID', () => {
      const id = syncService.generateId();
      expect(id).toHaveLength(16);
      expect(syncService.validateId(id)).toBe(true);
    });
  });
});
