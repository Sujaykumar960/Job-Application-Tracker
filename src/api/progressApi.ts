import { apiClient, withFallback } from './client';

export interface ProgressOverview {
  questionsSolved: number;
  totalQuestions: number;
  accuracy: number;
  codingStreakDays: number;
  currentAtsScore: number;
  projectsCompleted: number;
  certificationsCount: number;
}

export interface ActivityDataPoint {
  period: string;
  studyHours: number;
  questionsSolved: number;
  streakDays: number;
}

export interface SkillTrajectory {
  name: string;
  initialScore: number;
  currentScore: number;
  growthPercentage: number;
}

export const progressApi = {
  /**
   * Fetch aggregate career progress statistics
   */
  getProgressOverview: async (): Promise<ProgressOverview> => {
    const fallback: ProgressOverview = {
      questionsSolved: 142,
      totalQuestions: 150,
      accuracy: 93.4,
      codingStreakDays: 14,
      currentAtsScore: 88,
      projectsCompleted: 4,
      certificationsCount: 3,
    };

    return withFallback(
      apiClient.get<ProgressOverview>('/progress/overview'),
      fallback
    );
  },

  /**
   * Fetch activity history breakdown (daily, weekly, or monthly)
   */
  getActivityHistory: async (range: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ActivityDataPoint[]> => {
    const fallback: ActivityDataPoint[] = [
      { period: 'Mon', studyHours: 3.5, questionsSolved: 6, streakDays: 10 },
      { period: 'Tue', studyHours: 4.0, questionsSolved: 8, streakDays: 11 },
      { period: 'Wed', studyHours: 2.5, questionsSolved: 4, streakDays: 12 },
      { period: 'Thu', studyHours: 5.0, questionsSolved: 10, streakDays: 13 },
      { period: 'Fri', studyHours: 4.5, questionsSolved: 9, streakDays: 14 },
      { period: 'Sat', studyHours: 6.0, questionsSolved: 12, streakDays: 15 },
      { period: 'Sun', studyHours: 3.0, questionsSolved: 5, streakDays: 16 },
    ];

    return withFallback(
      apiClient.get<ActivityDataPoint[]>('/progress/activity', { params: { range } }),
      fallback
    );
  },

  /**
   * Fetch 6-month skill trajectory growth metrics
   */
  getSkillTrajectories: async (): Promise<SkillTrajectory[]> => {
    const fallback: SkillTrajectory[] = [
      { name: 'Go Concurrency & Channels', initialScore: 40, currentScore: 92, growthPercentage: 130 },
      { name: 'Distributed Systems & Consensus', initialScore: 30, currentScore: 88, growthPercentage: 193 },
      { name: 'Database Indexing & PostgreSQL', initialScore: 55, currentScore: 90, growthPercentage: 63 },
      { name: 'Data Structures & Algorithms', initialScore: 60, currentScore: 92, growthPercentage: 53 },
    ];

    return withFallback(
      apiClient.get<SkillTrajectory[]>('/progress/skills'),
      fallback
    );
  },
};

export default progressApi;
