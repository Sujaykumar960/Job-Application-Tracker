export interface Author {
  id: string;
  name: string;
  avatar: string;
  role: string;
  company?: string;
  verified?: boolean;
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  likesCount: number;
}

export interface Post {
  id: string;
  author: Author;
  content: string;
  category: 'career_advice' | 'interview_experience' | 'referral' | 'achievement' | 'tech_discussion';
  tags: string[];
  codeSnippet?: {
    language: string;
    code: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
  comments?: Comment[];
  createdAt: string;
}

export interface Connection {
  id: string;
  user: Author;
  status: 'connected' | 'pending' | 'suggested';
  mutualConnections: number;
  headline: string;
}
