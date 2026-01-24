import { db } from '@/lib/db';
import { JobRecommendation, UserSettings } from '@/types';
import { ResumeData } from '@/types/resume';

// Define types for database operations
export interface DBJobRecommendation {
  id?: number;
  interviewId: number;
  resumeId: number;
  title: string;
  company: string;
  industry?: string;
  location?: string;
  salaryRange?: string;
  keyRequirements: string; // JSON string
  whyItFits?: string;
  matchScore?: number;
  jobDescription?: string;
  tailoredResumeId?: number;
  createdAt: number;
}

// Convert from DB format to JobRecommendation interface
const toJobRecommendation = (dbRec: DBJobRecommendation): JobRecommendation => ({
  id: `db-${dbRec.id}`,
  title: dbRec.title,
  company: dbRec.company,
  industry: dbRec.industry,
  location: dbRec.location,
  salaryRange: dbRec.salaryRange,
  keyRequirements: JSON.parse(dbRec.keyRequirements || '[]') as string[],
  whyItFits: dbRec.whyItFits,
  matchScore: dbRec.matchScore,
  jobDescription: dbRec.jobDescription,
  tailoredResumeId: dbRec.tailoredResumeId,
});

// Convert from JobRecommendation interface to DB format
const toDBJobRecommendation = (
  rec: Omit<JobRecommendation, 'id'>,
  interviewId: number,
  resumeId: number
): Omit<DBJobRecommendation, 'id'> => ({
  interviewId,
  resumeId,
  title: rec.title,
  company: rec.company,
  industry: rec.industry,
  location: rec.location,
  salaryRange: rec.salaryRange,
  keyRequirements: JSON.stringify(rec.keyRequirements),
  whyItFits: rec.whyItFits,
  matchScore: rec.matchScore,
  jobDescription: rec.jobDescription,
  tailoredResumeId: rec.tailoredResumeId,
  createdAt: Date.now(),
});

// Generate job recommendations from resume data
export async function generateJobRecommendations(
  resumeData: ResumeData,
  language: string,
  config: UserSettings
): Promise<JobRecommendation[]> {
  // This would normally call an AI service
  // For now, return mock data
  return [
    {
      id: 'job-1',
      title: 'Senior Frontend Engineer',
      company: 'TechCorp',
      industry: 'Technology',
      location: 'Hanoi, Vietnam',
      salaryRange: '$3,000 - $5,000/month',
      keyRequirements: ['React', 'TypeScript', 'Node.js', 'CSS'],
      whyItFits: 'Your experience with React and TypeScript matches our frontend stack perfectly.',
      matchScore: 85,
      jobDescription: 'We are looking for a senior frontend engineer to join our team...',
    },
    {
      id: 'job-2',
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      industry: 'Technology',
      location: 'Ho Chi Minh City, Vietnam',
      salaryRange: '$2,500 - $4,000/month',
      keyRequirements: ['JavaScript', 'Python', 'Django', 'PostgreSQL'],
      whyItFits: 'Your full stack experience and problem-solving skills are a great fit.',
      matchScore: 78,
      jobDescription: 'Join our fast-growing startup as a full stack developer...',
    },
  ];
}

// Save job recommendations to database
export async function saveJobRecommendations(
  interviewId: number,
  resumeId: number,
  recommendations: JobRecommendation[]
): Promise<number[]> {
  const dbRecommendations = recommendations.map((rec) =>
    toDBJobRecommendation(rec, interviewId, resumeId)
  );

  const ids: number[] = [];
  await db.transaction('rw', db.job_recommendations, async () => {
    for (const rec of dbRecommendations) {
      const id = await db.job_recommendations.add(rec);
      ids.push(id);
    }
  });

  return ids;
}

// Get job recommendations for an interview
export async function getJobRecommendations(interviewId: number): Promise<JobRecommendation[]> {
  const dbRecommendations = await db.job_recommendations
    .where('interviewId')
    .equals(interviewId)
    .toArray();

  return dbRecommendations.map(toJobRecommendation);
}

// Generate tailored resume for specific job
export async function generateTailoredResumeForJob(
  originalResumeData: ResumeData,
  jobDescription: string,
  config: UserSettings
): Promise<ResumeData> {
  // This would normally call an AI service to tailor the resume
  // For now, return the original data with minor modifications
  return {
    ...originalResumeData,
    basics: {
      ...originalResumeData.basics,
      summary: `Experienced professional with expertise in relevant technologies for this ${jobDescription.split(' ')[0]} position.`,
    },
  };
}

// Save tailored resume to database
export async function saveTailoredResume(resumeData: ResumeData): Promise<number> {
  const newResume = {
    createdAt: Date.now(),
    fileName: 'Tailored Resume.pdf',
    rawText: '', // This would normally be generated from the resumeData
    parsedData: resumeData,
    formatted: true,
  };

  return await db.resumes.add(newResume);
}

// Helper function to format job recommendation data for display
export function formatJobRecommendationForDisplay(job: JobRecommendation) {
  return {
    ...job,
    keyRequirements: job.keyRequirements.slice(0, 3).join(', '),
    salaryDisplay: job.salaryRange || 'Competitive',
    matchScoreDisplay: job.matchScore ? `${job.matchScore}%` : 'N/A',
  };
}
