export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isLocked?: boolean;
}

export interface DsaProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  category: 'Arrays' | 'Strings' | 'Two Pointers' | 'Trees' | 'Graphs' | 'DP' | 'Binary Search' | 'Stack & Queue';
  acceptanceRate: string;
  companies: string[];
  description: string;
  constraints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starterCode: {
    python: string;
    javascript: string;
    typescript: string;
    golang: string;
    java: string;
  };
  solutionExplanation?: string;
  testCases: TestCase[];
  solved?: boolean;
}

export interface LanguageModule {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  completed: boolean;
  lessonsCount: number;
  description: string;
  keyTopics: string[];
}

export interface LanguageTrack {
  id: string;
  name: string;
  logo: string;
  description: string;
  modulesCount: number;
  completedModules: number;
  popularity: string;
  modules: LanguageModule[];
}

export interface BackendTopic {
  id: string;
  title: string;
  category: 'API Design' | 'Databases & Caching' | 'System Architecture' | 'Auth & Security' | 'Microservices';
  level: 'Core' | 'Advanced' | 'Enterprise';
  estimatedHours: number;
  completed: boolean;
  summary: string;
  subtopics: string[];
  realWorldScenario: string;
  architectureNotes: string;
}

export interface LearningProgress {
  streakDays: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  backendTopicsCompleted: number;
  totalXp: number;
  categoryMastery: Array<{
    category: string;
    score: number;
    fullMark: number;
  }>;
}
