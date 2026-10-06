// Phase 12 Adversarial Test Fixtures
//
// 12 intentionally unsafe model outputs designed to trigger each layer's detection:
// - unsupported skill
// - unsupported employer
// - invented metric
// - inflated metric
// - strengthened leadership claim
// - invented seniority
// - invented production scale
// - unsupported certification
// - foreign-profile fact ID
// - unconfirmed fact ID
// - superseded fact ID
// - missing-requirement claim

import type {
  CareerFact,
  JDMatchReport,
  TailoringAdversarialFixture,
} from '@/types/careerKnowledge';

const PROFILE_ID = 'profile-adversarial-alpha';
const FOREIGN_PROFILE_ID = 'profile-adversarial-foreign';

const baseFacts: CareerFact[] = [
  {
    id: 'fact-adv-go',
    profileId: PROFILE_ID,
    category: 'skill',
    subject: 'Go',
    claim: 'Worked on Go backend services for 3 years at Acme Corp handling 2M requests/day',
    structured: { skill: 'Go', years: 3, company: 'Acme Corp' },
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fact-adv-acme',
    profileId: PROFILE_ID,
    category: 'experience',
    subject: 'Acme Corp',
    claim: 'Software Engineer at Acme Corp from 2022-01 to 2024-01',
    structured: {
      company: 'Acme Corp',
      role: 'Software Engineer',
      startDate: '2022-01',
      endDate: '2024-01',
    },
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fact-adv-unconfirmed-k8s',
    profileId: PROFILE_ID,
    category: 'skill',
    subject: 'Kubernetes',
    claim: 'Observed Kubernetes configs in public repository',
    verificationState: 'needs_confirmation',
    origin: 'external',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fact-adv-superseded-py',
    profileId: PROFILE_ID,
    category: 'skill',
    subject: 'Python',
    claim: 'Junior Python programmer',
    verificationState: 'confirmed',
    origin: 'user',
    supersededBy: 'fact-adv-new-py',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'fact-adv-foreign-rust',
    profileId: FOREIGN_PROFILE_ID,
    category: 'skill',
    subject: 'Rust',
    claim: 'Senior Rust Systems Developer',
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const baseMatchReport: JDMatchReport = {
  profileId: PROFILE_ID,
  matchedAt: '2026-01-01T00:00:00Z',
  results: [
    {
      requirement: {
        id: 'req:adv-1',
        key: 'go',
        category: 'skill',
        description: 'Go backend experience',
      },
      status: 'satisfied',
      matchingFactIds: ['fact-adv-go'],
      matchingEvidenceIds: [],
      explanation: 'Confirmed Go experience',
    },
    {
      requirement: {
        id: 'req:adv-2',
        key: 'software_engineering',
        category: 'experience',
        description: 'Software engineering experience',
      },
      status: 'satisfied',
      matchingFactIds: ['fact-adv-acme'],
      matchingEvidenceIds: [],
      explanation: 'Confirmed software engineering experience at Acme Corp',
    },
    {
      requirement: {
        id: 'req:adv-3',
        key: 'terraform',
        category: 'skill',
        description: 'Terraform IaC',
      },
      status: 'missing',
      matchingFactIds: [],
      matchingEvidenceIds: [],
      explanation: 'No confirmed Terraform facts',
    },
  ],
  summary: { total: 3, satisfied: 2, uncertain: 0, missing: 1, conflicting: 0, unsupported: 0 },
};

export const adversarialFixtures: TailoringAdversarialFixture[] = [
  // 1. Unsupported Skill (Inventing Rust when only Go is confirmed)
  {
    id: 'adv-01-unsupported-skill',
    name: 'Unsupported Skill Invention',
    category: 'unsupported_skill',
    description: 'AI invents Rust skill when candidate only has confirmed Go experience.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'entityFidelityPass',
    unsafeResponse: {
      skills: [
        { name: 'Rust', keywords: ['Systems Programming'], derivedFromFactIds: ['fact-adv-go'] },
      ],
    },
  },

  // 2. Unsupported Employer (Company A -> Company B)
  {
    id: 'adv-02-unsupported-employer',
    name: 'Unsupported Employer Invention',
    category: 'unsupported_employer',
    description: 'AI changes employer name from Acme Corp to Google.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'entityFidelityPass',
    unsafeResponse: {
      work: [
        {
          name: 'Google LLC',
          position: 'Software Engineer',
          startDate: '2022-01',
          endDate: '2024-01',
          derivedFromFactIds: ['fact-adv-acme'],
        },
      ],
    },
  },

  // 3. Invented Metric (Inventing 10M users when no users metric in facts)
  {
    id: 'adv-03-invented-metric',
    name: 'Invented Numeric Metric',
    category: 'invented_metric',
    description: 'AI invents 10M users metric without source support.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'numericFidelityPass',
    unsafeResponse: {
      summary: {
        text: 'Software Engineer with experience serving 10M users in production.',
        derivedFromFactIds: ['fact-adv-go'],
      },
    },
  },

  // 4. Inflated Metric (2M -> 20M, 3 years -> 5 years)
  {
    id: 'adv-04-inflated-metric',
    name: 'Inflated Metric Multiplier',
    category: 'inflated_metric',
    description: 'AI inflates 2M requests/day to 20M requests/day.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'numericFidelityPass',
    unsafeResponse: {
      work: [
        {
          name: 'Acme Corp',
          position: 'Software Engineer',
          highlights: ['Engineered Go services handling 20M requests/day.'],
          derivedFromFactIds: ['fact-adv-go'],
        },
      ],
    },
  },

  // 5. Strengthened Leadership Claim ("worked on" -> "led the architecture of")
  {
    id: 'adv-05-strengthened-leadership',
    name: 'Responsibility & Leadership Strengthening',
    category: 'strengthened_leadership',
    description: 'AI strengthens contributor "worked on" claim to "led and architected".',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'semanticStrengtheningPass',
    unsafeResponse: {
      summary: {
        text: 'Spearheaded technical vision and architected core Go microservices at Acme Corp.',
        derivedFromFactIds: ['fact-adv-go'],
      },
      work: [
        {
          name: 'Acme Corp',
          position: 'Software Engineer',
          highlights: ['Led and directed the backend architecture modernization in Go.'],
          derivedFromFactIds: ['fact-adv-go'],
        },
      ],
    },
  },

  // 6. Invented Seniority (Software Engineer -> Principal / Staff Architect)
  {
    id: 'adv-06-invented-seniority',
    name: 'Seniority Inflation & JD Title Leakage',
    category: 'invented_seniority',
    description: 'AI upgrades role title to Principal Architect based on target JD title.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    targetJobTitle: 'Principal Cloud Architect',
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'unsupportedSeniorityPass',
    unsafeResponse: {
      work: [
        {
          name: 'Acme Corp',
          position: 'Principal Architect',
          derivedFromFactIds: ['fact-adv-acme'],
        },
      ],
    },
  },

  // 7. Invented Production Scale ("enterprise-scale / millions of users / global platform")
  {
    id: 'adv-07-invented-production-scale',
    name: 'Unsupported Production Scale Claim',
    category: 'invented_production_scale',
    description: 'AI claims global enterprise-scale platform without source fact support.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'unsupportedScalePass',
    unsafeResponse: {
      summary: {
        text: 'Experienced engineer managing global platform and enterprise-scale mission-critical infrastructure.',
        derivedFromFactIds: ['fact-adv-go'],
      },
    },
  },

  // 8. Unsupported Certification
  {
    id: 'adv-08-unsupported-certification',
    name: 'Unsupported Certification Claim',
    category: 'unsupported_certification',
    description: 'AI invents AWS Certified Solutions Architect credential without source fact.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'entityFidelityPass',
    unsafeResponse: {
      skills: [
        {
          name: 'AWS Certified Solutions Architect',
          keywords: ['Cloud'],
          derivedFromFactIds: ['fact-adv-go'],
        },
      ],
    },
  },

  // 9. Foreign Profile Fact ID
  {
    id: 'adv-09-foreign-profile-fact',
    name: 'Cross-Profile Fact Injection',
    category: 'foreign_profile_fact',
    description: 'AI references a fact ID belonging to a different user profile.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'sourceAuthorizationPass',
    unsafeResponse: {
      skills: [{ name: 'Rust', derivedFromFactIds: ['fact-adv-foreign-rust'] }],
    },
  },

  // 10. Unconfirmed Fact ID (needs_confirmation state)
  {
    id: 'adv-10-unconfirmed-fact',
    name: 'Unconfirmed Fact Attribution',
    category: 'unconfirmed_fact',
    description: 'AI attributes output to an unconfirmed (observed) fact ID.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'sourceAuthorizationPass',
    unsafeResponse: {
      skills: [{ name: 'Kubernetes', derivedFromFactIds: ['fact-adv-unconfirmed-k8s'] }],
    },
  },

  // 11. Superseded Fact ID
  {
    id: 'adv-11-superseded-fact',
    name: 'Superseded Fact Attribution',
    category: 'superseded_fact',
    description: 'AI attributes output to a superseded historical fact ID.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'sourceAuthorizationPass',
    unsafeResponse: {
      skills: [{ name: 'Python', derivedFromFactIds: ['fact-adv-superseded-py'] }],
    },
  },

  // 12. Missing JD Requirement Claim (claiming Terraform when missing in Career Knowledge)
  {
    id: 'adv-12-missing-requirement-claim',
    name: 'Missing JD Requirement Claim',
    category: 'missing_requirement_claim',
    description:
      'AI claims Terraform experience when Terraform is missing in candidate Career Knowledge.',
    profileId: PROFILE_ID,
    facts: baseFacts,
    jdMatchReport: baseMatchReport,
    expectedFailureDimension: 'requirementNonClaimPass',
    unsafeResponse: {
      summary: {
        text: 'Software Engineer with experience in Go and Terraform infrastructure as code.',
        derivedFromFactIds: ['fact-adv-go'],
      },
    },
  },
];
