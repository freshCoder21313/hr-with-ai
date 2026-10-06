import { Interview, Message, CommunicationCoachingReport, FillerWordMetric } from '@/types';
import { getService, getStoredAIConfig, AIConfigInput } from '@/services/ai/aiConfigService';
import { communicationCoachingSchema } from '@/services/ai/schemas';
import { getCommunicationCoachPrompt, TurnDialogue } from '@/services/prompts/communicationCoach';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

import {
  COACHING_LANGUAGES,
  POPULAR_CUSTOM_LANGUAGES,
  inspectTargetLanguage,
  getLanguageNameByCode,
  CoachingLanguageOption,
  PopularCustomLanguage,
  TargetLanguageInspection,
} from './languageRecognition';

export {
  COACHING_LANGUAGES,
  POPULAR_CUSTOM_LANGUAGES,
  inspectTargetLanguage,
  getLanguageNameByCode,
  type CoachingLanguageOption,
  type PopularCustomLanguage,
  type TargetLanguageInspection,
};

/**
 * Extract structured Q&A turns from conversation messages.
 */
export function extractInterviewTurns(messages: Message[]): TurnDialogue[] {
  const turns: TurnDialogue[] = [];
  let currentQuestion = 'Tell me about yourself and your experience.';
  let questionIndex = 1;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'model') {
      // Keep track of the question asked by the model
      const trimmed = msg.content.trim();
      if (trimmed.length > 0) {
        currentQuestion = trimmed;
      }
    } else if (msg.role === 'user') {
      const answer = msg.content.trim();
      if (answer.length > 0) {
        turns.push({
          questionIndex: questionIndex++,
          question: currentQuestion,
          answer,
        });
      }
    }
  }

  return turns;
}

/**
 * Local heuristic filler word and delivery analysis.
 */
const VIETNAMESE_FILLERS = [
  'ừm',
  'à',
  'ờ',
  'kiểu như',
  'thì là',
  'nói chung là',
  'chắc là',
  'em nghĩ là',
  'kiểu kiểu',
  'dạ',
];

const ENGLISH_FILLERS = [
  'um',
  'uh',
  'like',
  'basically',
  'you know',
  'actually',
  'sort of',
  'kind of',
  'I guess',
  'I mean',
];

export function detectLocalFillerWords(text: string, isVietnamese: boolean): FillerWordMetric[] {
  const dictionary = isVietnamese ? VIETNAMESE_FILLERS : ENGLISH_FILLERS;
  const metrics: FillerWordMetric[] = [];
  const lower = text.toLowerCase();

  for (const filler of dictionary) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|,|\\.)${escaped}(?:\\s|,|\\.|$|\\?|!)`, 'gi');
    const matches = lower.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      // Find snippets for context
      const snippets: string[] = [];
      let match: RegExpExecArray | null;
      const snippetRegex = new RegExp(`(?:\\S+\\s+){0,3}${escaped}(?:\\s+\\S+){0,3}`, 'gi');
      while ((match = snippetRegex.exec(text)) !== null && snippets.length < 3) {
        snippets.push(`"...${match[0].trim()}..."`);
      }

      metrics.push({
        word: filler,
        count,
        contextSnippets: snippets,
      });
    }
  }

  return metrics.sort((a, b) => b.count - a.count);
}

export function computeDeliveryMetrics(turns: TurnDialogue[], sourceLang: string) {
  const allAnswerText = turns.map((t) => t.answer).join(' ');
  const words = allAnswerText.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const averageAnswerWordCount = turns.length > 0 ? Math.round(totalWords / turns.length) : 0;

  const isVietnamese = sourceLang === 'vi-VN' || sourceLang.toLowerCase().includes('viet');
  const fillerWords = detectLocalFillerWords(allAnswerText, isVietnamese);

  // Evaluate pacing by average word count
  let pacingAssessment: 'good' | 'too_fast' | 'too_slow' | 'unbalanced' = 'good';
  if (averageAnswerWordCount < 25) {
    pacingAssessment = 'too_slow'; // Answers too curt/brief
  } else if (averageAnswerWordCount > 180) {
    pacingAssessment = 'too_fast'; // Overly verbose / ramble
  }

  // Count hedging phrases safely across Unicode
  const hedgingList = isVietnamese
    ? ['chắc là', 'em đoán', 'có lẽ', 'em nghĩ']
    : ['maybe', 'I guess', 'I think', 'probably', 'not sure'];
  let hedgingCount = 0;
  const lowerAll = allAnswerText.toLowerCase();
  for (const hedge of hedgingList) {
    const escaped = hedge.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`(?:^|\\s|[.,!?;])${escaped}(?:$|\\s|[.,!?;])`, 'gi');
    const matches = lowerAll.match(reg);
    if (matches) hedgingCount += matches.length;
  }

  return {
    totalWords,
    fillerWords,
    hedgingPhrasesCount: hedgingCount,
    averageAnswerWordCount,
    pacingAssessment,
  };
}

/**
 * Generate comprehensive Communication & Language Coaching Report.
 */
export async function generateCommunicationReport(
  interview: Interview,
  targetLanguageCode: string,
  configInput?: AIConfigInput
): Promise<CommunicationCoachingReport> {
  const turns = extractInterviewTurns(interview.messages);
  if (turns.length === 0) {
    throw new Error('No candidate responses found to analyze in this interview.');
  }

  const inspection = inspectTargetLanguage(targetLanguageCode);
  if (!inspection.isValid) {
    throw new Error(
      inspection.warningMessage || 'Tên ngôn ngữ không hợp lệ. Vui lòng nhập bằng chữ rõ ràng.'
    );
  }

  const sourceLangName = interview.language === 'vi-VN' ? 'Vietnamese (vi-VN)' : 'English (en-US)';
  const targetLangName = inspection.matchedLanguage || inspection.cleanInput;

  const localDelivery = computeDeliveryMetrics(turns, interview.language);
  const prompt = getCommunicationCoachPrompt(interview, turns, sourceLangName, targetLangName);

  const effectiveConfig =
    !configInput || (typeof configInput === 'object' && Object.keys(configInput).length === 0)
      ? getStoredAIConfig()
      : configInput;
  const service = await getService(effectiveConfig);

  try {
    const aiResponse = await service.generateStructured(
      [{ role: 'user', content: prompt }],
      communicationCoachingSchema
    );

    const isRecognized = aiResponse.isTargetLanguageRecognized ?? true;

    // Merge high-precision local metrics with AI-derived insights
    const finalReport: CommunicationCoachingReport = {
      generatedAt: Date.now(),
      sourceLanguage: sourceLangName,
      targetLanguage: isRecognized ? targetLangName : 'English (US / International)',
      requestedLanguage: targetLanguageCode,
      isTargetLanguageRecognized: isRecognized,
      unrecognizedLanguageMessage: isRecognized
        ? undefined
        : aiResponse.unrecognizedLanguageMessage ||
          `Ngôn ngữ "${targetLanguageCode}" không được nhận diện là một ngôn ngữ tự nhiên hợp lệ. Hệ thống đã tự động chuyển đổi phân tích sang Tiếng Anh.`,
      overallScore: aiResponse.overallScore,
      summaryTakeaway: aiResponse.summaryTakeaway,
      deliveryMetrics: {
        totalWords: localDelivery.totalWords,
        fillerWords:
          aiResponse.deliveryMetrics.fillerWords?.length > 0
            ? aiResponse.deliveryMetrics.fillerWords
            : localDelivery.fillerWords,
        hedgingPhrasesCount:
          aiResponse.deliveryMetrics.hedgingPhrasesCount || localDelivery.hedgingPhrasesCount,
        averageAnswerWordCount: localDelivery.averageAnswerWordCount,
        pacingAssessment: aiResponse.deliveryMetrics.pacingAssessment || localDelivery.pacingAssessment,
      },
      turnAnalyses: aiResponse.turnAnalyses,
    };

    // Persist permanently into Dexie if interview has an ID
    if (interview.id) {
      const existing = await db.interviews.get(interview.id);
      if (existing) {
        const updatedFeedback = {
          ...(existing.feedback || {
            score: 7,
            summary: 'Interview feedback',
            strengths: [],
            weaknesses: [],
            keyQuestionAnalysis: [],
            mermaidGraphCurrent: 'graph TD; A-->B',
            mermaidGraphPotential: 'graph TD; A-->B',
            recommendedResources: [],
          }),
          communicationCoach: finalReport,
        };
        await db.interviews.update(interview.id, { feedback: updatedFeedback });
      }
    }

    return finalReport;
  } catch (err) {
    logger.error('Failed to generate communication coaching report:', err);
    throw err;
  }
}
