/**
 * Key-order-stable serialization for structured fact payloads.
 *
 * JSON.stringify({a:1,b:2}) !== JSON.stringify({b:2,a:1}) despite semantic
 * equality, which produced false `conflicting` verdicts. Sorting keys
 * recursively makes the comparison deterministic.
 *
 * Shared by jdMatching (RequirementMatch) and questionEngine
 * (detectKnowledgeGaps) so both engines use identical conflict semantics.
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function areStructuredEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a ?? {}) === stableStringify(b ?? {});
}

/**
 * Unified contradiction check used by both jdMatching and questionEngine.
 *
 * - When both facts carry a non-empty structured payload, the payloads are
 *   the machine-comparable source of truth: conflict iff they differ
 *   (key-order-stable, so wording/key-order variants don't false-conflict).
 * - When either side has no structured payload, fall back to the
 *   human-readable claim: conflict iff claims differ. Without this fallback,
 *   pure-claim contradictions (no structured data on either side) would slip
 *   through as satisfied.
 */
export function areFactsContradictory(
  a: { claim: string; structured?: Record<string, unknown> },
  b: { claim: string; structured?: Record<string, unknown> }
): boolean {
  const aHas = !!a.structured && Object.keys(a.structured).length > 0;
  const bHas = !!b.structured && Object.keys(b.structured).length > 0;
  if (aHas && bHas) {
    return !areStructuredEqual(a.structured, b.structured);
  }
  return a.claim.toLowerCase().trim() !== b.claim.toLowerCase().trim();
}
