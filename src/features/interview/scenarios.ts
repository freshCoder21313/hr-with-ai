export interface ScenarioEvent {
  id: string;
  triggerKeywords: string[]; // Keywords in 'companyStatus' that trigger this scenario category
  minTurn: number; // Minimum number of exchanges before this can happen
  chance: number; // 0.0 to 1.0 probability per turn
  systemInjection: string; // The secret instruction sent to AI
}

export const HIDDEN_SCENARIOS: ScenarioEvent[] = [
  // --- STARTUP / URGENT MODE SCENARIOS ---
  {
    id: 'startup_pivot',
    triggerKeywords: ['startup', 'urgent', 'gấp', 'nhanh', 'fast', 'growth'],
    minTurn: 3,
    chance: 0.3,
    systemInjection: `
    [SYSTEM EVENT: SUDDEN PIVOT]
    ACT OUT THIS SCENARIO: You just received a message from the Founder. 
    The requirement has changed immediately. 
    - If asking about Frontend: We need to switch to Mobile (React Native) instantly.
    - If asking about Backend: The current DB is too slow, we need to migrate to NoSQL now.
    
    INTERRUPTION: Interrupt the candidate politely but firmly. 
    "Sorry to interrupt, but I just got an update from the team. We have a situation..."
    Ask them how they would handle this sudden change in direction.
    `,
  },
  {
    id: 'startup_fire',
    triggerKeywords: ['startup', 'urgent', 'gấp', 'nhanh', 'fast', 'growth'],
    minTurn: 5,
    chance: 0.2,
    systemInjection: `
    [SYSTEM EVENT: PRODUCTION INCIDENT]
    ACT OUT THIS SCENARIO: Our production server just crashed.
    Users are reporting 500 Errors on the payment page.
    Stop the theoretical interview. Ask the candidate specifically: "How would you debug this RIGHT NOW? What logs do you check first?"
    Press them for speed.
    `,
  },

  // --- BIG CORP / STANDARD SCENARIOS ---
  {
    id: 'corp_bureaucracy',
    triggerKeywords: ['corporation', 'big', 'standard', 'lớn', 'ổn định', 'stable'],
    minTurn: 3,
    chance: 0.3,
    systemInjection: `
    [SYSTEM EVENT: BUREAUCRACY BLOCKER]
    ACT OUT THIS SCENARIO: The solution the candidate just proposed was rejected by the Security/Compliance Team.
    Tell them: "That sounds good technically, but our Security team says it violates ISO 27001 compliance regarding data privacy."
    Ask them how they would modify the design to satisfy a strict security review, even if it hurts performance.
    `,
  },
  {
    id: 'corp_conflict',
    triggerKeywords: ['corporation', 'big', 'standard', 'lớn', 'ổn định', 'stable'],
    minTurn: 4,
    chance: 0.2,
    systemInjection: `
    [SYSTEM EVENT: STAKEHOLDER CONFLICT]
    ACT OUT THIS SCENARIO: Play the role of a difficult Product Manager ("The PM").
    Tell them: "I understand your technical point, but the PM insists this feature must launch tomorrow, even with technical debt."
    Ask them: "Do you push back and delay launch for code quality, or do you ship it? Explain your negotiation strategy."
    `,
  },

  // --- GENERAL / TOXIC SCENARIOS (Low chance) ---
  {
    id: 'general_misunderstanding',
    triggerKeywords: [], // Fits all
    minTurn: 4,
    chance: 0.1,
    systemInjection: `
    [SYSTEM EVENT: MISUNDERSTANDING]
    ACT OUT THIS SCENARIO: Intentionally misunderstand what the candidate just said.
    Rephrase their answer incorrectly and ask: "So you are saying [Wrong Interpretation], right?"
    See if they have the communication skills to correct you politely and clearly without getting frustrated.
    `,
  },
];

export const getActiveScenario = (
  companyStatus: string | undefined | null,
  currentTurn: number
): string | null => {
  if (!companyStatus || typeof companyStatus !== 'string') return null;

  const normalizedStatus = companyStatus.toLowerCase();

  // Filter scenarios that match the status OR have no keywords (general)
  const candidates = HIDDEN_SCENARIOS.filter(
    (s) =>
      (s.triggerKeywords.length === 0 ||
        s.triggerKeywords.some((k) => normalizedStatus.includes(k))) &&
      currentTurn >= s.minTurn
  );

  // Roll dice
  for (const scenario of candidates) {
    if (Math.random() < scenario.chance) {
      return scenario.systemInjection;
    }
  }

  return null;
};
