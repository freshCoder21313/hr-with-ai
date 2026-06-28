import { describe, it, expect } from 'vitest';
import { stripEntryId, ensureEntryIds } from './entryIds';

describe('entryIds', () => {
  describe('stripEntryId', () => {
    it('removes _entryId from an entry', () => {
      const entry = { _entryId: 'id-1', company: 'Acme', title: 'Engineer' };
      expect(stripEntryId(entry)).toEqual({ company: 'Acme', title: 'Engineer' });
    });

    it('returns a shallow copy when _entryId is absent', () => {
      const entry: { _entryId?: string; company: string; title: string } = {
        company: 'Acme',
        title: 'Engineer',
      };
      const result = stripEntryId(entry);
      expect(result).toEqual({ company: 'Acme', title: 'Engineer' });
      expect(result).not.toBe(entry);
    });

    it('does not mutate the original entry', () => {
      const entry = { _entryId: 'id-1', company: 'Acme' };
      stripEntryId(entry);
      expect(entry._entryId).toBe('id-1');
    });
  });

  describe('ensureEntryIds', () => {
    it('adds _entryId to entries missing one', () => {
      const entries = [{ company: 'Acme' }, { company: 'Beta', _entryId: 'existing' }];
      const result = ensureEntryIds(entries);
      expect(result[0]._entryId).toBeDefined();
      expect(result[1]._entryId).toBe('existing');
    });

    it('returns the same array reference when all entries already have ids', () => {
      const entries = [{ company: 'Acme', _entryId: 'id-1' }];
      expect(ensureEntryIds(entries)).toBe(entries);
    });
  });
});