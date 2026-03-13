// Based on JSON Resume Schema: https://jsonresume.org/schema/

export interface Profile {
  network: string;
  username: string;
  url: string;
}

export interface Location {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface Basics {
  name: string;
  label?: string; // Job Title
  image?: string;
  email: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: Location;
  profiles?: Profile[];
}

export interface Work {
  name: string; // Company
  position: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string; // Description
  highlights?: string[]; // Bullet points
}

export interface Education {
  institution: string;
  url?: string;
  area: string; // Major
  studyType: string; // Degree
  startDate?: string;
  endDate?: string;
  score?: string; // GPA
  courses?: string[];
}

export interface Skill {
  name: string; // e.g. Web Development
  level?: string; // e.g. Master
  keywords?: string[]; // e.g. ["HTML", "CSS", "Javascript"]
}

export interface Project {
  name: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  roles?: string[]; // e.g. ["Team Lead"]
  suggestedInterviewQuestions?: Array<{
    question: string;
    topics: string[];
    suggestedAnswer: string;
  }>;
}

export interface Volunteer {
  organization?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface Award {
  title: string;
  date?: string;
  awarder?: string;
  summary?: string;
}

export interface Publication {
  name: string;
  publisher?: string;
  releaseDate?: string;
  url?: string;
  summary?: string;
}

export interface ResumeData {
  basics: Basics;
  work: Work[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  volunteer?: Volunteer[];
  awards?: Award[];
  publications?: Publication[];

  // Additional sections often useful
  languages?: { language: string; fluency: string }[];
  interests?: { name: string; keywords: string[] }[];
  references?: { name: string; reference: string }[];

  language?: 'vi' | 'en';
  meta?: {
    template?: 'classic' | 'modern' | 'creative' | 'minimalist' | 'academic';
    theme?: 'blue' | 'green' | 'gray';
    themeColor?: string; // e.g. '#3b82f6'
    fontFamily?: 'sans' | 'serif' | 'mono';
    lastParsedRawText?: string;
    sectionOrder?: {
      main: string[]; // e.g. ['summary', 'work', 'projects']
      sidebar?: string[]; // e.g. ['skills', 'education']
    };
    customStyles?: {
      name?: { fontSize?: string; color?: string; fontFamily?: string; fontWeight?: string };
      headings?: { fontSize?: string; color?: string; fontFamily?: string; fontWeight?: string };
      body?: { fontSize?: string; color?: string; fontFamily?: string; lineHeight?: string };
      globalText?: { color?: string };
      spacing?: { sectionGap?: string; itemGap?: string };
    };
  };
}
