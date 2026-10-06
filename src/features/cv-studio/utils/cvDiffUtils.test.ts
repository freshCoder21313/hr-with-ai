import { describe, it, expect } from 'vitest';
import {
  computeBulletDiff,
  computeKeywordDiff,
  computeItemFieldDiffs,
  computeObjectDiff,
} from './cvDiffUtils';

describe('cvDiffUtils', () => {
  describe('computeBulletDiff', () => {
    it('accurately identifies added, removed, and unchanged bullets', () => {
      const oldBullets = ['Built React app', 'Maintained MySQL database'];
      const newBullets = ['Built React app', 'Maintained PostgreSQL database', 'Added CI/CD'];

      const result = computeBulletDiff(oldBullets, newBullets);

      expect(result).toEqual([
        { type: 'removed', text: 'Maintained MySQL database' },
        { type: 'unchanged', text: 'Built React app' },
        { type: 'added', text: 'Maintained PostgreSQL database' },
        { type: 'added', text: 'Added CI/CD' },
      ]);
    });
  });

  describe('computeKeywordDiff', () => {
    it('partitions keywords into added, removed, and unchanged', () => {
      const oldKeywords = ['React', 'JavaScript', 'jQuery'];
      const newKeywords = ['React', 'TypeScript', 'JavaScript'];

      const result = computeKeywordDiff(oldKeywords, newKeywords);

      expect(result.added).toEqual(['TypeScript']);
      expect(result.removed).toEqual(['jQuery']);
      expect(result.unchanged).toEqual(['React', 'JavaScript']);
    });
  });

  describe('computeItemFieldDiffs', () => {
    it('computes field-level differences for work items including highlights and text', () => {
      const oldItem = {
        company: 'TechCorp',
        position: 'Junior Developer',
        summary: 'General developer',
        highlights: ['Did tasks'],
      };
      const newItem = {
        company: 'TechCorp',
        position: 'Frontend Developer',
        summary: 'Focused on UI',
        highlights: ['Built responsive UI', 'Did tasks'],
      };

      const diffs = computeItemFieldDiffs(oldItem, newItem);

      expect(diffs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'position',
            oldValue: 'Junior Developer',
            newValue: 'Frontend Developer',
          }),
          expect.objectContaining({
            field: 'summary',
            oldValue: 'General developer',
            newValue: 'Focused on UI',
          }),
          expect.objectContaining({
            field: 'highlights',
            type: 'bullets',
          }),
        ])
      );
    });
  });

  describe('computeObjectDiff', () => {
    it('identifies added, removed, and modified fields in objects', () => {
      const oldObj = {
        name: 'Jane Doe',
        summary: 'Old summary',
        phone: '123456',
      };
      const newObj = {
        name: 'Jane Doe',
        summary: 'New rewritten summary',
        email: 'jane@example.com',
      };

      const result = computeObjectDiff(oldObj, newObj);

      const summaryDiff = result.find((d) => d.key === 'summary');
      const emailDiff = result.find((d) => d.key === 'email');
      const phoneDiff = result.find((d) => d.key === 'phone');
      const nameDiff = result.find((d) => d.key === 'name');

      expect(summaryDiff?.status).toBe('modified');
      expect(summaryDiff?.oldValue).toBe('Old summary');
      expect(summaryDiff?.newValue).toBe('New rewritten summary');

      expect(emailDiff?.status).toBe('added');
      expect(emailDiff?.newValue).toBe('jane@example.com');

      expect(phoneDiff?.status).toBe('removed');
      expect(phoneDiff?.oldValue).toBe('123456');

      expect(nameDiff).toBeUndefined(); // unchanged
    });
  });
});
