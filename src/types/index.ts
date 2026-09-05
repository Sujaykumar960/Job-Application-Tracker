// Core Type Definitions for CareerX Platform
export * from './backend';

export type RoleType = 'seeker' | 'recruiter' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  avatar?: string;
  headline?: string;
  bio?: string;
  location?: string;
  atsScore?: number;
  skills: string[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: RoleType;
}

export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';
export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Application {
  id: string;
  company: string;
  role: string;
  companyName?: string; // alias for backwards-compat
  roleTitle?: string;   // alias for backwards-compat
  location: string;
  jobUrl?: string;
  appliedDate: string;
  deadline?: string;
  deadlineDate?: string; // alias for backwards-compat
  interviewDate?: string;
  recruiter?: string;
  status: ApplicationStatus;
  priority: PriorityLevel;
  notes?: string;
  resume?: string;
  matchScore: number;
  salaryRange?: string;
  tags?: string[];
}

export interface AtsBreakdown {
  overallScore: number;
  keywordsScore: number;
  impactScore: number;
  formattingScore: number;
  completenessScore: number;
}

export interface JobSkillItem {
  name: string;
  isMatched: boolean;
}

export interface JobItem {
  id: string;
  title: string;
  company: string;
  companyName?: string; // alias for backwards-compat
  companyLogo?: string;
  location: string;
  salaryRange: string;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  jobType: 'Full-time' | 'Internship' | 'Contract';
  experienceLevel: 'Intern' | 'Junior' | 'Mid' | 'Senior';
  roleCategory: string;
  postedDate: string; // e.g. '2026-09-01' or '2d ago'
  postedAgo: string;  // e.g. '2d ago'
  matchScore: number;
  skills: JobSkillItem[];
  requiredSkills?: string[];
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits?: string[];
  jobUrl?: string;
  applicantsCount?: number;
}

export interface JobFilterState {
  search: string;
  role: string;
  location: string;
  experience: string;
  skill: string;
  jobType: string;
  workType: string;
  sortBy: 'match' | 'newest' | 'salary';
}
