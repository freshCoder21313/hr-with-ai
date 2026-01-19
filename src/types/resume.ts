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
}

export interface ResumeData {
  basics: Basics;
  work: Work[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  
  // Additional sections often useful
  languages?: { language: string; fluency: string }[];
  interests?: { name: string; keywords: string[] }[];
  references?: { name: string; reference: string }[];
  
  meta?: {
    template?: 'classic' | 'modern';
    theme?: 'blue' | 'green' | 'gray';
  };
}
