import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { useCVManagement } from '../hooks/useCVManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const AnalysisResult = ({ result }: { result: string }) => {
  // A simple parser for the placeholder result string
  const lines = result.split('\\n').filter((line) => line.trim() !== '');
  const scoreMatch = lines[0].match(/(\d+)\/(\d+)/);
  const score = scoreMatch ? (parseInt(scoreMatch[1], 10) / parseInt(scoreMatch[2], 10)) * 100 : 0;
  const suggestions = lines.slice(1);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-center mb-2">Match Score</p>
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              className="text-slate-200 dark:text-slate-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="text-blue-500"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${score}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{Math.round(score)}%</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold">Suggestions</h4>
        <ul className="space-y-2">
          {suggestions.map((item, index) => {
            const isMatch = item.includes('Matched');
            const isRec = item.includes('Recommend') || item.includes('Consider');
            return (
              <li key={index} className="flex items-start space-x-2 text-sm">
                {isMatch ? (
                  <Check className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                )}
                <span>{item.replace(/^- /, '')}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export const TailorCVWidget: React.FC = () => {
  const {
    selectedCvId,
    jobDescription,
    setJobDescription,
    tailorCv,
    tailorStatus,
    tailorError,
    analysisResult,
  } = useCVManagement();

  const isDisabled = !selectedCvId;
  const isLoading = tailorStatus === 'loading';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Tailor CV to Job</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-4">
        <div className="flex-grow flex flex-col">
          <label htmlFor="job-description" className="text-sm font-medium mb-2">
            Job Description
          </label>
          <textarea
            id="job-description"
            placeholder={
              isDisabled ? 'Select a CV to enable tailoring.' : 'Paste the job description here...'
            }
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full flex-grow p-2 border rounded-md bg-white dark:bg-slate-800/50 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isDisabled}
          />
        </div>
        <Button onClick={tailorCv} disabled={isLoading || isDisabled || !jobDescription}>
          {isLoading ? 'Analyzing...' : 'Analyze Match'}
        </Button>

        {isLoading && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-24 w-24 mx-auto rounded-full" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {tailorError && <p className="text-sm text-red-500">{tailorError}</p>}

        {analysisResult && tailorStatus === 'success' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <AnalysisResult result={analysisResult} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
