/**
 * Canonical Backend Entities for CareerX Platform.
 * Designed for full compatibility with FastAPI (Pydantic v2) + MongoDB (Motor/Beanie).
 * All models use consistent string IDs, ISO 8601 timestamps, and standardized foreign references.
 */

// ==========================================
// 1. USER
// ==========================================
export type UserRole = 'seeker' | 'recruiter' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  profileId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 2. PROFILE
// ==========================================
export interface ProfilePrivacySettings {
  profileVisibility: 'public' | 'members' | 'private';
  resumeVisibility: 'all_recruiters' | 'applied_only' | 'private';
  careerProgressVisibility: 'public_showcase' | 'recruiters_only' | 'private';
  applicationPrivacy: boolean;
  jobSearchStatus: 'actively_looking' | 'casually_browsing' | 'not_looking';
  showSalary: boolean;
  salaryExpectation?: string;
  cloakCurrentEmployer: boolean;
  currentEmployerDomain?: string;
  contactVisibility: 'all_recruiters' | 'mutual_matches' | 'hidden';
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  headline: string;
  bio?: string;
  location?: string;
  phone?: string;
  avatarUrl?: string;
  avatarInitials?: string;
  avatarGradient?: string;
  websiteUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  atsScore?: number;
  skills: string[];
  privacy: ProfilePrivacySettings;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 3. APPLICATION
// ==========================================
export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';
export type ApplicationPriority = 'Low' | 'Medium' | 'High';

export interface Application {
  id: string;
  userId: string;
  jobId?: string;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  appliedDate: string;
  deadlineDate?: string;
  interviewDate?: string;
  matchScore: number;
  salaryRange?: string;
  tags: string[];
  notes?: string;
  resumeUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 4. RESUME
// ==========================================
export interface Resume {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  isPrimary: boolean;
  parsedText?: string;
  atsScore?: number;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 5. RESUME ANALYSIS
// ==========================================
export interface AtsCategoryBreakdown {
  overallScore: number;
  keywordsScore: number;
  impactScore: number;
  formattingScore: number;
  completenessScore: number;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  userId: string;
  atsScore: number;
  breakdown: AtsCategoryBreakdown;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  skillGaps: string[];
  recommendations: string[];
  targetRole?: string;
  createdAt: string;
}

// ==========================================
// 6. JOB
// ==========================================
export type WorkLocationType = 'Remote' | 'Hybrid' | 'On-site';
export type JobEmploymentType = 'Full-time' | 'Contract' | 'Internship';
export type ExperienceTier = 'Entry' | 'Junior' | 'Mid' | 'Senior' | 'Lead';

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  title: string;
  department: string;
  location: string;
  workLocation: WorkLocationType;
  employmentType: JobEmploymentType;
  experienceLevel: ExperienceTier;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  benefits: string[];
  applicantsCount: number;
  postedDate: string;
  deadlineDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 7. JOB MATCH
// ==========================================
export interface JobMatchSkillItem {
  name: string;
  isMatched: boolean;
  relevanceWeight?: number;
}

export interface JobMatch {
  id: string;
  userId: string;
  jobId: string;
  matchScore: number;
  skills: JobMatchSkillItem[];
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  createdAt: string;
}

// ==========================================
// 8. SKILL
// ==========================================
export type SkillCategory =
  | 'Language'
  | 'Framework'
  | 'Database'
  | 'Infrastructure'
  | 'Architecture'
  | 'Tool';

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
  proficiencyLevel?: SkillProficiency;
  verified: boolean;
  questionsSolvedCount?: number;
  accuracyPercentage?: number;
  streakDays?: number;
  createdAt?: string;
}

// ==========================================
// 9. QUESTION
// ==========================================
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuestionTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample?: boolean;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  difficulty: QuestionDifficulty;
  category: string;
  tags: string[];
  companies: string[];
  acceptanceRate: number;
  description: string;
  constraints: string[];
  starterCode: Record<string, string>; // language identifier -> code template
  testCases: QuestionTestCase[];
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 10. QUESTION ATTEMPT
// ==========================================
export type QuestionExecutionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Compilation Error';

export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  language: string;
  submittedCode: string;
  status: QuestionExecutionStatus;
  executionTimeMs: number;
  memoryUsageMb: number;
  passedCount: number;
  totalCount: number;
  stdout?: string;
  stderr?: string;
  createdAt: string;
}

// ==========================================
// 11. PROGRESS
// ==========================================
export interface ProgressActivityHistory {
  period: string;
  studyHours: number;
  questionsSolved: number;
  streakDays: number;
}

export interface Progress {
  id: string;
  userId: string;
  questionsSolved: number;
  totalQuestions: number;
  accuracyPercentage: number;
  codingStreakDays: number;
  currentAtsScore: number;
  projectsCompleted: number;
  certificationsCount: number;
  activityHistory: ProgressActivityHistory[];
  lastPracticedAt: string;
  updatedAt: string;
}

// ==========================================
// 12. ACHIEVEMENT
// ==========================================
export type AchievementBadgeCategory = 'streak' | 'questions' | 'assessment' | 'resume';

export interface Achievement {
  id: string;
  userId: string;
  badgeKey: string;
  title: string;
  description: string;
  category: AchievementBadgeCategory;
  xpReward: number;
  unlockedAt: string;
}

// ==========================================
// 13. POST
// ==========================================
export type PostCategoryType =
  | 'Achievement'
  | 'Project'
  | 'Certification'
  | 'Learning Update'
  | 'Career Advice'
  | 'Technical Discussion'
  | 'Job Announcement';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHeadline: string;
  authorAvatarInitials?: string;
  authorCompany?: string;
  authorIsVerified: boolean;
  type: PostCategoryType;
  content: string;
  codeSnippet?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 14. COMMENT
// ==========================================
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHeadline: string;
  authorAvatarInitials?: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 15. CONNECTION
// ==========================================
export type ConnectionStatus = 'Connect' | 'Pending' | 'Connected' | 'Declined';

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnectionStatus;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 16. CONVERSATION
// ==========================================
export interface ConversationPeerSummary {
  id: string;
  name: string;
  headline: string;
  company?: string;
  avatarInitials: string;
  avatarGradient: string;
  isOnline: boolean;
  lastActive: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  peer: ConversationPeerSummary;
  lastMessageContent?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 17. MESSAGE
// ==========================================
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageAttachment {
  id: string;
  name: string;
  fileSizeBytes: number;
  sizeFormatted: string;
  mimeType: string;
  fileUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  status: MessageDeliveryStatus;
  isOutgoing: boolean;
  attachment?: MessageAttachment;
  createdAt: string;
}

// ==========================================
// 18. COMPANY
// ==========================================
export interface CompanyEmployeeSummary {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  avatarGradient: string;
  isConnected: boolean;
}

export interface CompanyPostSummary {
  id: string;
  title: string;
  date: string;
  content: string;
  author: string;
  authorRole: string;
  likesCount: number;
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logoInitials: string;
  logoGradient: string;
  industry: string;
  size: string;
  headquarters: string;
  foundedYear: string;
  fundingStage: string;
  websiteUrl: string;
  about: string;
  mission: string;
  techStack: string[];
  benefits: string[];
  openJobsCount: number;
  followersCount: number;
  isFollowing?: boolean;
  employees: CompanyEmployeeSummary[];
  posts: CompanyPostSummary[];
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 19. NOTIFICATION
// ==========================================
export type NotificationType =
  | 'interview_reminder'
  | 'application_deadline'
  | 'follow_up'
  | 'message'
  | 'connection_request'
  | 'job_recommendation'
  | 'learning_achievement';

export type NotificationPriority = 'urgent' | 'normal' | 'low';

export interface Notification {
  id: string;
  userId: string;
  category: NotificationType;
  title: string;
  description: string;
  priority: NotificationPriority;
  isRead: boolean;
  company?: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ==========================================
// 20. RECRUITER
// ==========================================
export interface Recruiter {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  title: string;
  department: string;
  isVerified: boolean;
  activeJobsCount: number;
  totalApplicationsReviewed: number;
  shortlistedCandidatesCount: number;
  activeInterviewLoopsCount: number;
  totalHiresCount: number;
  createdAt: string;
  updatedAt?: string;
}
