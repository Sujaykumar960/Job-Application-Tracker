export type UserRole = 'seeker' | 'recruiter';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  headline: string;
  bio: string;
  location: string;
  currentTitle: string;
  currentCompany?: string;
  atsScore: number;
  openToWork: boolean;
  skills: string[];
  links: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    twitter?: string;
  };
  experience: Array<{
    id: string;
    role: string;
    company: string;
    period: string;
    description: string;
  }>;
  education: Array<{
    id: string;
    degree: string;
    school: string;
    year: string;
  }>;
  stats: {
    appliedCount: number;
    interviewCount: number;
    offersCount: number;
    dsaSolvedCount: number;
    connectionsCount: number;
  };
}
