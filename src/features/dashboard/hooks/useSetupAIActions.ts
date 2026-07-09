import { useState, useCallback } from 'react';
import { SetupFormData, ResumeAnalysis } from '@/types';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { analyzeResume } from '@/services/resume/resumeAIService';
import { extractInfoFromJD } from '@/services/jobs/jobAIService';
import { researchCompany } from '@/services/ai/aiResearcherService';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { isNonEmptyString } from '@/lib/validation';

export function useSetupAIActions(
  formData: SetupFormData,
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>,
  selectedResumeId?: number
) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  const handleAutoFill = useCallback(async () => {
    if (!isNonEmptyString(formData.jobDescription)) {
      toast.error('Please enter a Job Description first.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set your API Key first.');
      return;
    }
    setIsExtracting(true);
    try {
      const extracted = await extractInfoFromJD(formData.jobDescription, config);
      setFormData((prev) => ({
        ...prev,
        company: extracted.company,
        jobTitle: extracted.jobTitle,
        interviewerPersona: extracted.interviewerPersona,
        difficulty: extracted.difficulty || prev.difficulty,
        companyStatus: extracted.companyStatus || prev.companyStatus,
        interviewContext: extracted.interviewContext || prev.interviewContext,
      }));
    } catch (error) {
      toast.error('Failed to extract info: ' + getErrorMessage(error));
    } finally {
      setIsExtracting(false);
    }
  }, [formData.jobDescription, setFormData]);

  const handleResearchCompany = useCallback(async () => {
    if (!isNonEmptyString(formData.company)) {
      toast.error('Please enter a Company name first.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set your API Key first.');
      return;
    }
    setIsResearching(true);
    try {
      const intel = await researchCompany(formData.company);
      setFormData((prev) => ({
        ...prev,
        companyStatus: intel.suggestedStatus || prev.companyStatus,
        interviewContext: `${intel.suggestedContext || prev.interviewContext}\n\nCulture: ${intel.culture}\nLatest News: ${intel.latestNews}`,
      }));
      toast.success(`Research for ${formData.company} complete! Form updated.`);
    } catch (error) {
      toast.error('Failed to research company: ' + getErrorMessage(error));
    } finally {
      setIsResearching(false);
    }
  }, [formData.company, setFormData]);

  const handleAnalyzeResume = useCallback(async () => {
    if (!formData.resumeText || !formData.jobDescription) {
      toast.error('Please provide both Resume content and Job Description.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      toast.error('Please set your API Key first.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeResume(
        formData.resumeText,
        formData.jobDescription,
        config,
        selectedResumeId
      );
      setResumeAnalysis(analysis);
    } catch (error) {
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData.resumeText, formData.jobDescription, selectedResumeId]);

  return {
    isExtracting,
    isAnalyzing,
    isResearching,
    resumeAnalysis,
    setResumeAnalysis,
    handleAutoFill,
    handleResearchCompany,
    handleAnalyzeResume,
  };
}
