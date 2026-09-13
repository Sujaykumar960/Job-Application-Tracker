import { apiClient } from './client';

export interface DashboardOverview {
  profile: {
    name: string;
    email: string;
    headline?: string;
    atsScore?: number;
  };
  applications: {
    total: number;
    applied: number;
    interviewing: number;
    offered: number;
    rejected: number;
    wishlist: number;
  };
  upcomingInterviews: Array<{
    id: string;
    company: string;
    role: string;
    date: string;
    time?: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    company: string;
    role: string;
    date: string;
  }>;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  connectionRequestsCount: number;
  savedJobsCount: number;
  learningProgress: {
    questionsSolved: number;
    totalQuestions: number;
    accuracy: number;
    streakDays: number;
  };
}

export interface DashboardActivity {
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    timestamp: string;
  }>;
}

export const dashboardApi = {
  /**
   * Fetch dashboard overview with real user statistics
   */
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await apiClient.get<DashboardOverview>('/dashboard/overview');
    return response.data;
  },

  /**
   * Fetch recent activity feed
   */
  getActivity: async (limit: number = 20): Promise<DashboardActivity> => {
    const response = await apiClient.get<DashboardActivity>('/dashboard/activity', { params: { limit } });
    return response.data;
  },
};

export default dashboardApi;