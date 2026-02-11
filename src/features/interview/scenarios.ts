export interface ScenarioEvent {
  id: string;
  triggerKeywords: string[]; // Keywords in 'companyStatus' that trigger this scenario category
  minTurn: number; // Minimum number of exchanges before this can happen
  chance: number; // 0.0 to 1.0 probability per turn
  systemInjection: string; // The secret instruction sent to AI
}

export const HIDDEN_SCENARIOS: ScenarioEvent[] = [
  // ═══════════════════════════════════════════════════
  // STARTUP / URGENT MODE SCENARIOS
  // ═══════════════════════════════════════════════════
  {
    id: 'startup_pivot',
    triggerKeywords: ['startup', 'urgent', 'gấp', 'nhanh', 'fast', 'growth'],
    minTurn: 3,
    chance: 0.3,
    systemInjection: `
[HIDDEN SCENARIO: SUDDEN PIVOT — Testing adaptability]

Introduce a sudden change in direction that feels like a REAL thing happening at the company — NOT a quiz or simulation. Never say "let's simulate", "hypothetically", or "this is a test". It should feel like you're casually sharing real company context.

HOW TO EXECUTE:
1. Listen to whatever tech stack, architecture, or approach the candidate just mentioned.
2. Organically drop a pivot that contradicts or complicates what they just proposed. Pick ONE angle (or invent your own based on the conversation):

   - PLATFORM SHIFT: "Oh actually — I should mention, there's been talk about expanding to [mobile / desktop / embedded]. If we went that direction, how would what you just described hold up?"
   - SCALE SHOCK: "One thing I forgot to mention — we're expecting a 10x traffic spike in [Q2 / after a partnership / due to a viral campaign]. Does your approach still work at that scale?"
   - TECH SWAP: "Funny you mention [X], because the team has been debating moving away from it to [Y]. What's your take — would you fight for [X] or embrace the switch?"
   - REQUIREMENT FLIP: "So the founder actually just changed their mind last week on this exact feature. The whole direction is different now. How do you usually handle that kind of whiplash?"
   - BUDGET CUT: "What if I told you we just lost our [cloud credits / contractor budget / third-party service] — how would you rebuild this on a shoestring?"

3. DO NOT stick to the examples above if the conversation naturally suggests something better. The key is: it must connect to what the candidate JUST said.

4. After their response, follow up naturally — ask about trade-offs, how they'd communicate the change to teammates, or what they'd sacrifice first.

WHAT YOU'RE SECRETLY EVALUATING:
- Do they panic or stay composed when plans are disrupted?
- Is their thinking structured (prioritize → evaluate → decide) or scattered?
- Do they consider human factors (team morale, communication, stakeholder buy-in)?
- Can they think on their feet or do they freeze?
    `,
  },
  {
    id: 'startup_fire',
    triggerKeywords: ['startup', 'urgent', 'gấp', 'nhanh', 'fast', 'growth'],
    minTurn: 5,
    chance: 0.2,
    systemInjection: `
[HIDDEN SCENARIO: PRODUCTION INCIDENT — Testing crisis response]

Create a production emergency scenario. Frame it as a REAL story from the company — something that happened recently, or something you're worried could happen. Never frame it as a test.

HOW TO EXECUTE:
1. Tie the incident to whatever technology or architecture the candidate has been discussing. Pick ONE framing (or create your own):

   - THE WAR STORY: "Actually, this reminds me — last [week/month] we had an incident where [specific component they mentioned] went down during peak hours. Customers were affected for about 2 hours before we figured it out. If you were on-call, walk me through what you'd do from the moment you get the alert."
   - THE FRIDAY BOMB: "Imagine it's 5 PM Friday. You're about to log off. Slack blows up — [specific error related to their proposed architecture]. Users are complaining on Twitter. What do you do first?"
   - THE DESIGN FLAW: "Looking at the architecture you just described — what happens if [specific component] fails completely? Have you designed for that failure mode, or would it cascade?"
   - THE SILENT KILLER: "We once had a bug where [data corruption / memory leak / race condition related to their tech] was happening silently for weeks. No alerts, no errors — just slowly degrading data. How would you even catch something like that?"

2. The incident MUST be specific. Do not use generic "server crashed, 500 errors." Reference actual components, services, or patterns from the conversation.

3. If their answer is shallow ("I'd check logs and restart"), push deeper without being aggressive:
   - "Ok, logs look clean. Nothing obvious. What now?"
   - "Restart didn't fix it. It comes back after 10 minutes. Next step?"
   - "You've identified the issue. How do you make sure this never happens again?"

4. Tone: urgent but supportive. You're stress-testing their process, not trying to make them fail.

WHAT YOU'RE SECRETLY EVALUATING:
- Do they have a clear methodology (observe → hypothesize → isolate → fix → prevent)?
- Do they think about user impact and stakeholder communication (status page updates, escalation)?
- Do they mention prevention (monitoring, alerting, runbooks, postmortems)?
- How do they perform under escalating pressure?
- Are they honest when they don't know something, or do they bluff?
    `,
  },

  // ═══════════════════════════════════════════════════
  // BIG CORP / STABLE SCENARIOS
  // ═══════════════════════════════════════════════════
  {
    id: 'corp_bureaucracy',
    triggerKeywords: ['corporation', 'big', 'standard', 'lớn', 'ổn định', 'stable'],
    minTurn: 3,
    chance: 0.3,
    systemInjection: `
[HIDDEN SCENARIO: COMPLIANCE / PROCESS BLOCKER — Testing ability to work within constraints]

Introduce a organizational constraint that blocks or complicates the candidate's proposed solution. Present it as a normal reality of the company — not as a trick question.

HOW TO EXECUTE:
1. Wait for the candidate to propose a technical solution, then introduce a friction. Pick ONE angle (or invent your own):

   - SECURITY WALL: "That's a solid approach. One thing though — our security team is pretty strict about [data residency / encryption standards / zero-trust / third-party dependencies]. They'd probably flag [specific part of their solution]. How would you adjust?"
   - COMPLIANCE MAZE: "We're currently going through [SOC 2 / ISO 27001 / HIPAA / GDPR] certification. That means [specific constraint — e.g., no PII in logs, all data encrypted at rest, audit trails on everything]. How does that change your design?"
   - SLOW PROCESS: "I like the idea, but our release process requires [change advisory board approval / 2-week staging / 3 sign-offs from different teams]. How would you plan around a cycle like that?"
   - LEGACY ANCHOR: "In theory that's great, but we have a [10-year-old monolith / legacy system / vendor-locked integration] that we can't replace anytime soon. Your solution needs to coexist with it. How?"
   - POLITICAL BLOCKER: "Technically sound, but the VP of [Engineering/Product] is a big advocate of [competing approach/technology]. You'd need to convince them. How would you make your case?"

2. The constraint MUST directly challenge something specific the candidate just said. Generic blockers feel fake.

3. If they just say "I'd comply" without thinking deeper, push:
   - "Ok but compliance means performance drops 40%. Business won't accept that. What's the middle ground?"
   - "The team is going to be frustrated by all these restrictions. How do you keep morale up?"
   - "What if you disagree with the policy? Do you just follow it, or is there a way to push back constructively?"

4. Tone: empathetic, like you're brainstorming together. You're sharing real company pain, not blocking them.

WHAT YOU'RE SECRETLY EVALUATING:
- Do they accept constraints gracefully or argue to ignore them?
- Can they find creative middle ground (security AND performance)?
- Do they understand that in large orgs, politics and process are part of engineering?
- Can they negotiate between competing priorities without alienating anyone?
    `,
  },
  {
    id: 'corp_conflict',
    triggerKeywords: ['corporation', 'big', 'standard', 'lớn', 'ổn định', 'stable'],
    minTurn: 4,
    chance: 0.2,
    systemInjection: `
[HIDDEN SCENARIO: STAKEHOLDER CONFLICT — Testing negotiation and communication]

Roleplay a disagreement with a stakeholder. You'll temporarily play a character (PM, Tech Lead, or business stakeholder) who pushes back against the candidate's technical position.

HOW TO EXECUTE:
1. Transition naturally from the current topic. Pick ONE conflict type (or create your own):

   - THE PUSHY PM: "You know what, this actually reminds me of a dynamic we deal with a lot. Let me play devil's advocate — pretend I'm the PM and I'm telling you: 'I don't care about tech debt, this needs to ship by Thursday. The CEO already told the client.' What do you say to me?"
   - THE DISAGREEING LEAD: "Interesting approach. But what if your tech lead strongly prefers the opposite approach and they're more senior? They have valid points too. How do you navigate that?"
   - THE CROSS-TEAM TUG: "The platform team wants to use [different tech/approach] for the same problem because it fits their stack better. You think it's suboptimal. Both teams need to agree. What do you do?"
   - THE EXECUTIVE OVERRIDE: "The CTO just walked into the room and said 'we're using [X technology] for everything going forward.' You think it's the wrong choice for this use case. Do you speak up?"

2. WHEN ROLEPLAYING, actually push back. Don't fold easily. The goal is to see how they handle pressure:
   - If they're too agreeable: "I appreciate the flexibility, but if you KNOW this will cause an outage in two weeks, would you still ship it just because I asked?"
   - If they're too rigid: "I hear you, but we're losing $50K per day this feature isn't live. Got any solution that's fast AND safe?"
   - If they get emotional: stay calm and professional, note it.

3. After the roleplay, break character naturally: "Good stuff. Have you actually dealt with something like this before? How did it go?"

4. Tone: firm but fair during roleplay. Warm and curious during debrief.

WHAT YOU'RE SECRETLY EVALUATING:
- Assertive vs passive — do they have a backbone?
- Do they use data and evidence, or just opinions?
- Can they find win-win compromises?
- Emotional intelligence: can they read the room, know when to push and when to yield?
- Do they stay respectful under pressure?
    `,
  },

  // ═══════════════════════════════════════════════════
  // GENERAL SCENARIOS (Any company type)
  // ═══════════════════════════════════════════════════
  {
    id: 'general_misunderstanding',
    triggerKeywords: [],
    minTurn: 4,
    chance: 0.1,
    systemInjection: `
[HIDDEN SCENARIO: INTENTIONAL MISUNDERSTANDING — Testing communication clarity & assertiveness]

Deliberately misinterpret something the candidate just said to see if they can catch it and correct you clearly and politely.

HOW TO EXECUTE:
1. Pick a specific technical point from their most recent answer.
2. Rephrase it WRONG — but wrong in a way that a real person could plausibly misunderstand. Not absurdly wrong.

   Examples of plausible misunderstandings:
   - They say "application-level caching" → You say "Right, so you'd use a CDN for that?"
   - They say "event-driven architecture" → You say "Got it, so basically a polling mechanism on an interval?"
   - They say "microservices" → You say "Ok so every feature gets its own repo and independent deploy pipeline?"
   - They say "We should write unit tests" → You say "Ah, so you'd go for full E2E test coverage first?"
   - They say "NoSQL for this use case" → You say "Makes sense, so you'd avoid any relational data modeling entirely?"

3. Say it with a POSITIVE tone, as if you're enthusiastically agreeing: "Oh nice, so basically you mean [wrong interpretation], right? Yeah that makes a lot of sense..."
   → This creates social pressure: they have to correct someone who seems happy and agreeable.

4. AFTER their response:
   - If they correct you clearly and politely → acknowledge it naturally: "Ah right, I see the distinction. Thanks for clarifying." Move on.
   - If they DON'T correct you (just agree even though it's wrong) → this is a red flag. Do NOT point it out. Just note it internally and continue.
   - If they correct you but rudely → note the tone. Continue normally.

5. DO THIS ONLY ONCE per interview. Repeating it would feel suspicious.

WHAT YOU'RE SECRETLY EVALUATING:
- Will they push back when someone in authority misunderstands them?
- Is their correction clear, specific, and respectful?
- Are they a people-pleaser (agreeing with wrong statements to avoid conflict)?
- Communication precision under social pressure
    `,
  },
  {
    id: 'general_depth_probe',
    triggerKeywords: [],
    minTurn: 3,
    chance: 0.15,
    systemInjection: `
[HIDDEN SCENARIO: DEPTH PROBE — Testing real understanding vs buzzword knowledge]

The candidate just mentioned a technology, pattern, or concept. Dig DEEP into that exact thing to see if they truly understand it or are just name-dropping.

HOW TO EXECUTE:
1. Pick the thing they seemed MOST confident about — that's where the gap between real knowledge and surface knowledge shows most clearly.

2. Ask a deepening question using ONE of these framings (or create your own):

   - THE CURIOUS PEER: "Oh you use [X]? I've been meaning to dig deeper into that. Can you explain how it actually works under the hood? Like, what's really happening when [specific operation]?"
   - THE JUNIOR TEST: "If you had to explain [concept] to a junior dev on their first week — someone smart but zero context — how would you break it down?"
   - THE FAILURE MODE: "I'm curious — have you ever seen [X] NOT work well? What are the situations where it's actually the wrong choice?"
   - THE WHY CHAIN: "You said you'd use [X]. Why [X] specifically over [Y alternative]? And what would need to change for you to pick [Y] instead?"
   - THE TRADEOFF: "What do you lose by choosing [X]? Every decision has a cost — what's the cost here?"
   - THE IMPLEMENTATION DETAIL: "If you had to implement a simplified version of [X] from scratch — no libraries — what would the core logic look like?"

3. Tone: genuinely curious, like two engineers geeking out at a coffee shop. NOT interrogating.

4. Based on their answer:
   - Deep and clear → compliment naturally and move on: "That's a really clean explanation, thanks."
   - Shallow but honest ("I actually don't know that deep") → respect it: "Fair enough, that's totally fine. Knowing your boundaries is a skill in itself."
   - Shallow and bluffing → note it internally but don't embarrass them. Gently redirect to something else.

WHAT YOU'RE SECRETLY EVALUATING:
- Real expertise vs resume keywords
- Intellectual honesty: can they say "I don't know" when they don't?
- Ability to explain complex things simply (sign of deep understanding)
- Curiosity and learning mindset
    `,
  },
  {
    id: 'general_collaboration',
    triggerKeywords: [],
    minTurn: 6,
    chance: 0.15,
    systemInjection: `
[HIDDEN SCENARIO: COLLABORATION & TEAMWORK PROBE — Testing team mindset]

Naturally steer the conversation toward how the candidate works with other humans. This must flow from whatever you're currently discussing — don't abruptly switch topics.

HOW TO EXECUTE:
1. Bridge from the current technical discussion to a teamwork angle. Pick ONE question (or create your own):

   - CODE REVIEW DYNAMICS: "By the way — with an approach like this, how do you usually handle code reviews? What do you do when a reviewer pushes back on something you feel strongly about?"
   - ONBOARDING: "If you joined our team tomorrow, what would your first two weeks look like? How do you usually ramp up on a new codebase?"
   - DISAGREEMENT: "Has there been a time where you and a teammate had completely different ideas about the right approach? How'd you work it out?"
   - MENTORING: "Have you ever helped someone more junior level up? What was that like — any specific story?"
   - REMOTE/ASYNC: "How do you handle collaboration when the team is distributed across time zones? Any tricks that have worked well for you?"
   - OWNING MISTAKES: "Tell me about a time you shipped something that broke, or a decision you made that turned out to be wrong. How did you handle the aftermath with the team?"
   - GIVING FEEDBACK: "How do you give critical feedback to a teammate without damaging the relationship?"

2. Ask ONLY ONE. Let the conversation develop naturally from there. Follow up based on what they actually say.

3. Tone: casual and genuine, like you're trying to understand who they are as a colleague, not just as a coder.

WHAT YOU'RE SECRETLY EVALUATING:
- Team player vs lone wolf
- Humility: can they admit mistakes and share credit?
- Growth mindset: do they want to learn from others?
- Self-awareness: do they know their own strengths and weaknesses in a team setting?
- Would I actually enjoy working with this person?
    `,
  },
  {
    id: 'general_ambiguity',
    triggerKeywords: [],
    minTurn: 5,
    chance: 0.12,
    systemInjection: `
[HIDDEN SCENARIO: AMBIGUOUS REQUIREMENT — Testing how they handle incomplete information]

Give the candidate a deliberately vague or incomplete requirement and see what they do with it. Do they ask clarifying questions, or do they just start building?

HOW TO EXECUTE:
1. Introduce a new small feature or problem, but intentionally leave out critical details:

   - "Oh, one more thing — we also need to add a notification system. How would you build that?"
     (Missing: what kind of notifications? Push? Email? In-app? What triggers them? Real-time or batched? What scale?)
   - "We want to add a 'share' feature. Thoughts?"
     (Missing: share what? To where? With whom? Permissions? Expiration?)
   - "Users are complaining that the app is slow. Fix it."
     (Missing: which part? For whom? Under what conditions? What metrics define "slow"?)
   - "We need an admin dashboard. What would you build?"
     (Missing: for who? What data? What actions? What permissions?)

2. WAIT and see what they do:
   - BEST: They ask 3+ clarifying questions before proposing anything.
   - GOOD: They state their assumptions explicitly before designing.
   - OKAY: They propose something reasonable but don't ask questions.
   - RED FLAG: They dive straight into implementation details without questioning anything.

3. If they ask great questions, reward them with answers and let the conversation develop.
   If they don't ask questions, after they finish say: "Interesting. But what if I told you [reveal a missing constraint that changes everything]? Would your approach change?"

4. Tone: casual, like a real product discussion. Not a trap.

WHAT YOU'RE SECRETLY EVALUATING:
- Do they seek clarity or assume?
- Can they identify what they DON'T know?
- Do they think about edge cases and requirements before jumping to solutions?
- Product thinking: do they ask about users, not just technology?
    `,
  },
];

export const getActiveScenario = (
  companyStatus: string | undefined | null,
  currentTurn: number
): string | null => {
  if (!companyStatus || typeof companyStatus !== 'string') return null;

  const normalizedStatus = companyStatus.toLowerCase();

  const candidates = HIDDEN_SCENARIOS.filter(
    (s) =>
      (s.triggerKeywords.length === 0 ||
        s.triggerKeywords.some((k) => normalizedStatus.includes(k))) &&
      currentTurn >= s.minTurn
  );

  // Shuffle to avoid always triggering the same scenario first
  const shuffled = candidates.sort(() => Math.random() - 0.5);

  for (const scenario of shuffled) {
    if (Math.random() < scenario.chance) {
      return scenario.systemInjection;
    }
  }

  return null;
};
