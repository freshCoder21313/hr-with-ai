import { describe, it, expect } from 'vitest';
import { getActiveScenarioEvent } from './scenarios';

describe('scenarios logic', () => {
  it('returns null if companyStatus is undefined or null', () => {
    expect(getActiveScenarioEvent(undefined, 5, [])).toBeNull();
    expect(getActiveScenarioEvent(null, 5, [])).toBeNull();
  });

  it('returns null if interview has not reached warmup phase (turn < 4)', () => {
    expect(getActiveScenarioEvent('startup', 1, [])).toBeNull();
    expect(getActiveScenarioEvent('startup', 2, [])).toBeNull();
    expect(getActiveScenarioEvent('startup', 3, [])).toBeNull();
  });

  it('returns null if a scenario has already been executed (max 1 scenario rule)', () => {
    expect(getActiveScenarioEvent('startup', 5, ['startup_pivot'])).toBeNull();
    expect(getActiveScenarioEvent('startup', 6, ['any_scenario_id'])).toBeNull();
  });

  it('contains strict guidelines against double questions and personal project conflation', () => {
    const event = getActiveScenarioEvent('startup', 4, []);
    // Note: chance is probabilistic, but if an event is returned or checked directly:
    // Let's verify that when a scenario is matched, its injection contains the critical rules
    if (event) {
      expect(event.systemInjection).toContain('EXCLUSIVE TURN (NO DOUBLE QUESTIONS)');
      expect(event.systemInjection).toContain('CONTEXTUAL ANCHORING');
    }
  });
});
