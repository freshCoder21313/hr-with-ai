import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';

const compressResumeData = vi.fn<(pd: unknown) => string | undefined>();
const decompressResumeData = vi.fn<(cd: string) => unknown>();

vi.mock('@/lib/resumeCompression', () => ({
  compressResumeData: (pd: unknown) => compressResumeData(pd),
  decompressResumeData: (cd: string) => decompressResumeData(cd),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Mods = Record<string, unknown>;
type HookEvent = {
  fire: (mods: Mods, primKey: number, obj: unknown, trans: unknown, extra: unknown) => Mods | void;
};

type CreateHookEvent = {
  fire: (primKey: number | undefined, obj: unknown, trans: unknown) => unknown;
};

/**
 * Dexie stores registered hooks on `table.hook.<event>`, where each event is
 * an Events object whose `fire()` chains every subscriber (hookUpdatingChain).
 * Narrow the live table to the resumes `updating` hook.
 */
function getResumesUpdatingHook(): HookEvent {
  // Dexie's Table/Events internals are not part of the public typings, so the
  // shape is validated at runtime below rather than asserted blindly.
  const table = db.resumes as unknown as { hook?: { updating?: unknown } };
  const event = table.hook?.updating;
  if (typeof event !== 'object' || event === null || !('fire' in event)) {
    throw new Error('resumes updating hook is not a Dexie hook event');
  }
  return event as HookEvent;
}

/**
 * Run the hook the way Dexie's hooksMiddleware does: the modifications object
 * doubles as the event `this`, and the hook's return value is merged into it.
 * Undefined-valued keys are exactly what Dexie turns into field deletions.
 */
function runUpdate(mods: Mods): Mods {
  const fired = getResumesUpdatingHook().fire.call({ ...mods }, mods, 1, {}, null, undefined);
  return { ...mods, ...(fired ?? {}) };
}

describe('db resumes updating hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compressResumeData.mockReturnValue('compressed-payload');
  });

  it('stores compressedData and deletes parsedData when compression succeeds', () => {
    const pd = { basics: { name: 'Ada' } };

    const mods = runUpdate({ parsedData: pd });

    expect(compressResumeData).toHaveBeenCalledWith(pd);
    expect(mods.compressedData).toBe('compressed-payload');
    expect('parsedData' in mods).toBe(true);
    expect(mods.parsedData).toBeUndefined();
  });

  it('keeps parsedData when compression fails (no data loss)', () => {
    compressResumeData.mockReturnValue(undefined);
    const pd = { basics: { name: 'Ada' } };

    const mods = runUpdate({ parsedData: pd });

    // Regression: a failed compression must not delete parsedData, since
    // Dexie treats `undefined` as a field deletion and no compressedData
    // would exist to restore from.
    expect('parsedData' in mods).toBe(true);
    expect(mods.parsedData).toBe(pd);
    expect('compressedData' in mods).toBe(false);
  });

  it('clears both compressedData and parsedData when parsedData is null', () => {
    const mods = runUpdate({ parsedData: null });

    expect(compressResumeData).not.toHaveBeenCalled();
    expect('compressedData' in mods).toBe(true);
    expect(mods.compressedData).toBeUndefined();
    expect('parsedData' in mods).toBe(true);
    expect(mods.parsedData).toBeUndefined();
  });

  it('leaves resume data untouched for updates that do not set parsedData', () => {
    const mods = runUpdate({ fileName: 'cv.pdf' });

    expect(compressResumeData).not.toHaveBeenCalled();
    expect('parsedData' in mods).toBe(false);
    expect('compressedData' in mods).toBe(false);
    expect(typeof mods.updatedAt).toBe('number');
  });
});

type ContentUpgrade = (tx: unknown) => Promise<void>;

type VersionConfig = { version?: number; contentUpgrade?: unknown };

/**
 * Extracts the one-shot `.upgrade()` function Dexie registered for schema
 * version 13 (`Version._cfg.contentUpgrade`; internals are not in the public
 * typings, so the shape is checked at runtime).
 */

function getV14ContentUpgrade(): ContentUpgrade {
  // Every version's `_cfg.contentUpgrade` is non-undefined (null unless an
  // `.upgrade()` was chained), so the version is selected by its number.
  const versions = (db as unknown as { _versions: { _cfg: VersionConfig }[] })._versions;
  const v14 = versions.find((v) => v._cfg.version === 14);
  const contentUpgrade = v14?._cfg.contentUpgrade;
  if (typeof contentUpgrade !== 'function') {
    throw new Error('no contentUpgrade registered on Dexie version 14');
  }
  return contentUpgrade as ContentUpgrade;
}

function makeUpgradeTx(rows: Record<string, unknown>[]) {
  return {
    table: () => ({
      toCollection: () => ({
        modify: async (cb: (r: Record<string, unknown>) => void) => {
          rows.forEach(cb);
        },
      }),
    }),
  };
}

describe('db v14 compression upgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compressResumeData.mockReturnValue('compressed-payload');
  });

  it('compresses existing parsedData and clears it', async () => {
    const pd = { basics: { name: 'Ada' } };
    const rows: Record<string, unknown>[] = [{ id: 1, parsedData: pd }];

    await getV14ContentUpgrade()(makeUpgradeTx(rows));

    expect(compressResumeData).toHaveBeenCalledWith(pd);
    expect(rows[0].compressedData).toBe('compressed-payload');
    expect('parsedData' in rows[0]).toBe(false);
  });

  it('keeps parsedData when compression fails (no data loss)', async () => {
    compressResumeData.mockReturnValue(undefined);
    const rows = [{ id: 1, parsedData: { basics: { name: 'Ada' } } }];

    await getV14ContentUpgrade()(makeUpgradeTx(rows));

    expect(rows[0].parsedData).toEqual({ basics: { name: 'Ada' } });
    expect('compressedData' in rows[0]).toBe(false);
  });

  it('leaves already-compressed and empty resumes alone', async () => {
    const rows = [{ id: 1, compressedData: 'already' }, { id: 2 }];

    await getV14ContentUpgrade()(makeUpgradeTx(rows));

    expect(compressResumeData).not.toHaveBeenCalled();
    expect(rows[0].compressedData).toBe('already');
    expect('parsedData' in rows[1]).toBe(false);
  });
});

/**
 * Dexie's `creating` hook receives the caller's own object: `Table.add` only
 * clones when the primary key is an undefined `keyPath` member, and
 * hooksMiddleware copies `req.values` without deep-cloning
 * (dexie.mjs `addPutOrDelete`). So the hook mutates the object the caller
 * still holds. Simulate the same `fire(ctx, key, obj)` call to pin that.
 */
function getResumesCreatingHook(): CreateHookEvent {
  const table = db.resumes as unknown as { hook?: { creating?: unknown } };
  const event = table.hook?.creating;
  if (typeof event !== 'object' || event === null || !('fire' in event)) {
    throw new Error('resumes creating hook is not a Dexie hook event');
  }
  return event as CreateHookEvent;
}

describe('db resumes creating hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compressResumeData.mockReturnValue('compressed-payload');
  });

  it('strips parsedData from the caller object and sets compressedData on it', () => {
    const callerObject = {
      fileName: 'cv.pdf',
      parsedData: { basics: { name: 'Ada' } },
    };

    getResumesCreatingHook().fire.call({}, undefined, callerObject, {});

    expect(compressResumeData).toHaveBeenCalledWith({ basics: { name: 'Ada' } });
    expect('parsedData' in callerObject).toBe(false);
    expect((callerObject as { compressedData?: string }).compressedData).toBe('compressed-payload');
  });

  it('leaves parsedData on the caller object when compression fails', () => {
    compressResumeData.mockReturnValue(undefined);
    const parsedData = { basics: { name: 'Ada' } };
    const callerObject = { fileName: 'cv.pdf', parsedData };

    getResumesCreatingHook().fire.call({}, undefined, callerObject, {});

    expect(callerObject.parsedData).toBe(parsedData);
    expect('compressedData' in callerObject).toBe(false);
  });
});

type ReadHookEvent = {
  fire: (obj: unknown) => unknown;
};

function getResumesReadingHook(): ReadHookEvent {
  const table = db.resumes as unknown as { hook?: { reading?: unknown } };
  const event = table.hook?.reading;
  if (typeof event !== 'object' || event === null || !('fire' in event)) {
    throw new Error('resumes reading hook is not a Dexie hook event');
  }
  return event as ReadHookEvent;
}

describe('db resumes reading hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heals a stored row whose parsedData lacks basics and section arrays', () => {
    const row = { id: 1, fileName: 'cv.pdf', parsedData: { work: [{ name: 'Acme' }] } };
    const healed = getResumesReadingHook().fire(row) as {
      parsedData: {
        basics: { name: string; email: string; label: string; summary: string };
        work: unknown[];
        education: unknown[];
        skills: unknown[];
        projects: unknown[];
      };
    };

    expect(healed.parsedData.basics).toEqual({ name: '', email: '', label: '', summary: '' });
    expect(healed.parsedData.education).toEqual([]);
    expect(healed.parsedData.skills).toEqual([]);
    expect(healed.parsedData.projects).toEqual([]);
    // Existing content is preserved, not overwritten by defaults.
    expect(healed.parsedData.work).toEqual([{ name: 'Acme' }]);
  });

  it('returns the row (never undefined) when there is no parsedData to heal', () => {
    decompressResumeData.mockReturnValue(undefined);
    const row = { id: 2, fileName: 'cv.pdf', compressedData: 'blob' };

    const result = getResumesReadingHook().fire(row);

    // Guards the `return obj;` contract — a missing return drops the record.
    expect(result).toBe(row);
  });
});
