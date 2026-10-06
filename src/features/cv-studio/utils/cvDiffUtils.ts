export interface BulletDiffItem {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export function computeBulletDiff(
  oldBullets: string[] = [],
  newBullets: string[] = []
): BulletDiffItem[] {
  const oldTrimmed = oldBullets.map((b) => String(b).trim()).filter(Boolean);
  const newTrimmed = newBullets.map((b) => String(b).trim()).filter(Boolean);

  const oldSet = new Set(oldTrimmed);
  const newSet = new Set(newTrimmed);

  const diffs: BulletDiffItem[] = [];

  // Items that were removed or changed from previous version
  oldTrimmed.forEach((text) => {
    if (!newSet.has(text)) {
      diffs.push({ type: 'removed', text });
    }
  });

  // Items in new list: unchanged or newly added
  newTrimmed.forEach((text) => {
    if (oldSet.has(text)) {
      diffs.push({ type: 'unchanged', text });
    } else {
      diffs.push({ type: 'added', text });
    }
  });

  return diffs;
}

export interface KeywordDiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export function computeKeywordDiff(
  oldKeywords: string[] = [],
  newKeywords: string[] = []
): KeywordDiffResult {
  const norm = (s: unknown) => String(s).trim().toLowerCase();
  const oldMap = new Map(oldKeywords.map((k) => [norm(k), String(k).trim()]));
  const newMap = new Map(newKeywords.map((k) => [norm(k), String(k).trim()]));

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  oldKeywords.forEach((k) => {
    const n = norm(k);
    if (!newMap.has(n)) {
      removed.push(String(k).trim());
    }
  });

  newKeywords.forEach((k) => {
    const n = norm(k);
    if (oldMap.has(n)) {
      unchanged.push(String(k).trim());
    } else {
      added.push(String(k).trim());
    }
  });

  return { added, removed, unchanged };
}

export interface FieldDiff {
  field: string;
  type: 'bullets' | 'keywords' | 'text' | 'general';
  oldValue: unknown;
  newValue: unknown;
  bulletDiff?: BulletDiffItem[];
  keywordDiff?: KeywordDiffResult;
}

export function computeItemFieldDiffs(
  oldItem: Record<string, unknown> | undefined,
  newItem: Record<string, unknown>
): FieldDiff[] {
  if (!oldItem) return [];

  const diffs: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)]);
  const ignoredKeys = new Set(['id', '_id', 'order']);

  allKeys.forEach((key) => {
    if (ignoredKeys.has(key)) return;
    const oldVal = oldItem[key];
    const newVal = newItem[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return;

    if (key === 'highlights' && (Array.isArray(oldVal) || Array.isArray(newVal))) {
      const oldArr = Array.isArray(oldVal) ? (oldVal as string[]) : [];
      const newArr = Array.isArray(newVal) ? (newVal as string[]) : [];
      const bulletDiff = computeBulletDiff(oldArr, newArr);
      diffs.push({
        field: key,
        type: 'bullets',
        oldValue: oldVal,
        newValue: newVal,
        bulletDiff,
      });
    } else if (key === 'keywords' && (Array.isArray(oldVal) || Array.isArray(newVal))) {
      const oldArr = Array.isArray(oldVal) ? (oldVal as string[]) : [];
      const newArr = Array.isArray(newVal) ? (newVal as string[]) : [];
      const keywordDiff = computeKeywordDiff(oldArr, newArr);
      diffs.push({
        field: key,
        type: 'keywords',
        oldValue: oldVal,
        newValue: newVal,
        keywordDiff,
      });
    } else {
      diffs.push({
        field: key,
        type: typeof newVal === 'string' && typeof oldVal === 'string' ? 'text' : 'general',
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  });

  return diffs;
}

export interface ObjectFieldDiff {
  key: string;
  status: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

export function computeObjectDiff(
  oldObj: Record<string, unknown> | undefined,
  newObj: Record<string, unknown>
): ObjectFieldDiff[] {
  const result: ObjectFieldDiff[] = [];
  const oldRecord = oldObj || {};
  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    const hasOld =
      key in oldRecord &&
      oldRecord[key] !== undefined &&
      oldRecord[key] !== null &&
      oldRecord[key] !== '';
    const hasNew =
      key in newObj && newObj[key] !== undefined && newObj[key] !== null && newObj[key] !== '';

    if (!hasOld && hasNew) {
      result.push({ key, status: 'added', newValue: newObj[key] });
    } else if (hasOld && !hasNew) {
      result.push({ key, status: 'removed', oldValue: oldRecord[key] });
    } else if (hasOld && hasNew) {
      if (JSON.stringify(oldRecord[key]) !== JSON.stringify(newObj[key])) {
        result.push({
          key,
          status: 'modified',
          oldValue: oldRecord[key],
          newValue: newObj[key],
        });
      }
    }
  });

  return result;
}
