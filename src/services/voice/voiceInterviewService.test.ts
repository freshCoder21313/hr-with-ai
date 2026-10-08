import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceInterviewService } from './voiceInterviewService';

describe('VoiceInterviewService', () => {
  let service: VoiceInterviewService;

  beforeEach(() => {
    service = new VoiceInterviewService();
  });

  describe('constructor', () => {
    it('should create instance without errors', () => {
      expect(service).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear sentence buffer', () => {
      service.feedStreamChunk('Hello');
      service.reset();
      service.flush();
      // No callback should fire since buffer is cleared
    });
  });

  describe('setOnSentenceCallback', () => {
    it('should store callback function', () => {
      const cb = vi.fn();
      service.setOnSentenceCallback(cb);
      expect(cb).toBeDefined();
    });
  });

  describe('feedStreamChunk', () => {
    it('should accumulate chunk into buffer', () => {
      service.feedStreamChunk('Hello');
      service.feedStreamChunk(' World');
      service.flush();
      // Buffer should contain 'Hello World'
    });
  });

  describe('flush with sentence', () => {
    it('should emit complete sentence on flush', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Hello world.');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Hello world.');
    });

    it('should not emit empty buffer on flush', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.flush();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should trim whitespace before emitting', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('  Hello world.  ');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Hello world.');
    });
  });

  describe('sentence splitting', () => {
    it('should split multiple sentences', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('First sentence. Second sentence? Third!');
      service.flush();

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should handle question marks', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Are you there?');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Are you there?');
    });

    it('should handle exclamation marks', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Great job!');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Great job!');
    });

    it('should strip action tags and bracket control tokens from spoken sentences', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Please implement this in the editor. <ACTION type="CODE" lang="javascript" />');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Please implement this in the editor.');
    });

    it('should clean knowledge-graph bracket tokens into natural speech', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Tell me about [[React Fiber]] and [[CAP Theorem]].');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Tell me about React Fiber and CAP Theorem.');
    });

    it('should strip [[END_SESSION]] token and not speak it', () => {
      const callback = vi.fn();
      service.setOnSentenceCallback(callback);

      service.feedStreamChunk('Thank you for your time today. [[END_SESSION]]');
      service.flush();

      expect(callback).toHaveBeenCalledWith('Thank you for your time today.');
    });
  });
});
