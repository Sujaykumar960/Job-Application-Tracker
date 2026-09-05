export interface CandidateProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  location: string;
  experienceYears: number;
  atsScore: number;
  readinessStatus: 'Ready for Interview' | 'Passively Looking' | 'Open to Offers' | 'Placed';
  skills: string[];
  topDomains: string[];
  currentCompany?: string;
  education: string;
  summary: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  desiredSalary?: string;
  matchPercentage?: number;
}

export interface CandidateFilterState {
  searchQuery: string;
  skill: string;
  minAtsScore: number;
  readiness: string;
  minExperience: number;
}
