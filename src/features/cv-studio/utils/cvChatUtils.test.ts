import { describe, it, expect } from 'vitest';
import { extractProposedChanges, extractValidatedProposedChanges } from './cvChatUtils';

describe('cvChatUtils', () => {
  describe('extractProposedChanges', () => {
    it('should extract valid changes', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Update name"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].section).toBe('basics');
      expect(result![0].newData).toEqual({ name: 'John Doe' });
    });

    it('should reject unknown section', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "unknown_section",\n      "action": "update",\n      "newData": { "foo": "bar" },\n      "explanation": "Invalid section"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject invalid action', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "invalid_action",\n      "newData": { "name": "John Doe" },\n      "explanation": "Invalid action"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject missing explanation', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" }\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text as any);
      expect(result).toBeNull();
    });

    it('should reject primitive basics', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": "Just a string",\n      "explanation": "Invalid basics"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should reject work entry missing required fields', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Missing name and position" }],\n      "explanation": "Invalid work entry"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toBeNull();
    });

    it('should extract valid work entry', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "name": "Company", "position": "Dev" }],\n      "explanation": "Valid work entry"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toHaveLength(1);
    });

    it('should handle mixed response: one valid and one invalid', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Valid"\n    },\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Invalid" }],\n      "explanation": "Invalid"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).toHaveLength(1);
      expect(result![0].section).toBe('basics');
    });

    it('should extract valid array work rewrite', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "rewrite",\n      "newData": [\n        { "name": "Company A", "position": "Senior Dev" },\n        { "name": "Company B", "position": "Junior Dev" }\n      ],\n      "explanation": "Rewrite entire work history"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(Array.isArray(result![0].newData)).toBe(true);
      expect(result![0].newData).toHaveLength(2);
    });

    it('should extract valid skills array', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "skills",\n      "action": "update",\n      "newData": [\n        { "name": "TypeScript", "level": "Master" },\n        { "name": "React", "level": "Expert" }\n      ],\n      "explanation": "Update skills list"\n    }\n  ]\n}\n```';
      const result = extractProposedChanges(text);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(Array.isArray(result![0].newData)).toBe(true);
    });
  });

  describe('extractValidatedProposedChanges', () => {
    it('should report invalid count for malformed array entry', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "work",\n      "action": "rewrite",\n      "newData": [\n        { "name": "Valid Co", "position": "Dev" },\n        { "name": "Invalid Co" }\n      ],\n      "explanation": "One valid, one missing position"\n    }\n  ]\n}\n```';
      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(0);
      expect(result.invalidCount).toBe(1);
    });

    it('should report invalid count', () => {
      const text = '```json\n{\n  "proposedChanges": [\n    {\n      "section": "basics",\n      "action": "update",\n      "newData": { "name": "John Doe" },\n      "explanation": "Valid"\n    },\n    {\n      "section": "work",\n      "action": "add",\n      "newData": [{ "summary": "Invalid" }],\n      "explanation": "Invalid"\n    },\n    {\n      "section": "unknown",\n      "action": "update",\n      "newData": {},\n      "explanation": "Unknown section"\n    }\n  ]\n}\n```';
      const result = extractValidatedProposedChanges(text);
      expect(result.changes).toHaveLength(1);
      expect(result.invalidCount).toBe(2);
    });
  });
});
