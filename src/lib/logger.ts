type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = import.meta.env.PROD;
const isTest = import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

function shouldLog(level: LogLevel): boolean {
  if (isTest) return false; // keep vitest output clean unless spies are attached
  if (isProd && level === 'debug') return false;
  return true;
}

/**
 * App logger — use instead of raw `console.*` in application code.
 * Tests silence all levels by default so intentional error paths stay quiet.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...args);
  },
};
