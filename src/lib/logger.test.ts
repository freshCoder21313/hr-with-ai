import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const originalEnv = import.meta.env.MODE;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // MODE is read at module load; tests re-import logger
    void originalEnv;
  });

  it('is silent in test mode by default', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.error('should not appear');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
