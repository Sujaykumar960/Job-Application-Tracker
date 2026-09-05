export type LanguageCategory =
  | 'Systems'
  | 'Backend'
  | 'Frontend'
  | 'Mobile'
  | 'Data / Query'
  | 'Markup / Styling';

export interface LanguageTopic {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionsCount: number;
  completedQuestions: number;
  isCompleted: boolean;
}

export interface LanguageQuestion {
  id: string;
  title: string;
  topicId: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  accuracy: number;
  isSolved: boolean;
  starterCode: string;
  solutionSnippet?: string;
  tags: string[];
}

export interface LanguageItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: LanguageCategory;
  iconText: string;
  iconBg: string;
  textColor: string;
  borderAccent: string;
  progress: number; // 0 - 100
  totalQuestions: number;
  solvedQuestions: number;
  accuracy: number; // 0 - 100
  streak: number; // days
  lastPracticed: string;
  recommendedNextTopic: {
    title: string;
    description: string;
    estTime: string;
    topicId: string;
  };
  topics: LanguageTopic[];
  questions: LanguageQuestion[];
}
