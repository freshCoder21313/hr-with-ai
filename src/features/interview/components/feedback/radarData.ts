import { InterviewFeedback } from '@/types';

interface RadarAxis {
  subject: string;
  A: number;
  fullMark: number;
}

/** Only axes with a real score in the feedback schema are plotted; nothing is inferred. */
export function buildRadarData(feedback: InterviewFeedback): RadarAxis[] {
  const axes: Array<{ subject: string; value: number | undefined }> = [
    { subject: 'Overall', value: feedback.score },
    { subject: 'Technical', value: feedback.technicalScore },
    { subject: 'Communication', value: feedback.communicationScore },
    { subject: 'Culture Fit', value: feedback.cultureFitScore },
    { subject: 'Resilience', value: feedback.resilienceScore },
  ];
  return axes
    .filter((axis): axis is { subject: string; value: number } => typeof axis.value === 'number')
    .map((axis) => ({ subject: axis.subject, A: axis.value, fullMark: 10 }));
}
