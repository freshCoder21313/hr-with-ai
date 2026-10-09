export interface CoachingLanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const COACHING_LANGUAGES: CoachingLanguageOption[] = [
  { code: 'en-US', label: 'English (US / International)', flag: '🇺🇸' },
  { code: 'vi-VN', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', label: 'Mandarin Chinese', flag: '🇨🇳' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
  { code: 'de-DE', label: 'German', flag: '🇩🇪' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
];

export interface PopularCustomLanguage {
  label: string;
  code: string;
  flag: string;
}

export const POPULAR_CUSTOM_LANGUAGES: PopularCustomLanguage[] = [
  { label: 'Russian', code: 'Russian', flag: '🇷🇺' },
  { label: 'Italian', code: 'Italian', flag: '🇮🇹' },
  { label: 'Portuguese', code: 'Portuguese', flag: '🇵🇹' },
  { label: 'Swedish', code: 'Swedish', flag: '🇸🇪' },
  { label: 'Thai', code: 'Thai', flag: '🇹🇭' },
  { label: 'Dutch', code: 'Dutch', flag: '🇳🇱' },
  { label: 'Arabic', code: 'Arabic', flag: '🇸🇦' },
  { label: 'Polish', code: 'Polish', flag: '🇵🇱' },
];

interface CatalogEntry {
  canonicalName: string;
  aliases: string[];
}

const EXTENDED_CATALOG: CatalogEntry[] = [
  {
    canonicalName: 'English (US / International)',
    aliases: ['en', 'en-us', 'en-gb', 'english', 'tiếng anh', 'tieng anh', 'anh'],
  },
  {
    canonicalName: 'Tiếng Việt (Vietnamese)',
    aliases: ['vi', 'vi-vn', 'vietnamese', 'tiếng việt', 'tieng viet', 'việt nam'],
  },
  {
    canonicalName: '日本語 (Japanese)',
    aliases: ['ja', 'ja-jp', 'japanese', 'nihongo', 'tiếng nhật', 'tieng nhat', 'nhật bản', 'nhật'],
  },
  {
    canonicalName: '한국어 (Korean)',
    aliases: ['ko', 'ko-kr', 'korean', 'hangul', 'tiếng hàn', 'tieng han', 'hàn quốc', 'hàn'],
  },
  {
    canonicalName: '中文 (Mandarin Chinese)',
    aliases: [
      'zh',
      'zh-cn',
      'chinese',
      'mandarin',
      'tiếng trung',
      'tieng trung',
      'tiếng hoa',
      'trung quốc',
    ],
  },
  {
    canonicalName: 'Français (French)',
    aliases: ['fr', 'fr-fr', 'french', 'tiếng pháp', 'tieng phap', 'pháp'],
  },
  {
    canonicalName: 'Deutsch (German)',
    aliases: ['de', 'de-de', 'german', 'tiếng đức', 'tieng duc', 'đức'],
  },
  {
    canonicalName: 'Español (Spanish)',
    aliases: ['es', 'es-es', 'spanish', 'castellano', 'tiếng tây ban nha', 'tay ban nha'],
  },
  {
    canonicalName: 'Russian (Русский)',
    aliases: ['ru', 'rus', 'russian', 'tiếng nga', 'tieng nga', 'nga', 'русский'],
  },
  {
    canonicalName: 'Italian (Italiano)',
    aliases: ['it', 'ita', 'italian', 'italiano', 'tiếng ý', 'tieng y', 'ý'],
  },
  {
    canonicalName: 'Portuguese (Português)',
    aliases: ['pt', 'por', 'portuguese', 'português', 'tiếng bồ đào nha', 'bồ đào nha'],
  },
  {
    canonicalName: 'Swedish (Svenska)',
    aliases: ['sv', 'swe', 'swedish', 'svenska', 'tiếng thụy điển', 'thụy điển'],
  },
  {
    canonicalName: 'Thai (ภาษาไทย)',
    aliases: ['th', 'tha', 'thai', 'tiếng thái', 'tieng thai', 'thái lan', 'thái'],
  },
  {
    canonicalName: 'Dutch (Nederlands)',
    aliases: ['nl', 'nld', 'dutch', 'nederlands', 'tiếng hà lan', 'hà lan'],
  },
  {
    canonicalName: 'Arabic (العربية)',
    aliases: ['ar', 'ara', 'arabic', 'tiếng ả rập', 'ả rập', 'tieng a rap'],
  },
  {
    canonicalName: 'Polish (Polski)',
    aliases: ['pl', 'pol', 'polish', 'polski', 'tiếng ba lan', 'ba lan'],
  },
  {
    canonicalName: 'Turkish (Türkçe)',
    aliases: ['tr', 'tur', 'turkish', 'türkçe', 'tiếng thổ nhĩ kỳ', 'thổ nhĩ kỳ'],
  },
  { canonicalName: 'Hindi (हिन्दी)', aliases: ['hi', 'hin', 'hindi', 'tiếng hindi'] },
  {
    canonicalName: 'Indonesian (Bahasa)',
    aliases: [
      'id',
      'ind',
      'indonesian',
      'bahasa indonesia',
      'tiếng indonesia',
      'tiếng indo',
      'indo',
    ],
  },
  { canonicalName: 'Greek (Ελληνικά)', aliases: ['el', 'ell', 'greek', 'tiếng hy lạp', 'hy lạp'] },
  {
    canonicalName: 'Danish (Dansk)',
    aliases: ['da', 'dan', 'danish', 'dansk', 'tiếng đan mạch', 'đan mạch'],
  },
  {
    canonicalName: 'Norwegian (Norsk)',
    aliases: ['no', 'nor', 'norwegian', 'norsk', 'tiếng na uy', 'na uy'],
  },
  {
    canonicalName: 'Finnish (Suomi)',
    aliases: ['fi', 'fin', 'finnish', 'suomi', 'tiếng phần lan', 'phần lan'],
  },
  {
    canonicalName: 'Czech (Čeština)',
    aliases: ['cs', 'ces', 'czech', 'čeština', 'tiếng séc', 'séc'],
  },
  {
    canonicalName: 'Ukrainian (Українська)',
    aliases: ['uk', 'ukr', 'ukrainian', 'tiếng ukraina', 'ukraina'],
  },
  { canonicalName: 'Hebrew (עברית)', aliases: ['he', 'heb', 'hebrew', 'tiếng do thái', 'do thái'] },
  {
    canonicalName: 'Hungarian (Magyar)',
    aliases: ['hu', 'hun', 'hungarian', 'magyar', 'tiếng hungary', 'hungary'],
  },
  {
    canonicalName: 'Malay (Bahasa Melayu)',
    aliases: ['ms', 'msa', 'malay', 'tiếng mã lai', 'mã lai'],
  },
  {
    canonicalName: 'Tagalog / Filipino',
    aliases: ['tl', 'fil', 'tagalog', 'filipino', 'tiếng philippines'],
  },
  { canonicalName: 'Latin', aliases: ['la', 'lat', 'latin', 'tiếng la-tinh', 'tiếng latin'] },
  { canonicalName: 'Esperanto', aliases: ['eo', 'epo', 'esperanto'] },
];

export interface TargetLanguageInspection {
  rawInput: string;
  cleanInput: string;
  isValid: boolean;
  isRecognized: boolean;
  matchedLanguage?: string;
  warningMessage?: string;
}

/**
 * Inspects, validates, and normalizes user-provided target language input.
 */
export function inspectTargetLanguage(rawInput: string | undefined): TargetLanguageInspection {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      rawInput: '',
      cleanInput: '',
      isValid: false,
      isRecognized: false,
      warningMessage: 'Please select or enter the target language you want to practice.',
    };
  }

  const clean = rawInput.trim();
  if (clean.length === 0) {
    return {
      rawInput,
      cleanInput: '',
      isValid: false,
      isRecognized: false,
      warningMessage: 'Please select or enter the target language you want to practice.',
    };
  }

  // Check if string contains ANY letters (Unicode letters \p{L})
  const lettersOnly = clean.replace(/[^\p{L}]/gu, '');
  if (lettersOnly.length === 0) {
    return {
      rawInput,
      cleanInput: clean,
      isValid: false,
      isRecognized: false,
      warningMessage:
        'Invalid language name. Please enter text (e.g., Swedish, Russian, Italian...).',
    };
  }

  if (lettersOnly.length < 2) {
    return {
      rawInput,
      cleanInput: clean,
      isValid: false,
      isRecognized: false,
      warningMessage: 'Language name is too short (minimum 2 characters, e.g., ru, Italian).',
    };
  }

  // Check exact preset match
  const presetMatch = COACHING_LANGUAGES.find(
    (l) =>
      l.code.toLowerCase() === clean.toLowerCase() || l.label.toLowerCase() === clean.toLowerCase()
  );
  if (presetMatch) {
    return {
      rawInput,
      cleanInput: clean,
      isValid: true,
      isRecognized: true,
      matchedLanguage: `${presetMatch.flag} ${presetMatch.label}`,
    };
  }

  // Check normalized matching in catalog
  const normalizedLower = clean.toLowerCase();
  for (const entry of EXTENDED_CATALOG) {
    if (
      entry.canonicalName.toLowerCase() === normalizedLower ||
      entry.aliases.some((alias) => alias === normalizedLower || normalizedLower.includes(alias))
    ) {
      return {
        rawInput,
        cleanInput: clean,
        isValid: true,
        isRecognized: true,
        matchedLanguage: entry.canonicalName,
      };
    }
  }

  // Check if input has standard linguistic indicators (e.g. "Tiếng ...", "... language", "... dialect")
  const hasLinguisticKeywords =
    /(?:^|\s)(?:tiếng|ngôn ngữ|language|dialect|idioma|langue|sprache)(?:$|\s)/i.test(clean);
  if (hasLinguisticKeywords) {
    return {
      rawInput,
      cleanInput: clean,
      isValid: true,
      isRecognized: true,
      matchedLanguage: clean,
    };
  }

  // Valid format string (alphabetic text), but not in predefined common dictionary.
  // Flag as unrecognized so AI can inspect and fallback if it is gibberish.
  return {
    rawInput,
    cleanInput: clean,
    isValid: true,
    isRecognized: false,
    matchedLanguage: clean,
    warningMessage: `Language "${clean}" is not in the standard catalog. AI will verify validity; if unrecognized, English will be used as fallback.`,
  };
}

export function getLanguageNameByCode(code: string): string {
  const inspection = inspectTargetLanguage(code);
  if (inspection.isValid && inspection.matchedLanguage) {
    return inspection.matchedLanguage;
  }
  const match = COACHING_LANGUAGES.find((l) => l.code === code);
  return match ? `${match.flag} ${match.label}` : code;
}
