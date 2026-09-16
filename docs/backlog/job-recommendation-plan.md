# Job Recommendation Feature - Implementation Plan

## Overview

This plan outlines the implementation of AI-powered job recommendations based on user-selected CV in the Interview Room. The feature will analyze the CV, generate relevant job opportunities, create tailored CVs for each job, and allow users to automatically fill the interview form.

## Architecture Overview

### Current Flow
1. User goes to SetupRoom → Uploads CV → Enters Job Details → Starts Interview
2. Interview Room: Chat with AI about the job

### New Flow (Job Recommendation)
1. User goes to Interview Room
2. User selects a CV from ResumeList
3. AI analyzes CV and generates 3-5 job recommendations
4. User selects a job
5. AI creates a tailored CV for that job
6. AI automatically fills the interview form (company, jobTitle, jobDescription, resumeText)
7. User can start the interview with the new configuration

## Data Structures

### New Types (to add to src/types.ts)

```typescript
// Job Recommendation Interface
export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  salaryRange: string;
  keyRequirements: string[];
  whyItFits: string; // Why this job fits the user's CV
  matchScore: number; // 0-100
  jobDescription: string;
  tailoredResumeId?: number; // ID of the generated tailored resume
}

// Job Selection State (for Interview Room)
export interface JobSelectionState {
  selectedResumeId?: number;
  recommendations: JobRecommendation[];
  selectedJob?: JobRecommendation;
  isGenerating: boolean;
  status: 'idle' | 'analyzing' | 'generating' | 'completed';
}
```

### Database Schema Updates

Need to add a new table for storing job recommendations (SQLite):

```sql
CREATE TABLE IF NOT EXISTS job_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interviewId INTEGER NOT NULL,
  resumeId INTEGER NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  salaryRange TEXT,
  keyRequirements TEXT, -- JSON string
  whyItFits TEXT,
  matchScore INTEGER,
  jobDescription TEXT,
  tailoredResumeId INTEGER,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (interviewId) REFERENCES interviews(id),
  FOREIGN KEY (resumeId) REFERENCES resumes(id)
);
```

## Implementation Steps

### Step 1: Update Type Definitions

**File:** `src/types.ts`

- Add `JobRecommendation` interface
- Add `JobSelectionState` interface
- Update `SetupFormData` to include optional `jobRecommendationId`

### Step 2: Create Database Table & Service Methods

**Files:**
- `migrations/002_job_recommendations.sql` - Create new table
- `src/lib/db.ts` - Add table definition and CRUD methods
- `src/services/jobRecommendationService.ts` - New service for job recommendations

**Key Methods:**
- `generateJobRecommendations(resumeText: string, config: UserSettings): Promise<JobRecommendation[]>`
- `saveJobRecommendations(interviewId: number, resumeId: number, recommendations: JobRecommendation[]): Promise<number[]>`
- `getJobRecommendations(interviewId: number): Promise<JobRecommendation[]>`
- `generateTailoredResumeForJob(resumeData: ResumeData, jobDescription: string): Promise<ResumeData>`

### Step 3: Create AI Prompt System

**File:** `src/features/interview/promptSystem.ts` (or new file `src/services/jobPromptSystem.ts`)

**Prompt 1: Generate Job Recommendations**
```typescript
export const generateJobRecommendationsPrompt = (
  resumeData: ResumeData,
  language: string
) => `
Analyze the following resume and generate ${language === 'vi-VN' ? '3-5' : '3-5'} relevant job opportunities.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Requirements:
1. Generate realistic job titles based on skills and experience
2. Include realistic company names
3. For each job, provide:
   - Title
   - Company
   - Industry
   - Location (e.g., Hanoi, Ho Chi Minh City, Remote)
   - Salary Range (e.g., $3000-5000/month)
   - Key Requirements (3-5 bullet points)
   - Why this job fits the candidate (based on their experience)
   - Match Score (0-100 based on fit)
   - Detailed Job Description

Format: JSON array of objects
`;
```

**Prompt 2: Generate Tailored CV for Job**
```typescript
export const generateTailoredResumePrompt = (
  originalResumeData: ResumeData,
  jobDescription: string
) => `
Generate a tailored version of this resume specifically for the following job:

Job Description:
${jobDescription}

Original Resume Data:
${JSON.stringify(originalResumeData, null, 2)}

Requirements:
1. Modify the resume to highlight relevant skills and experience
2. Adjust the professional summary if needed
3. Reorder bullet points to prioritize relevant achievements
4. Add keywords from the job description
5. Maintain the original structure and format
6. Return JSON Resume format

Format: JSON Resume object
`;
```

### Step 4: Update Interview Room Component

**File:** `src/features/interview/InterviewRoom.tsx`

**New Features to Add:**

1. **Job Recommendation Modal** (new component: `JobRecommendationModal.tsx`)
   - Display when user clicks "Generate Jobs from CV"
   - Shows loading states while AI analyzes CV and generates jobs
   - Displays list of job recommendations with match scores
   - Allows user to select a job
   - Shows progress: Analyzing CV → Generating Jobs → Creating Tailored CV

2. **Add to Header:**
   - New button "Find Job with CV"
   - New section to show selected job information

3. **Add to Setup (before interview):**
   - When user selects a job and clicks "Use This Job"
   - Auto-fill form fields:
     - `company` ← selectedJob.company
     - `jobTitle` ← selectedJob.title
     - `jobDescription` ← selectedJob.jobDescription
     - `resumeText` ← tailored resume text

**UI Flow:**
```
Interview Room
├── Header
│   ├── [Existing buttons]
│   └── [NEW] "Find Job with CV" button
│
├── Job Recommendation Modal (when open)
│   ├── Step 1: Select CV
│   ├── Step 2: Generating (AI analyzing) ──────────────────────────────┐
│   │   └── Progress: Analyzing CV skills → Identifying industries       │
│   │              → Matching opportunities → Scoring fit                │
│   ├────────────────────────────────────────────────────────────────────┘
│   │
│   ├── Step 3: Job Results (3-5 cards)
│   │   ├── Card 1: Senior Frontend Engineer @ TechCorp
│   │   │   ├── Match Score: 85%
│   │   │   ├── Why it fits: "Your 5 years React experience..."
│   │   │   └── [Select] button
│   │   ├── Card 2: Full Stack Developer @ StartupXYZ
│   │   └── Card 3: UI/UX Engineer @ DesignStudio
│   │
│   └── Step 4: After Selection
│       ├── "Creating tailored CV..." (AI generates)
│       └── "Ready! Fill form and start interview?"
│
├── [NEW] Job Info Bar (if job selected)
│   └── Shows: Selected Job Title @ Company
│
└── Interview Form (if no job selected, shows existing form)
```

### Step 5: Create New Components

**File:** `src/features/interview/JobRecommendationModal.tsx`

**Props:**
```typescript
interface JobRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJob: (job: JobRecommendation, tailoredResumeText: string) => void;
  interviewId?: number;
  existingResumeId?: number;
}
```

**State Management:**
- `selectedResumeId: number | null`
- `jobs: JobRecommendation[]`
- `selectedJob: JobRecommendation | null`
- `isGenerating: boolean`
- `step: 'select-resume' | 'generating' | 'results' | 'completed'`

**Component Structure:**
```
<Dialog open={isOpen} onClose={onClose}>
  <DialogTitle>
    {step === 'select-resume' && "Select CV for Job Recommendation"}
    {step === 'generating' && "AI is analyzing..."}
    {step === 'results' && "Job Recommendations"}
    {step === 'completed' && "Job Selected!"}
  </DialogTitle>
  
  <DialogContent>
    {step === 'select-resume' && <ResumeSelector />}
    {step === 'generating' && <GeneratingProgress />}
    {step === 'results' && <JobList jobs={jobs} />}
    {step === 'completed' && <CompletionScreen job={selectedJob} />}
  </DialogContent>
</Dialog>
```

### Step 6: Update geminiService.ts

**Add Functions:**

```typescript
// Generate job recommendations from resume data
export async function generateJobRecommendations(
  resumeData: ResumeData,
  language: string,
  config: UserSettings
): Promise<JobRecommendation[]> {
  const prompt = generateJobRecommendationsPrompt(resumeData, language);
  const response = await callGeminiAPI(prompt, config);
  return JSON.parse(response);
}

// Generate tailored resume for specific job
export async function generateTailoredResumeForJob(
  originalResumeData: ResumeData,
  jobDescription: string,
  config: UserSettings
): Promise<ResumeData> {
  const prompt = generateTailoredResumePrompt(originalResumeData, jobDescription);
  const response = await callGeminiAPI(prompt, config);
  return JSON.parse(response);
}
```

### Step 7: Create Job Selection Logic in SetupRoom

**File:** `src/features/dashboard/SetupRoom.tsx`

**New Props (optional):**
```typescript
interface SetupRoomProps {
  jobRecommendationId?: number;
  prefillData?: {
    company: string;
    jobTitle: string;
    jobDescription: string;
    resumeText: string;
  };
}
```

**Update Form Logic:**
- If `prefillData` exists, use it to pre-fill form fields
- Add read-only indicator when fields are pre-filled from job recommendation

### Step 8: Add Navigation Flow

**Flow 1: Starting from Interview Room**
```
Interview Room
  ↓ (User clicks "Find Job with CV")
JobRecommendationModal
  ↓ (User selects job)
Update Interview Room form fields with:
  - company
  - jobTitle
  - jobDescription
  - resumeText (tailored)
  ↓
User clicks "Start Interview"
SetupRoom (with pre-filled data)
  ↓
Interview Room (with new configuration)
```

**Flow 2: Starting from Setup Room**
```
Setup Room
  ↓ (User selects CV)
[NEW] "Generate Job Recommendations" button
  ↓
JobRecommendationModal
  ↓ (User selects job)
Auto-fill form fields
  ↓
User clicks "Start Interview"
Interview Room (with new configuration)
```

### Step 9: Error Handling & Edge Cases

**Error Scenarios:**
1. **No API Key configured**
   - Show alert: "Please configure API Key in settings"
   - Prevent job generation

2. **No CV selected**
   - Show alert: "Please select a CV first"
   - Disable "Generate Jobs" button

3. **AI API fails**
   - Show retry button
   - Display error message
   - Save partial state to localStorage

4. **Job description too long**
   - Truncate for display
   - Keep full version for resume generation

5. **Multiple rapid requests**
   - Debounce API calls
   - Show loading state clearly
   - Cancel previous requests if component unmounts

**Validation:**
- Validate resume data structure before API call
- Validate job recommendation response format
- Validate tailored resume format

### Step 10: Testing Strategy

**Unit Tests:**
- `generateJobRecommendationsPrompt` generates correct prompt
- `generateTailoredResumePrompt` generates correct prompt
- Job recommendation state machine transitions correctly
- Form auto-fill logic works correctly

**Integration Tests:**
- Complete flow: Select CV → Generate Jobs → Select Job → Fill Form → Start Interview
- Error handling: API failure, no API key, no CV selected

**E2E Tests:**
- User journey from Interview Room to completed interview with job recommendation

### Step 11: Performance Optimizations

1. **Caching:**
   - Cache job recommendations per CV in IndexedDB
   - Cache tailored resumes temporarily
   - Add TTL to cache entries (e.g., 1 hour)

2. **Lazy Loading:**
   - Load JobRecommendationModal component lazily
   - Load AI service only when needed

3. **Optimistic UI:**
   - Show local state updates immediately
   - Sync with backend in background

4. **Batching:**
   - Generate jobs for multiple CVs in one request if needed
   - Batch API calls for efficiency

### Step 12: User Experience Improvements

**Progress Indicators:**
- Real-time progress updates during AI generation
- Estimated time remaining
- Visual feedback for each step

**Accessibility:**
- Keyboard navigation support
- Screen reader announcements for status changes
- Focus management in modal

**Mobile Optimization:**
- Touch-friendly job cards
- Swipe gestures for job selection
- Responsive progress bars

## Implementation Priority

### Phase 1 (MVP - Week 1)
1. Add type definitions
2. Create database table
3. Create basic JobRecommendationModal UI
4. Integrate AI job generation
5. Basic form auto-fill
6. End-to-end flow testing

### Phase 2 (Week 2)
1. Add progress indicators
2. Error handling improvements
3. Caching layer
4. Performance optimization
5. Mobile UI refinements

### Phase 3 (Week 3)
1. Advanced job matching algorithms
2. Job filtering and sorting
3. Save job recommendations to history
4. User feedback collection
5. A/B testing setup

## API Rate Limits & Cost Management

**Gemini API Considerations:**
- Job generation: ~1000-2000 tokens per request
- Resume tailoring: ~1500-2500 tokens per request
- Estimated cost: $0.01-0.03 per full flow

**Optimization Strategies:**
1. Cache job recommendations for 24 hours
2. Limit to 3 job recommendations per CV (configurable)
3. Allow user to regenerate jobs if not satisfied
4. Batch multiple CV analysis if needed

## Security Considerations

1. **API Key Storage:** Keep in localStorage, encrypted
2. **Data Privacy:** Don't send full resume to third-party services
3. **Input Validation:** Sanitize all AI inputs
4. **Output Validation:** Validate AI responses before processing
5. **User Data:** Only send necessary data for specific task

## Future Enhancements

1. **Multi-language Support:** Vietnamese and English job descriptions
2. **Salary Comparison:** Show market salary benchmarks
3. **Company Research:** Integrate with job board APIs
4. **Interview Preparation:** Generate interview questions for selected job
5. **Skill Gap Analysis:** Show what skills user needs to learn
6. **Career Path Suggestions:** Recommend career progression paths
7. **Application Tracking:** Save jobs to apply later
8. **Network Integration:** Connect with LinkedIn/other platforms

## Success Metrics

**User Engagement:**
- Number of job recommendations generated per day
- Job selection rate (jobs generated → jobs selected)
- Interview start rate after job selection
- User satisfaction score (NPS)

**Business Metrics:**
- API cost per user session
- Retention rate for users who use job recommendation feature
- Conversion to premium features (if applicable)

## Conclusion

This feature transforms the interview prep experience from "start with any job" to "find the right job and prepare for it." By leveraging AI to match user profiles with opportunities, we create a more personalized and valuable interview preparation tool.
