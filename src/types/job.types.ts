import { JobType, WorkLocation } from './application.types';

export interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  size: string;
  headquarters: string;
  website: string;
  description: string;
  techStack: string[];
  cultureHighlights: string[];
  openPositionsCount: number;
}

export interface JobPosting {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workLocation: WorkLocation;
  jobType: JobType;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  experienceLevel: 'Entry Level' | 'Mid Level' | 'Senior' | 'Lead' | 'Internship';
  postedDate: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  department: string;
  applicantsCount: number;
}

export interface JobFilterState {
  searchQuery: string;
  workLocation: string;
  jobType: string;
  experienceLevel: string;
  minSalary?: number;
}
