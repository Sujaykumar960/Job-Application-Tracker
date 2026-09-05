export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'accepted';

export type JobType = 'full-time' | 'internship' | 'part-time' | 'contract';
export type WorkLocation = 'remote' | 'hybrid' | 'on-site';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface InterviewRound {
  id: string;
  roundName: string;
  date: string;
  time?: string;
  interviewer?: string;
  notes?: string;
  completed: boolean;
  meetingLink?: string;
}

export interface Application {
  id: string;
  companyName: string;
  companyLogo?: string;
  roleTitle: string;
  location: string;
  workLocation: WorkLocation;
  jobType: JobType;
  salaryRange?: string;
  status: ApplicationStatus;
  priority: PriorityLevel;
  appliedDate: string;
  deadlineDate?: string;
  jobUrl?: string;
  contactEmail?: string;
  contactName?: string;
  notes?: string;
  matchScore?: number;
  rounds: InterviewRound[];
  tags: string[];
  updatedAt: string;
}

export interface ApplicationStats {
  total: number;
  wishlist: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  accepted: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}
