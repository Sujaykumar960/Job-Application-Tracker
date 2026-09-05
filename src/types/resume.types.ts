export interface AtsScoreBreakdown {
  overallScore: number;
  formattingScore: number;
  keywordsScore: number;
  impactScore: number;
  completenessScore: number;
}

export interface AtsIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'keywords' | 'formatting' | 'impact' | 'structure';
  title: string;
  description: string;
  recommendation: string;
}

export interface SkillMatch {
  name: string;
  foundInResume: boolean;
  frequency: number;
  category: 'hard' | 'soft' | 'tool' | 'framework';
  importance: 'critical' | 'recommended' | 'optional';
}

export interface BulletImprovement {
  id: string;
  original: string;
  improved: string;
  critique: string;
  metricAdded: string;
  actionVerb: string;
}

export interface ParsedResume {
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  experienceYears: number;
  summary: string;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    techStack: string[];
    description: string;
    link?: string;
  }>;
  atsBreakdown: AtsScoreBreakdown;
  issues: AtsIssue[];
  bulletImprovements: BulletImprovement[];
}
