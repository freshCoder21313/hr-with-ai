import { describe, it, expect } from 'vitest';
import {
  inspectTargetLanguage,
  getLanguageNameByCode,
  POPULAR_CUSTOM_LANGUAGES,
} from './languageRecognition';

describe('languageRecognition', () => {
  describe('inspectTargetLanguage', () => {
    it('returns invalid for empty, undefined, or whitespace-only input', () => {
      expect(inspectTargetLanguage(undefined).isValid).toBe(false);
      expect(inspectTargetLanguage('').isValid).toBe(false);
      expect(inspectTargetLanguage('   ').isValid).toBe(false);
    });

    it('returns invalid for numbers and symbols without any letters', () => {
      const numbers = inspectTargetLanguage('123456');
      expect(numbers.isValid).toBe(false);
      expect(numbers.warningMessage).toContain('không hợp lệ');

      const symbols = inspectTargetLanguage('!@#$%^&*()');
      expect(symbols.isValid).toBe(false);
      expect(symbols.warningMessage).toContain('không hợp lệ');
    });

    it('returns invalid for input with fewer than 2 letters', () => {
      const singleLetter = inspectTargetLanguage('a');
      expect(singleLetter.isValid).toBe(false);
      expect(singleLetter.warningMessage).toContain('quá ngắn');
    });

    it('recognizes preset language codes and labels', () => {
      const en = inspectTargetLanguage('en-US');
      expect(en.isValid).toBe(true);
      expect(en.isRecognized).toBe(true);
      expect(en.matchedLanguage).toContain('English');

      const ja = inspectTargetLanguage('ja-JP');
      expect(ja.isValid).toBe(true);
      expect(ja.isRecognized).toBe(true);
      expect(ja.matchedLanguage).toContain('Japanese');
    });

    it('recognizes extended catalog languages and Vietnamese names', () => {
      const russian = inspectTargetLanguage('tiếng nga');
      expect(russian.isValid).toBe(true);
      expect(russian.isRecognized).toBe(true);
      expect(russian.matchedLanguage).toContain('Russian');

      const swedish = inspectTargetLanguage('Swedish');
      expect(swedish.isValid).toBe(true);
      expect(swedish.isRecognized).toBe(true);
      expect(swedish.matchedLanguage).toContain('Swedish');

      const italian = inspectTargetLanguage('tiếng ý');
      expect(italian.isValid).toBe(true);
      expect(italian.isRecognized).toBe(true);
      expect(italian.matchedLanguage).toContain('Italian');

      const thai = inspectTargetLanguage('tiếng thái');
      expect(thai.isValid).toBe(true);
      expect(thai.isRecognized).toBe(true);
      expect(thai.matchedLanguage).toContain('Thai');
    });

    it('recognizes generic phrases containing linguistic keywords', () => {
      const customDialect = inspectTargetLanguage('Tiếng Thổ Địa Phương');
      expect(customDialect.isValid).toBe(true);
      expect(customDialect.isRecognized).toBe(true);
    });

    it('flags uncatalogued alphabetic strings as valid but not recognized', () => {
      const rareLang = inspectTargetLanguage('XylophonicDialect');
      expect(rareLang.isValid).toBe(true);
      expect(rareLang.isRecognized).toBe(false);
      expect(rareLang.warningMessage).toContain('chưa có trong danh mục');
    });
  });

  describe('getLanguageNameByCode', () => {
    it('returns formatted label with flag for preset or catalog matches', () => {
      const result = getLanguageNameByCode('en-US');
      expect(result).toContain('🇺🇸');
      expect(result).toContain('English');
    });

    it('normalizes custom language aliases properly', () => {
      const result = getLanguageNameByCode('tiếng nga');
      expect(result).toContain('Russian');
    });
  });

  describe('POPULAR_CUSTOM_LANGUAGES', () => {
    it('provides quick selection chips with codes and flags', () => {
      expect(POPULAR_CUSTOM_LANGUAGES.length).toBeGreaterThanOrEqual(5);
      expect(POPULAR_CUSTOM_LANGUAGES.some((p) => p.code === 'Russian')).toBe(true);
      expect(POPULAR_CUSTOM_LANGUAGES.some((p) => p.code === 'Swedish')).toBe(true);
    });
  });
});
