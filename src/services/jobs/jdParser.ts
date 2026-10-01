/**
 * Heuristic & Regex-based Job Description (JD) Parser.
 *
 * Extracts structured job information (company, title, experience level,
 * requirements, responsibilities, benefits, career growth, salary, location,
 * employment type, and suggested tailoring prompt)
 * from raw text without requiring AI API calls.
 */

export interface ParsedJobData {
  company: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits?: string[];
  careerGrowth?: string[];
  salary?: string;
  location?: string;
  employmentType?: string;
  experienceLevel?: 'intern' | 'fresher' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager';
  suggestedCustomPrompt: string;
  detectedSkills?: string[];
  url?: string;
}

// ---------------------------------------------------------------------------
// Patterns for Job Titles & Seniority
// ---------------------------------------------------------------------------
const TITLE_PREFIX_REGEX =
  /^(?:#+\s*)?(?:job\s*title|position|role|vị\s*trí|tuyển\s*dụng|chức\s*danh|tiêu\s*đề|title)\s*[:：\-–—]\s*([^\n\r]+)/im;

const TITLE_SENIORITY_MAP: Array<{
  regex: RegExp;
  level: ParsedJobData['experienceLevel'];
}> = [
  { regex: /\b(intern|internship|thực\s*tập\s*sinh|thực\s*tập)\b/i, level: 'intern' },
  {
    regex:
      /\b(fresher|mới\s*tốt\s*nghiệp|sinh\s*viên\s*mới|không\s*yêu\s*cầu\s*kinh\s*nghiệm|chưa\s*có\s*kinh\s*nghiệm|được\s*đào\s*tạo|entry\s*level|trainee|no\s*experience\s*required)\b/i,
    level: 'fresher',
  },
  { regex: /\b(team\s*lead|tech\s*lead|technical\s*lead|trưởng\s*nhóm)\b/i, level: 'lead' },
  { regex: /\b(engineering\s*manager|general\s*manager|trưởng\s*phòng|quản\s*lý|giám\s*đốc|head\s*of|director|manager)\b/i, level: 'manager' },
  { regex: /\b(senior|sr\.?|chuyên\s*viên\s*cao\s*cấp|kỹ\s*sư\s*cao\s*cấp)\b/i, level: 'senior' },
  { regex: /\b(junior|jr\.?)\b/i, level: 'junior' },
  { regex: /\b(middle|mid-level|mid\s*level)\b/i, level: 'mid' },
];

const BODY_SENIORITY_RULES: Array<{
  regex: RegExp;
  level: ParsedJobData['experienceLevel'];
}> = [
  { regex: /(?:^|[^a-zA-Z0-9À-ỹ])(thực\s*tập\s*sinh|sinh\s*viên\s*năm\s*cuối|thực\s*tập\s*tốt\s*nghiệp)(?:$|[^a-zA-Z0-9À-ỹ])/i, level: 'intern' },
  {
    regex:
      /(?:^|[^a-zA-Z0-9À-ỹ])(không\s*yêu\s*cầu\s*kinh\s*nghiệm|chưa\s*có\s*kinh\s*nghiệm|được\s*đào\s*tạo\s*(?:từ\s*đầu|100%|bài\s*bản)|sinh\s*viên\s*mới\s*tốt\s*nghiệp|no\s*experience\s*required|0\s*[-–]\s*1\s*(?:năm|years?))(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'fresher',
  },
  {
    regex: /(?:^|[^a-zA-Z0-9À-ỹ])(vị\s*trí\s*quản\s*lý|kinh\s*nghiệm\s*quản\s*lý|vai\s*trò\s*quản\s*lý|trưởng\s*phòng|giám\s*đốc|management\s*experience|lead\s*and\s*manage)(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'manager',
  },
  {
    regex: /(?:^|[^a-zA-Z0-9À-ỹ])(trưởng\s*nhóm|tech\s*lead|team\s*lead|technical\s*lead|lead\s*a\s*team)(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'lead',
  },
  {
    regex:
      /(?:^|[^a-zA-Z0-9À-ỹ])(từ\s*5\s*năm|5\+\s*(?:năm|years?)|5\s*năm\s*trở\s*lên|4\+\s*(?:năm|years?)|4\s*năm\s*trở\s*lên|chuyên\s*viên\s*cao\s*cấp|kỹ\s*sư\s*cao\s*cấp)(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'senior',
  },
  {
    regex: /(?:^|[^a-zA-Z0-9À-ỹ])(1\s*[-–]\s*2\s*(?:năm|years?)|từ\s*1\s*(?:đến|-)\s*2\s*năm|dưới\s*2\s*năm|1\+\s*(?:năm|years?)|1\s*năm\s*kinh\s*nghiệm)(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'junior',
  },
  {
    regex:
      /(?:^|[^a-zA-Z0-9À-ỹ])(2\s*[-–]\s*4\s*(?:năm|years?)|từ\s*2\s*(?:đến|-)\s*4\s*năm|3\+?\s*(?:năm|years?)|từ\s*3\s*năm|2\+\s*(?:năm|years?)|2\s*[-–]\s*3\s*(?:năm|years?)|từ\s*2\s*năm)(?:$|[^a-zA-Z0-9À-ỹ])/i,
    level: 'mid',
  },
];

const KNOWN_TITLE_KEYWORDS = [
  // Tech & Engineering (EN)
  'developer',
  'engineer',
  'programmer',
  'architect',
  'designer',
  'analyst',
  'tester',
  'specialist',
  'consultant',
  'administrator',
  'officer',
  'executive',
  'intern',
  'fresher',
  'accountant',
  'manager',
  'lead',
  'director',
  // Vietnamese titles & professions
  'nhân viên',
  'chuyên viên',
  'kỹ sư',
  'lập trình viên',
  'thực tập sinh',
  'trưởng nhóm',
  'trưởng phòng',
  'kiến trúc sư',
  'thiết kế',
  'quản trị viên',
  'giám sát',
  'phát triển',
  'kỹ thuật viên',
  'cán bộ',
  'kế toán',
  'quản lý',
  'giám đốc',
  'tuyển dụng',
];

const BOILERPLATE_LINES = [
  /^apply now$/i,
  /^easy apply$/i,
  /^save job$/i,
  /^job details$/i,
  /^here’s how the job details align with your profile/i,
  /^here's how the job details align with your profile/i,
  /^pay$/i,
  /^salary$/i,
  /^job type$/i,
  /^full job description$/i,
  /^đăng ký ngay$/i,
  /^ứng tuyển ngay$/i,
  /^lưu công việc$/i,
  /^chi tiết công việc$/i,
  /^mô tả công việc chi tiết$/i,
  /^nộp đơn ứng tuyển$/i,
  /^toàn thời gian$/i,
  /^bán thời gian$/i,
  /^cố định$/i,
  /^hợp đồng$/i,
  /^remote$/i,
  /^hybrid$/i,
  /^on-site$/i,
  /^làm việc trực tiếp$/i,
  /^làm việc từ xa$/i,
  /^show more$/i,
  /^show less$/i,
  /^posted \d+.*$/i,
  /^mục lương\s*[:：].*$/i,
  /^mức lương\s*[:：].*$/i,
  /^địa điểm việc làm\s*[:：].*$/i,
  /^địa điểm làm việc\s*[:：].*$/i,
  /^nơi làm việc\s*[:：].*$/i,
  /^hạn nộp hồ sơ\s*[:：].*$/i,
  /^số lượng tuyển\s*[:：].*$/i,
  /^\d+[,.\d]*\s*(?:vnđ|vnd|usd|\$|₫)\s*[-–]\s*\d+[,.\d]*\s*(?:vnđ|vnd|usd|\$|₫)(?:\s*(?:a\s*month|tháng|một\s*tháng|\/tháng))?$/i,
  /^(?:thành phố hồ chí minh|hồ chí minh|tp\.?\s*hcm|hà nội|đà nẵng|bình dương|đồng nai|cần thơ|hải phòng)$/i,
  /^[•·\-*|/–—]$/,
];

function isBoilerplate(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return BOILERPLATE_LINES.some((pattern) => pattern.test(trimmed));
}

// ---------------------------------------------------------------------------
// Patterns for Company Names
// ---------------------------------------------------------------------------
const COMPANY_PREFIX_REGEX =
  /^(?:company(?:\s*name)?|công\s*ty|doanh\s*nghiệp|employer|client|tập\s*đoàn|tên\s*công\s*ty)\s*[:：\-–—]\s*([^\n\r]+)/im;

const COMPANY_SUFFIX_REGEX =
  /\b(co\.?,?\s*ltd\.?|ltd\.?|inc\.?|corp\.?|corporation|jsc|tnhh|gmbh|llc|holdings?|group|vietnam|việt\s*nam|global|software|solutions|technologies|technology|studio|agency|bank|ngân\s*hàng|viện|trung\s*tâm)\b/i;

const NON_COMPANY_START_WORDS = [
  'what',
  'how',
  'why',
  'job',
  'role',
  'responsibilities',
  'requirements',
  'mô tả',
  'yêu cầu',
  'quyền lợi',
  'thành phố',
  'hà nội',
  'hồ chí minh',
  'tp.hcm',
  'apply',
  'save',
  'here',
  'pay',
  'salary',
  'toàn thời gian',
  'cố định',
  'địa điểm',
  'mục lương',
  'mức lương',
];

// ---------------------------------------------------------------------------
// Metadata Extraction Patterns (Salary, Location, Employment Type)
// ---------------------------------------------------------------------------
const SALARY_PREFIX_REGEX =
  /^(?:#+\s*)?(?:mục\s*lương|mức\s*lương|thu\s*nhập(?:\s*từ)?|lương|salary|pay|compensation)\s*[:：\-–—]\s*([^\n\r]+)/im;

const SALARY_PATTERN_REGEX =
  /(?:(?:lương|thu nhập|mức lương|mục lương|pay|salary)\s*[:：\-–—]?\s*)?(\$?\d+[,.\d]*\s*(?:triệu|tr|m|k|vnđ|vnd|usd|\$|₫)\s*[-–]\s*\$?\d+[,.\d]*\s*(?:triệu|tr|m|k|vnđ|vnd|usd|\$|₫)(?:\s*(?:a\s*month|tháng|một\s*tháng|\/tháng|gross|net))?)/i;

const LOCATION_PREFIX_REGEX =
  /^(?:#+\s*)?(?:địa\s*điểm(?:\s*việc\s*làm|\s*làm\s*việc)?|nơi\s*làm\s*việc|work\s*location|location|văn\s*phòng)\s*[:：\-–—]\s*([^\n\r]+)/im;

const KNOWN_LOCATIONS = [
  'Thành phố Hồ Chí Minh',
  'TP. Hồ Chí Minh',
  'TP.HCM',
  'TP HCM',
  'Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Bình Dương',
  'Đồng Nai',
  'Cần Thơ',
  'Remote',
  'Hybrid',
  'On-site',
  'Làm việc trực tiếp',
  'Làm việc từ xa',
];

const EMPLOYMENT_TYPE_PREFIX_REGEX =
  /^(?:#+\s*)?(?:job\s*type|hình\s*thức\s*làm\s*việc|loại\s*hình\s*công\s*việc|employment\s*type)\s*[:：\-–—]\s*([^\n\r]+)/im;

const KNOWN_EMPLOYMENT_TYPES = [
  'Toàn thời gian',
  'Full-time',
  'Bán thời gian',
  'Part-time',
  'Cố định',
  'Hợp đồng',
  'Contract',
  'Thực tập',
  'Internship',
];

// ---------------------------------------------------------------------------
// Section Splitters
// ---------------------------------------------------------------------------
const RESPONSIBILITIES_HEADER_REGEX =
  /^(?:#+\s*|\d+[.)]\s*)?(?:responsibilities|duties|what\s+you(?:'ll|\s+will)\s+do|key\s+responsibilities|job\s+description|main\s+tasks|mô\s+tả\s+công\s+việc|trách\s+nhiệm\s+công\s+việc|trách\s+nhiệm|nhiệm\s+vụ\s+chính|nhiệm\s+vụ|bạn\s+sẽ\s+làm\s+gì|công\s+việc\s+chính|mô\s+tả\s+chi\s+tiết|vị\s+trí\s+này\s+sẽ\s+làm\s+gì)\s*[:：\-–—]?\s*$/im;

const REQUIREMENTS_HEADER_REGEX =
  /^(?:#+\s*|\d+[.)]\s*)?(?:requirements|qualifications|what\s+you(?:'ll|\s+will)\s+need|must\s+have|skills\s*&\s*experience|skills\s+required|candidate\s+requirements|your\s+skills\s+and\s+experience|who\s+you\s+are|yêu\s+cầu\s+ứng\s+viên|yêu\s+cầu\s+công\s+việc|yêu\s+cầu|kỹ\s+năng\s+cần\s+có|tiêu\s+chuẩn\s+ứng\s+viên|điều\s+kiện\s+ứng\s+tuyển|kinh\s+nghiệm\s*&\s*kỹ\s+năng)\s*[:：\-–—]?\s*$/im;

const BENEFITS_HEADER_REGEX =
  /^(?:#+\s*|\d+[.)]\s*)?(?:benefits|what\s+we\s+offer|why\s+you(?:'ll|\s+will)\s+love\s+working\s+here|what\s+you\s+will\s+get|perks|compensation|quyền\s+lợi\s+ứng\s+viên|quyền\s+lợi|chế\s+độ\s+đãi\s+ngộ|đãi\s+ngộ|thu\s+nhập\s*&\s*thưởng|phúc\s+lợi|chính\s+sách\s+phúc\s+lợi)\s*[:：\-–—]?\s*$/im;

const CAREER_GROWTH_HEADER_REGEX =
  /^(?:#+\s*|\d+[.)]\s*)?(?:career\s+growth|growth\s+opportunities|career\s+path|development|cơ\s+hội\s+phát\s+triển|lộ\s+trình\s+nghề\s+nghiệp|lộ\s+trình\s+thăng\s+tiến|phát\s+triển\s+bản\s+thân)\s*[:：\-–—]?\s*$/im;

// Common Tech & Professional Skill Keywords for Custom Prompt Generation
const TOP_TECH_KEYWORDS = [
  // Frontend & UI
  'React',
  'Vue',
  'Angular',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'Redux',
  'Zustand',
  'Figma',
  // Backend & Cloud
  'Node.js',
  'Python',
  'Django',
  'FastAPI',
  'Golang',
  'Java',
  'Spring Boot',
  'C#',
  '.NET',
  'PHP',
  'Laravel',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'CI/CD',
  'GraphQL',
  'RESTful API',
  'REST API',
  'Microservices',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Kafka',
  'Elasticsearch',
  // Mobile
  'Flutter',
  'React Native',
  'Swift',
  'Kotlin',
  // Testing & AI
  'Unit Test',
  'Jest',
  'Cypress',
  'Selenium',
  'Playwright',
  'PyTorch',
  'TensorFlow',
  'RAG',
  'LLMs',
  'LangChain',
  'Agile',
  'Scrum',
  'System Design',
  'Power BI',
  'Tableau',
  'SQL',
  // Engineering / CAD / BIM / Non-IT
  'AutoCAD',
  'SolidWorks',
  'Revit',
  'BIM',
  'Tekla',
  'Inventor',
  'Civil 3D',
  'MISA',
  'FAST',
  'Báo cáo tài chính',
  'Thuế',
  'Talent Acquisition',
  'Tuyển dụng',
  'C&B',
  'Payroll',
  'KPI',
  'SEO',
  'Google Ads',
  'Facebook Ads',
  'Performance Optimization',
];

/**
 * Clean lines and bullet points
 */
function cleanBulletList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isBoilerplate(line))
    .map((line) => line.replace(/^[-*•·–—+]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 3 && !line.startsWith('#'));
}

/**
 * Determine Seniority Level:
 * Prioritizes Title match, then falls back to whole text analysis.
 */
function extractSeniorityLevel(title: string, rawText: string): ParsedJobData['experienceLevel'] {
  // 1. Check title first (highest precedence)
  for (const { regex, level } of TITLE_SENIORITY_MAP) {
    if (regex.test(title)) {
      return level;
    }
  }

  // 2. Check full text (excluding common false positive phrases like "mentor junior", "Google Tag Manager", "Hiring Manager", etc.)
  const sanitizedText = rawText
    .replace(/mentor(?:ing)?\s+junior\s+(?:developers?|engineers?|members?)/gi, '')
    .replace(/(?:Google\s+Tag\s+Manager|Tag\s+Manager)/gi, '')
    .replace(/(?:Hiring\s+Manager|Project\s+Manager|Product\s+Manager|Account\s+Manager)/gi, '')
    .replace(/(?:báo\s*cáo\s*(?:cho|trực\s*tiếp\s*cho)?\s*quản\s*lý|phân\s*công\s*của\s*quản\s*lý|report\s*to\s*manager)/gi, '');

  for (const { regex, level } of BODY_SENIORITY_RULES) {
    if (regex.test(sanitizedText)) {
      return level;
    }
  }

  return undefined;
}

/**
 * Extract Job Title and detect seniority
 */
function extractJobTitle(lines: string[], rawText: string): { title: string; level?: ParsedJobData['experienceLevel'] } {
  // 1. Check explicit prefix
  const prefixMatch = rawText.match(TITLE_PREFIX_REGEX);
  let rawTitle = prefixMatch ? prefixMatch[1].trim() : '';

  // 2. If no explicit prefix, inspect initial non-boilerplate lines
  if (!rawTitle) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].replace(/^[#*_\s-]+|[#*_\s-]+$/g, '').trim();
      if (!line || isBoilerplate(line)) continue;

      const lower = line.toLowerCase();
      const hasTitleKeyword = KNOWN_TITLE_KEYWORDS.some((kw) => lower.includes(kw));

      if (hasTitleKeyword && line.length < 120) {
        rawTitle = line;
        break;
      }
    }
  }

  // 3. Fallback to first non-boilerplate line
  if (!rawTitle) {
    for (const line of lines) {
      const cleaned = line.replace(/^[#*_\s-]+|[#*_\s-]+$/g, '').trim();
      if (cleaned.length > 3 && cleaned.length < 90 && !isBoilerplate(cleaned)) {
        rawTitle = cleaned;
        break;
      }
    }
  }

  // Clean title: remove markdown
  const cleanTitle = (rawTitle || 'Target Role').replace(/[*_#`]/g, '').trim();

  // Determine Seniority Level
  const detectedLevel = extractSeniorityLevel(cleanTitle, rawText);

  return { title: cleanTitle, level: detectedLevel };
}

/**
 * Extract Company Name from raw text
 */
function extractCompanyName(lines: string[], rawText: string, detectedTitle: string): string {
  // 1. Check explicit prefix: "Company: ...", "Công ty: ..."
  const prefixMatch = rawText.match(COMPANY_PREFIX_REGEX);
  if (prefixMatch && prefixMatch[1].trim().length > 1) {
    const candidate = prefixMatch[1].trim().replace(/[*_#`]/g, '').replace(/[,;:.]$/, '').trim();
    if (candidate.length < 80) return candidate;
  }

  // 2. Check second/third non-empty non-boilerplate line after title (Indeed / LinkedIn / TopCV copy-pastes)
  const nonBoilerplateLines = lines.filter((l) => {
    const trimmed = l.trim();
    if (isBoilerplate(trimmed) || trimmed.length === 0) return false;
    if (/^[-*•·–—+]|\d+[.)]/.test(trimmed)) return false;
    if (/[:：]$/.test(trimmed)) return false;
    return true;
  });

  for (let i = 0; i < Math.min(nonBoilerplateLines.length, 5); i++) {
    const candidate = nonBoilerplateLines[i].replace(/^[#*_\s-]+|[#*_\s-]+$/g, '').trim();
    if (candidate === detectedTitle) continue;

    // Check if candidate contains Company suffixes (Co., Ltd, JSC, Vietnam, Corp, Inc, etc.)
    if (COMPANY_SUFFIX_REGEX.test(candidate) && candidate.length < 80) {
      return candidate;
    }

    // Check if it's a valid standalone company line
    const cleanWord = candidate.split(/[\s:：]+/)[0]?.toLowerCase() || '';
    if (
      i <= 2 &&
      candidate.length >= 2 &&
      candidate.length < 60 &&
      !NON_COMPANY_START_WORDS.includes(cleanWord) &&
      !/(?:vnđ|vnd|\$|usd|lương|pay|tháng|month|vietnamworks|indeed|linkedin|hồ chí minh|hà nội|đà nẵng|responsibilities|requirements|qualifications)/i.test(candidate) &&
      !candidate.includes(':') &&
      /^[A-ZÀ-Ỹ]/.test(candidate)
    ) {
      return candidate;
    }
  }

  // 3. Check single-line "Hiring pattern": "[Company Name] đang tuyển dụng", "[Company] is hiring"
  const hiringMatch = rawText.match(/(?:^|\n)\s*([A-ZÀ-Ỹa-zà-ỹ0-9\s&.,'-]{2,50})\s+(?:đang tuyển dụng|tuyển dụng|is hiring|is looking for)/i);
  if (hiringMatch && hiringMatch[1]) {
    const candidate = hiringMatch[1].trim().replace(/[*_#`]/g, '').replace(/[,;:.]$/, '').trim();
    const forbidden = ['chúng tôi', 'công ty', 'hiện tại', 'we', 'our team', 'team'];
    if (!forbidden.includes(candidate.toLowerCase()) && candidate.length > 2 && candidate.length < 60) {
      return candidate;
    }
  }

  // 4. Check "About [Company]" pattern
  const aboutMatch = rawText.match(/(?:about\s+(?:the\s+)?([A-ZÀ-Ỹ0-9][A-Za-zÀ-ỹ0-9\s&.,'-]{2,40}))(?:\s*[:\n]|\s+is|\s+we)/i);
  if (aboutMatch && aboutMatch[1]) {
    const candidate = aboutMatch[1].trim().replace(/[*_#`]/g, '').replace(/[,;:.]$/, '').trim();
    const forbidden = ['company', 'the company', 'us', 'our team', 'this role', 'the role', 'the position', 'position'];
    if (!forbidden.includes(candidate.toLowerCase()) && candidate.length < 50) return candidate;
  }

  // 5. Check "At [Company], we are...", "Join [Company] to..."
  const atMatch = rawText.match(/(?:^|\s)(?:at|join|joining|welcome to)\s+([A-ZÀ-Ỹ0-9][A-Za-zÀ-ỹ0-9\s&'-]{1,35})(?:\s+to|\s+is|\s+we|\s+team|[,;:.])/i);
  if (atMatch && atMatch[1]) {
    const candidate = atMatch[1].trim().replace(/[*_#`]/g, '').replace(/[,;:.]$/, '').trim();
    const forbidden = ['the', 'our', 'a', 'this', 'an', 'your', 'us', 'scale', 'build'];
    if (!forbidden.includes(candidate.toLowerCase()) && candidate.length < 40) {
      return candidate;
    }
  }

  // 6. Default
  return 'Target Company';
}

/**
 * Extract Metadata: Salary, Location, Employment Type
 */
function extractJobMetadata(rawLines: string[], rawText: string): {
  salary?: string;
  location?: string;
  employmentType?: string;
} {
  let salary: string | undefined;
  let location: string | undefined;
  let employmentType: string | undefined;

  // 1. Check Salary Prefix & Patterns
  const salaryPrefixMatch = rawText.match(SALARY_PREFIX_REGEX);
  if (salaryPrefixMatch && salaryPrefixMatch[1]) {
    salary = salaryPrefixMatch[1].trim().replace(/[*_#`]/g, '');
  } else {
    const salaryPatternMatch = rawText.match(SALARY_PATTERN_REGEX);
    if (salaryPatternMatch && salaryPatternMatch[1]) {
      salary = salaryPatternMatch[1].trim();
    }
  }

  // 2. Check Location Prefix & Known Locations
  const locationPrefixMatch = rawText.match(LOCATION_PREFIX_REGEX);
  if (locationPrefixMatch && locationPrefixMatch[1]) {
    location = locationPrefixMatch[1].trim().replace(/[*_#`]/g, '');
  } else {
    for (const loc of KNOWN_LOCATIONS) {
      const regex = new RegExp(`(?:^|\\n)\\s*${loc.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*(?:\\n|$)`, 'i');
      if (regex.test(rawText)) {
        location = loc;
        break;
      }
    }
  }

  // 3. Check Employment Type
  const empPrefixMatch = rawText.match(EMPLOYMENT_TYPE_PREFIX_REGEX);
  if (empPrefixMatch && empPrefixMatch[1]) {
    employmentType = empPrefixMatch[1].trim().replace(/[*_#`]/g, '');
  } else {
    for (const emp of KNOWN_EMPLOYMENT_TYPES) {
      const regex = new RegExp(`(?:^|\\n)\\s*${emp.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*(?:\\n|$)`, 'i');
      if (regex.test(rawText)) {
        employmentType = emp;
        break;
      }
    }
  }

  return { salary, location, employmentType };
}

/**
 * Extract Job URL from raw text (e.g. from Job URL prefix, or standard http/https/www URLs).
 */
export function extractJobUrl(rawText: string): string | undefined {
  if (!rawText || typeof rawText !== 'string') return undefined;

  // 1. Check explicit prefix: "Job URL: ...", "Link: ...", "Link tuyển dụng: ...", "Nguồn: ..."
  const prefixRegex =
    /(?:^|\n)\s*(?:(?:job\s*)?(?:url|link)|link\s*(?:tuyển\s*dụng|ứng\s*tuyển|công\s*việc|gốc)|nguồn(?:\s*tuyển\s*dụng)?|source)\s*[:：\-–—]\s*([^\s<>()]+)/i;
  const prefixMatch = rawText.match(prefixRegex);
  if (prefixMatch && prefixMatch[1]) {
    let candidate = prefixMatch[1].trim().replace(/[.,;:)\]'">]+$/, '');
    if (candidate.startsWith('www.')) {
      candidate = `https://${candidate}`;
    }
    if (/^https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(candidate)) {
      return candidate;
    }
  }

  // 2. Generic URL in full text
  const urlRegex = /\b(https?:\/\/[^\s<>()"']+|www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+[^\s<>()"']*)/i;
  const match = rawText.match(urlRegex);
  if (match && match[1]) {
    let candidate = match[1].trim().replace(/[.,;:)\]'">]+$/, '');
    if (candidate.startsWith('www.')) {
      candidate = `https://${candidate}`;
    }
    if (/^https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Main parser function: parse raw JD string into structured ParsedJobData
 */
export function parseRawJobDescription(rawText: string): ParsedJobData {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      company: 'Target Company',
      title: 'Target Role',
      description: '',
      requirements: [],
      responsibilities: [],
      benefits: [],
      careerGrowth: [],
      suggestedCustomPrompt: 'Emphasize relevant technical experience, quantifiable achievements, and leadership skills.',
      detectedSkills: [],
      url: undefined,
    };
  }

  const normalizedText = rawText.trim();
  const rawLines = normalizedText.split(/\r?\n/).map((l) => l.trim());
  const nonBlankLines = rawLines.filter((l) => l.length > 0);

  // 1. Extract Title & Level
  const { title, level } = extractJobTitle(nonBlankLines, normalizedText);

  // 2. Extract Company
  const company = extractCompanyName(nonBlankLines, normalizedText, title);

  // 3. Extract Metadata & URL
  const { salary, location, employmentType } = extractJobMetadata(rawLines, normalizedText);
  const url = extractJobUrl(normalizedText);

  // 4. Segment Sections
  const responsibilitiesLines: string[] = [];
  const requirementsLines: string[] = [];
  const benefitsLines: string[] = [];
  const careerGrowthLines: string[] = [];
  const overviewLines: string[] = [];

  type CurrentSection = 'overview' | 'responsibilities' | 'requirements' | 'benefits' | 'careerGrowth' | 'other';
  let currentSection: CurrentSection = 'overview';

  for (const line of rawLines) {
    if (!line || isBoilerplate(line)) continue;

    // Check for section headers
    if (RESPONSIBILITIES_HEADER_REGEX.test(line)) {
      currentSection = 'responsibilities';
      continue;
    }
    if (REQUIREMENTS_HEADER_REGEX.test(line)) {
      currentSection = 'requirements';
      continue;
    }
    if (BENEFITS_HEADER_REGEX.test(line)) {
      currentSection = 'benefits';
      continue;
    }
    if (CAREER_GROWTH_HEADER_REGEX.test(line)) {
      currentSection = 'careerGrowth';
      continue;
    }

    // Ignore title / company duplicate lines in overview if at the very start
    if (currentSection === 'overview' && (line === title || line === company)) {
      continue;
    }

    // Collect line into current section
    if (currentSection === 'responsibilities') {
      responsibilitiesLines.push(line);
    } else if (currentSection === 'requirements') {
      requirementsLines.push(line);
    } else if (currentSection === 'benefits') {
      benefitsLines.push(line);
    } else if (currentSection === 'careerGrowth') {
      careerGrowthLines.push(line);
    } else if (currentSection === 'overview') {
      overviewLines.push(line);
    }
  }

  const cleanedRequirements = cleanBulletList(requirementsLines.join('\n'));
  const cleanedResponsibilities = cleanBulletList(responsibilitiesLines.join('\n'));
  const cleanedBenefits = cleanBulletList(benefitsLines.join('\n'));
  const cleanedCareerGrowth = cleanBulletList(careerGrowthLines.join('\n'));

  // 5. Build Clean Description
  let cleanDescription = '';
  if (overviewLines.length > 0) {
    cleanDescription += overviewLines.join('\n') + '\n\n';
  }
  if (cleanedResponsibilities.length > 0) {
    cleanDescription += 'Key Responsibilities:\n' + cleanedResponsibilities.map((r) => `• ${r}`).join('\n') + '\n\n';
  }
  if (cleanedRequirements.length > 0) {
    cleanDescription += 'Requirements:\n' + cleanedRequirements.map((r) => `• ${r}`).join('\n') + '\n\n';
  }
  if (cleanedBenefits.length > 0) {
    cleanDescription += 'Benefits & Perks:\n' + cleanedBenefits.map((b) => `• ${b}`).join('\n') + '\n\n';
  }
  if (cleanedCareerGrowth.length > 0) {
    cleanDescription += 'Career Development:\n' + cleanedCareerGrowth.map((g) => `• ${g}`).join('\n');
  }

  if (!cleanDescription.trim()) {
    cleanDescription = normalizedText;
  }

  // 6. Detect Top Tech & Domain Keywords
  const foundKeywords = TOP_TECH_KEYWORDS.filter((keyword) => {
    const escaped = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9À-ỹ])${escaped}(?:$|[^a-zA-Z0-9À-ỹ])`, 'i');
    return regex.test(normalizedText);
  });

  // 7. Generate Tailored Custom Prompt
  let suggestedCustomPrompt = `Tailor the resume for the ${title} position at ${company}.`;
  if (foundKeywords.length > 0) {
    const highlighted = foundKeywords.slice(0, 6).join(', ');
    suggestedCustomPrompt += ` Prioritize and highlight strong hands-on expertise in ${highlighted}.`;
  }
  if (level === 'senior' || level === 'lead' || level === 'manager') {
    suggestedCustomPrompt += ' Emphasize system architecture design, performance optimization, and technical mentorship impact.';
  } else if (level === 'intern' || level === 'fresher') {
    suggestedCustomPrompt += ' Highlight academic foundation, eagerness to learn, project capstones, and problem-solving mindset.';
  } else {
    suggestedCustomPrompt += ' Highlight practical project contributions, problem-solving skills, and clean coding practices.';
  }

  return {
    company,
    title,
    description: cleanDescription.trim(),
    requirements: cleanedRequirements,
    responsibilities: cleanedResponsibilities,
    benefits: cleanedBenefits,
    careerGrowth: cleanedCareerGrowth,
    salary,
    location,
    employmentType,
    experienceLevel: level,
    suggestedCustomPrompt,
    detectedSkills: foundKeywords,
    url,
  };
}

/**
 * Map detected job experience level to interview difficulty level
 */
export function mapExperienceLevelToDifficulty(
  level?: ParsedJobData['experienceLevel']
): 'easy' | 'medium' | 'hard' | 'hardcore' {
  switch (level) {
    case 'intern':
    case 'fresher':
    case 'junior':
      return 'easy';
    case 'mid':
      return 'medium';
    case 'senior':
      return 'hard';
    case 'lead':
    case 'manager':
      return 'hardcore';
    default:
      return 'medium';
  }
}
