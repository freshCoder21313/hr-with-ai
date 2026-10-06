import type { TailoringGoldenFixture } from '@/types/careerKnowledge';

const PROFILE_ID = 'profile-golden-alpha';

export const goldenFixtures: TailoringGoldenFixture[] = [
  // 1. Backend Engineer
  {
    id: 'golden-01-backend-engineer',
    name: 'Backend Engineer (Go & PostgreSQL)',
    description:
      'Senior backend engineer tailoring towards Go microservices and high-throughput APIs.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-be-go',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Go',
        claim:
          '5 years of backend engineering in Go building microservices handling 2M requests/day',
        structured: { skill: 'Go', years: 5, level: 'Senior' },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-be-pg',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'PostgreSQL',
        claim: 'Expert in PostgreSQL query optimization and relational schema design',
        structured: { skill: 'PostgreSQL' },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-be-work-acme',
        profileId: PROFILE_ID,
        category: 'experience',
        subject: 'Acme Corp',
        claim:
          'Senior Backend Engineer at Acme Corp developing Go API services handling 2 million requests per day with PostgreSQL',
        structured: {
          company: 'Acme Corp',
          role: 'Senior Backend Engineer',
          startDate: '2021-01',
          endDate: '2025-01',
        },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Senior Backend Engineer',
    targetCompany: 'CloudTech Inc',
    targetJobDescription:
      'Seeking Senior Go Developer with PostgreSQL experience for distributed systems.',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:1',
            key: 'go',
            category: 'skill',
            description: '5+ years Go experience',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-be-go', 'fact-be-work-acme'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Go experience',
        },
        {
          requirement: {
            id: 'req:2',
            key: 'postgresql',
            category: 'skill',
            description: 'PostgreSQL database expertise',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-be-pg', 'fact-be-work-acme'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed PostgreSQL experience',
        },
      ],
      summary: { total: 2, satisfied: 2, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-be-go', 'fact-be-pg', 'fact-be-work-acme'],
    expectedRelevanceFocus: ['Go', 'PostgreSQL'],
    validTailoredResponse: {
      summary: {
        text: 'Senior Backend Engineer with 5 years of experience developing high-performance Go microservices and PostgreSQL systems handling 2 million requests/day.',
        derivedFromFactIds: ['fact-be-go', 'fact-be-pg', 'fact-be-work-acme'],
      },
      work: [
        {
          name: 'Acme Corp',
          position: 'Senior Backend Engineer',
          startDate: '2021-01',
          endDate: '2025-01',
          summary: 'Engineered high-throughput Go backend services with PostgreSQL persistence.',
          highlights: ['Developed Go API services processing 2 million requests per day.'],
          derivedFromFactIds: ['fact-be-work-acme', 'fact-be-go'],
        },
      ],
      skills: [
        {
          name: 'Go',
          level: 'Senior',
          keywords: ['Microservices', 'Concurrency'],
          derivedFromFactIds: ['fact-be-go'],
        },
        {
          name: 'PostgreSQL',
          keywords: ['Query Optimization', 'Schema Design'],
          derivedFromFactIds: ['fact-be-pg'],
        },
      ],
    },
  },

  // 2. Frontend Engineer
  {
    id: 'golden-02-frontend-engineer',
    name: 'Frontend Engineer (React & TypeScript)',
    description: 'Frontend engineer highlighting React, TypeScript, and modern UI performance.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-fe-react',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'React',
        claim:
          '3 years of React development with TypeScript and Tailwind CSS maintaining 99.9% uptime',
        structured: { skill: 'React', years: 3 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-fe-work-nexus',
        profileId: PROFILE_ID,
        category: 'experience',
        subject: 'Nexus Web',
        claim: 'Frontend Developer at Nexus Web building React web applications with 99.9% uptime',
        structured: {
          company: 'Nexus Web',
          role: 'Frontend Developer',
          startDate: '2022-03',
          endDate: '2025-01',
        },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Frontend Developer',
    targetJobDescription: 'Seeking React & TypeScript developer for web UI products.',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:fe-1',
            key: 'react',
            category: 'skill',
            description: 'React and TypeScript proficiency',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-fe-react', 'fact-fe-work-nexus'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed React experience',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-fe-react', 'fact-fe-work-nexus'],
    expectedRelevanceFocus: ['React'],
    validTailoredResponse: {
      summary: {
        text: 'Frontend Developer with 3 years of experience building accessible web applications in React and TypeScript.',
        derivedFromFactIds: ['fact-fe-react'],
      },
      work: [
        {
          name: 'Nexus Web',
          position: 'Frontend Developer',
          startDate: '2022-03',
          endDate: '2025-01',
          summary: 'Developed responsive user interfaces with React and Tailwind CSS.',
          highlights: [
            'Delivered core frontend components maintaining 99.9 percent service availability.',
          ],
          derivedFromFactIds: ['fact-fe-work-nexus', 'fact-fe-react'],
        },
      ],
      skills: [
        {
          name: 'React',
          keywords: ['TypeScript', 'Tailwind CSS'],
          derivedFromFactIds: ['fact-fe-react'],
        },
      ],
    },
  },

  // 3. DevOps / Platform Engineer
  {
    id: 'golden-03-devops-platform',
    name: 'Platform / DevOps Engineer',
    description: 'Infrastructure engineer emphasizing Kubernetes and Docker containerization.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-ops-k8s',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Kubernetes',
        claim: '4 years administering Kubernetes clusters and Docker containers across 50 nodes',
        structured: { skill: 'Kubernetes', years: 4 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'DevOps Engineer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:ops-1',
            key: 'kubernetes',
            category: 'skill',
            description: 'Kubernetes experience',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-ops-k8s'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Kubernetes experience',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-ops-k8s'],
    expectedRelevanceFocus: ['Kubernetes'],
    validTailoredResponse: {
      summary: {
        text: 'Platform Engineer with 4 years managing Kubernetes clusters across 50 nodes.',
        derivedFromFactIds: ['fact-ops-k8s'],
      },
      skills: [
        {
          name: 'Kubernetes',
          keywords: ['Docker', 'Containers'],
          derivedFromFactIds: ['fact-ops-k8s'],
        },
      ],
    },
  },

  // 4. Data Engineer
  {
    id: 'golden-04-data-engineer',
    name: 'Data Engineer (Python & Spark)',
    description: 'Data engineer highlighting pipeline processing and SQL data models.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-data-py',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Python Data Engineering',
        claim: '4 years of Python and Apache Spark pipelines processing 500GB daily data volume',
        structured: { skill: 'Python', years: 4 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Data Engineer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:data-1',
            key: 'spark',
            category: 'skill',
            description: 'Apache Spark pipelines',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-data-py'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Spark experience',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-data-py'],
    expectedRelevanceFocus: ['Spark'],
    validTailoredResponse: {
      summary: {
        text: 'Data Engineer with 4 years developing Python and Apache Spark batch pipelines processing 500GB daily data volume.',
        derivedFromFactIds: ['fact-data-py'],
      },
      skills: [
        {
          name: 'Apache Spark',
          keywords: ['Python', 'ETL Pipelines'],
          derivedFromFactIds: ['fact-data-py'],
        },
      ],
    },
  },

  // 5. Mixed Skills / Experience
  {
    id: 'golden-05-mixed-skills',
    name: 'Full Stack Engineer (Node.js & React)',
    description: 'Full stack engineer with balanced frontend and backend capabilities.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-fs-node',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Node.js',
        claim: '3 years of Node.js backend development',
        structured: { skill: 'Node.js', years: 3 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-fs-react',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'React',
        claim: '3 years of React user interface engineering',
        structured: { skill: 'React', years: 3 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Full Stack Developer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:fs-1',
            key: 'nodejs',
            category: 'skill',
            description: 'Node.js services',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-fs-node'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Node.js experience',
        },
        {
          requirement: {
            id: 'req:fs-2',
            key: 'react',
            category: 'skill',
            description: 'React frontend UI',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-fs-react'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed React experience',
        },
      ],
      summary: { total: 2, satisfied: 2, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-fs-node', 'fact-fs-react'],
    expectedRelevanceFocus: ['Node.js'],
    validTailoredResponse: {
      summary: {
        text: 'Full Stack Developer with 3 years building web applications using Node.js and React.',
        derivedFromFactIds: ['fact-fs-node', 'fact-fs-react'],
      },
      skills: [
        { name: 'Node.js', keywords: ['Backend Services'], derivedFromFactIds: ['fact-fs-node'] },
        { name: 'React', keywords: ['Web UI'], derivedFromFactIds: ['fact-fs-react'] },
      ],
    },
  },

  // 6. Sparse Career Knowledge
  {
    id: 'golden-06-sparse-career-knowledge',
    name: 'Sparse Profile (Single Skill)',
    description: 'Candidate with minimal confirmed career knowledge.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-sparse-py',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Python',
        claim: '1 year of Python scripting and CLI tools development',
        structured: { skill: 'Python', years: 1 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Junior Developer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:sp-1',
            key: 'python',
            category: 'skill',
            description: 'Python programming',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-sparse-py'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Python skill',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-sparse-py'],
    expectedRelevanceFocus: ['Python'],
    validTailoredResponse: {
      summary: {
        text: 'Junior Developer with 1 year experience developing Python scripts and command-line tools.',
        derivedFromFactIds: ['fact-sparse-py'],
      },
      skills: [
        { name: 'Python', keywords: ['Scripting', 'CLI'], derivedFromFactIds: ['fact-sparse-py'] },
      ],
    },
  },

  // 7. Missing JD Requirements
  {
    id: 'golden-07-missing-jd-requirements',
    name: 'Missing JD Requirement Protection',
    description:
      'Target JD requires Rust & Terraform, but candidate only has Go confirmed. Output omits missing skills.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-avail-go',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Go',
        claim: '3 years of Go backend development',
        structured: { skill: 'Go', years: 3 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Backend Engineer',
    targetJobDescription: 'Requires Go, Rust, and Terraform experience.',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:m-1',
            key: 'go',
            category: 'skill',
            description: 'Go language proficiency',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-avail-go'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Go experience',
        },
        {
          requirement: {
            id: 'req:m-2',
            key: 'rust',
            category: 'skill',
            description: 'Rust programming experience',
          },
          status: 'missing',
          matchingFactIds: [],
          matchingEvidenceIds: [],
          explanation: 'No confirmed Rust facts',
        },
        {
          requirement: {
            id: 'req:m-3',
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
      summary: { total: 3, satisfied: 1, uncertain: 0, missing: 2, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-avail-go'],
    expectedRelevanceFocus: ['Go'],
    validTailoredResponse: {
      summary: {
        text: 'Backend Engineer with 3 years of experience writing server applications in Go.',
        derivedFromFactIds: ['fact-avail-go'],
      },
      skills: [
        { name: 'Go', keywords: ['Backend Services'], derivedFromFactIds: ['fact-avail-go'] },
      ],
    },
  },

  // 8. Uncertain Facts
  {
    id: 'golden-08-uncertain-facts',
    name: 'Uncertain Fact Filtering',
    description:
      'Profile contains confirmed and unconfirmed (observed) facts. Only confirmed facts are used.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-conf-sql',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'SQL',
        claim: '2 years writing SQL database queries and schema migrations',
        structured: { skill: 'SQL', years: 2 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-unconf-aws',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'AWS',
        claim: 'Observed AWS Lambda configuration files in repo',
        verificationState: 'needs_confirmation',
        origin: 'external',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Database Developer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:unc-1',
            key: 'sql',
            category: 'skill',
            description: 'SQL database experience',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-conf-sql'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed SQL fact',
        },
        {
          requirement: {
            id: 'req:unc-2',
            key: 'aws',
            category: 'skill',
            description: 'AWS cloud experience',
          },
          status: 'uncertain',
          matchingFactIds: [],
          matchingEvidenceIds: [],
          explanation: 'AWS fact needs user confirmation',
        },
      ],
      summary: { total: 2, satisfied: 1, uncertain: 1, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-conf-sql'],
    expectedRelevanceFocus: ['SQL'],
    validTailoredResponse: {
      summary: {
        text: 'Database Developer with 2 years of experience writing SQL queries and managing schemas.',
        derivedFromFactIds: ['fact-conf-sql'],
      },
      skills: [
        {
          name: 'SQL',
          keywords: ['Relational Databases', 'Queries'],
          derivedFromFactIds: ['fact-conf-sql'],
        },
      ],
    },
  },

  // 9. Conflicting Facts
  {
    id: 'golden-09-conflicting-facts',
    name: 'Conflicting Fact Isolation',
    description: 'Handles conflicting claims safely without arbitrary resolution.',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-valid-java',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'Java',
        claim: '3 years of Java Spring Boot backend development',
        structured: { skill: 'Java', years: 3 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Java Developer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:cf-1',
            key: 'java',
            category: 'skill',
            description: 'Java Spring Boot',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-valid-java'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed Java fact',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-valid-java'],
    expectedRelevanceFocus: ['Java'],
    validTailoredResponse: {
      summary: {
        text: 'Software Engineer with 3 years of experience developing backend microservices in Java and Spring Boot.',
        derivedFromFactIds: ['fact-valid-java'],
      },
      skills: [
        { name: 'Java', keywords: ['Spring Boot'], derivedFromFactIds: ['fact-valid-java'] },
      ],
    },
  },

  // 10. Numeric-Heavy Resume
  {
    id: 'golden-10-numeric-heavy',
    name: 'Numeric-Heavy Metric Fidelity',
    description:
      'Candidate with multiple specific metrics (40% latency reduction, 2M users, 99.99% availability).',
    profileId: PROFILE_ID,
    version: '1.0.0',
    facts: [
      {
        id: 'fact-num-perf',
        profileId: PROFILE_ID,
        category: 'achievement',
        subject: 'Latency Optimization',
        claim:
          'Reduced API response latency by 40% serving 2M users with 99.99% system availability across 15 microservices',
        structured: { latencyReduction: '40%', users: '2M', availability: '99.99%', services: 15 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'fact-num-work',
        profileId: PROFILE_ID,
        category: 'experience',
        subject: 'ScaleWorks',
        claim:
          'Systems Engineer at ScaleWorks from 2022-01 to 2025-01 optimizing distributed services',
        structured: {
          company: 'ScaleWorks',
          role: 'Systems Engineer',
          startDate: '2022-01',
          endDate: '2025-01',
        },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    targetJobTitle: 'Performance Engineer',
    jdMatchReport: {
      profileId: PROFILE_ID,
      matchedAt: '2026-01-01T00:00:00Z',
      results: [
        {
          requirement: {
            id: 'req:perf-1',
            key: 'latency',
            category: 'achievement',
            description: 'API performance optimization',
          },
          status: 'satisfied',
          matchingFactIds: ['fact-num-perf', 'fact-num-work'],
          matchingEvidenceIds: [],
          explanation: 'Confirmed latency metrics',
        },
      ],
      summary: { total: 1, satisfied: 1, uncertain: 0, missing: 0, conflicting: 0, unsupported: 0 },
    },
    authorizedFactIds: ['fact-num-perf', 'fact-num-work'],
    expectedRelevanceFocus: ['latency'],
    validTailoredResponse: {
      summary: {
        text: 'Systems Engineer with proven track record of reducing API latency by 40% across 15 microservices serving 2 million users with 99.99 percent availability.',
        derivedFromFactIds: ['fact-num-perf', 'fact-num-work'],
      },
      work: [
        {
          name: 'ScaleWorks',
          position: 'Systems Engineer',
          startDate: '2022-01',
          endDate: '2025-01',
          summary: 'Engineered performance optimizations for distributed services.',
          highlights: [
            'Decreased API response latency by 40% serving 2M users.',
            'Maintained 99.99% system availability across 15 microservices.',
          ],
          derivedFromFactIds: ['fact-num-work', 'fact-num-perf'],
        },
      ],
    },
  },
];
