// Core Type Definitions for CareerX Platform
export * from './backend';

export type RoleType = 'seeker' | 'recruiter' | 'admin';

// Feed/Post Types (from backend schemas)
export type PostType =
  | 'Achievement'
  | 'Project'
  | 'Certification'
  | 'Learning Update'
  | 'Career Advice'
  | 'Technical Discussion'
  | 'Job Announcement';

export interface PostMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  storageKey?: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  duration?: number;
  originalFilename?: string;
  createdAt: string;
}

export interface FeedAuthor {
  id?: string;
  name: string;
  headline: string;
  avatarUrl?: string;
  avatarInitials: string;
  avatarGradient?: string;
  company?: string;
  isVerified: boolean;
}

export interface FeedComment {
  id: string;
  postId?: string;
  authorId?: string;
  authorName: string;
  authorHeadline: string;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId?: string;
  author: FeedAuthor;
  type: PostType;
  createdAt: string;
  content: string;
  media?: PostMediaItem[];
  tags: string[];
  codeSnippet?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  sharesCount: number;
  comments: FeedComment[];
}

export interface PublicUserProfile {
  id: string;
  name: string;
  role?: string;
  headline?: string;
  bio?: string;
  location?: string;
  company?: string;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarGradient?: string;
  skills: string[];
  experiences: Array<{
    id?: string;
    company: string;
    role?: string;
    title?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    bullets?: string[];
    description?: string;
    skills?: string[];
  }>;
  education: Array<{
    id?: string;
    school: string;
    degree: string;
    fieldOfStudy?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    description?: string;
  }>;
  projects: Array<{
    id?: string;
    title: string;
    impact?: string;
    description?: string;
    tech?: string[];
    technologies?: string[];
    link?: string;
    date?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issueDate?: string;
    credentialId?: string;
  }>;
  websiteUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  connectionStatus?: 'self' | 'connected' | 'pending_sent' | 'pending_received' | 'none';
  requestId?: string;
  createdAt?: string;
}

// Network/Connection Types
export interface NetworkUser {
  id: string;
  name: string;
  headline: string;
  avatarInitials: string;
  avatarGradient?: string;
  location?: string;
  skills: string[];
  connectionState: 'connected' | 'pending' | 'not_connected';
  connectionSince?: string;
  mutualConnections?: number;
  isIncomingRequest?: boolean;
  isFollowing?: boolean;
  company?: string;
  requestDate?: string;
  note?: string;
  mutualCount?: number;
  mutualNames?: string[];
  requestId?: string;
  senderId?: string;
  recipientId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Notification Types (from backend schemas)
export type NotificationPriority = 'urgent' | 'normal' | 'low';
export type NotificationCategory =
  | 'interview_reminder'
  | 'application_deadline'
  | 'follow_up'
  | 'message'
  | 'connection_request'
  | 'job_recommendation'
  | 'learning_achievement'
  | 'connection_accepted'
  | 'post_like'
  | 'post_comment'
  | 'calendar_event';

export interface CareerNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp?: string;
  time?: string;
  createdAt: string;
  isRead: boolean;
  priority: NotificationPriority;
  company?: string;
  actionLabel?: string;
  actionUrl?: string;
  actionPayload?: any;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  type: 'interview' | 'deadline' | 'reminder' | 'other';
  companyId?: string;
  jobId?: string;
  location?: string;
  isAllDay?: boolean;
}

// Recruiter Types
export interface RecruiterCandidate {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceLevel: 'Entry / Intern' | 'Junior' | 'Mid Level' | 'Senior' | 'Lead';
  yearsExperience: string;
  skills: string[];
  questionsSolved: number;
  totalQuestions: number;
  accuracy: number;
  streak: number;
  projectsCount: number;
  featuredProjects: string[];
  assessmentName: string;
  assessmentScore: number;
  assessmentPercentile: string;
  jobMatch: number;
  targetRole: string;
  careerGrowthMetric: string;
  atsScore: number;
  avatarInitials: string;
  avatarGradient: string;
  isShortlisted: boolean;
  interviewStage?: 'Phone Screen' | 'Technical Onsite' | 'Offer Sent' | 'Not Started';
  privacy: {
    searchStatus: 'actively_looking' | 'casually_browsing' | 'not_looking';
    showSalary: boolean;
    showLocation: boolean;
    salaryExpectation?: string;
    contactVisibility?: string;
    email?: string;
    phone?: string;
    cloakedFromCurrentEmployer?: boolean;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  avatar?: string;
  headline?: string;
  bio?: string;
  location?: string;
  company?: string;
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

export type ApplicationStatus =
  | 'Applied'
  | 'Screening'
  | 'Shortlisted'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected'
  | 'Wishlist';
export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Application {
  id: string;
  company: string;
  role: string;
  companyName?: string; // alias for backwards-compat
  roleTitle?: string;   // alias for backwards-compat
  location: string;
  jobUrl?: string;
  jobId?: string;
  companyId?: string;
  resumeId?: string;
  userId?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantHeadline?: string;
  applicantAvatar?: string;
  resumeUrl?: string;
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
  companyId?: string;
  recruiterId?: string;
  postedBy?: string;
  status?: 'draft' | 'published' | 'closed';
  location: string;
  salaryRange: string;
  salaryMin?: number;
  salaryMax?: number;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  jobType: 'Full-time' | 'Internship' | 'Contract';
  experienceLevel: 'Intern' | 'Junior' | 'Mid' | 'Senior' | 'Lead';
  roleCategory: string;
  postedDate: string; // e.g. '2026-09-01' or '2d ago'
  postedAgo?: string;  // e.g. '2d ago'
  matchScore: number;
  skills: JobSkillItem[];
  requiredSkills?: string[];
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits?: string[];
  jobUrl?: string;
  applicantsCount?: number;
  isActive?: boolean;
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

// Phase 4: Skill Gap & Real Job Match Types
export interface RadarDimensionItem {
  subject: string;
  candidate: number;
  market: number;
}

export interface CategoryProficiencyItem {
  name: string;
  score: number;
  level: string;
  verified: boolean;
}

export interface CurrentSkillItem {
  name: string;
  category: string;
  level: string;
  percent: number;
  verified: boolean;
}

export interface MissingSkillItem {
  id: string;
  skill: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  requiredBy: string;
  estHours: string;
  moduleTitle: string;
  moduleSlug: string;
  rationale: string;
}

export interface SkillGapSummary {
  totalProfileSkills: number;
  marketAlignment: number;
  criticalGaps: number;
  remediationModules: number;
}

export interface SkillGapAnalysisResponse {
  summary: SkillGapSummary;
  radarData: RadarDimensionItem[];
  categoryProficiency: CategoryProficiencyItem[];
  currentSkills: CurrentSkillItem[];
  missingSkills: MissingSkillItem[];
  targetTrack: string;
  hasActiveResume: boolean;
  hasProfileSkills: boolean;
  message?: string;
}

export interface JobPartialSkill {
  name: string;
  note: string;
}

export interface JobMissingSkill {
  name: string;
  priority: 'High' | 'Medium' | 'Low';
  module: string;
}

export interface JobRecommendation {
  title: string;
  desc: string;
  action: string;
  link: string;
}

export interface JobMatchAnalysisResult {
  matchScore: number;
  overallScore: number;
  matchedSkills: string[];
  partialSkills: JobPartialSkill[];
  missingSkills: (JobMissingSkill | string)[];
  recommendations: (JobRecommendation | string)[];
  jobId?: string;
  jobTitle?: string;
  company?: string;
  resumeId?: string;
  resumeName?: string;
}

