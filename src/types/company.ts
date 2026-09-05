import { JobItem } from './index';

export interface CompanyPost {
  id: string;
  title: string;
  date: string;
  content: string;
  author: string;
  authorRole: string;
  likesCount: number;
}

export interface CompanyEmployee {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  avatarGradient: string;
  isConnected: boolean;
}

export interface CompanyProfile {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logoInitials: string;
  logoGradient: string;
  industry: string;
  size: string;
  headquarters: string;
  founded: string;
  funding: string;
  website: string;
  isFollowing: boolean;
  followersCount: number;
  about: string;
  mission: string;
  techStack: string[];
  benefits: string[];
  openJobsCount: number;
  jobs: JobItem[];
  posts: CompanyPost[];
  employees: CompanyEmployee[];
}
