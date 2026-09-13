import { apiClient } from './client';

export interface LessonSummary {
  id: string;
  title: string;
  duration: string;
  order: number;
  completed: boolean;
  snippet?: string;
  description?: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  estimatedHours: number;
  lessonsCount: number;
  skillsCovered: string[];
  description: string;
  progress: number;
  isEnrolled: boolean;
  isRecommended: boolean;
  recommendationReason?: string;
  completedLessonsCount: number;
}

export interface CourseDetail extends CourseSummary {
  completedLessons: string[];
  lessons: LessonSummary[];
}

export interface ProgressMutationResponse {
  courseId: string;
  lessonId?: string;
  progressPercent: number;
  completedLessons: string[];
  status: 'in_progress' | 'completed';
  completedAt?: string;
  message: string;
}

export interface MyLearningSummary {
  coursesEnrolled: number;
  coursesCompleted: number;
  lessonsCompleted: number;
  totalStudyHours: number;
  streakDays: number;
}

export const learningApi = {
  /**
   * Fetch all curriculum courses with authenticated user progress attached
   */
  getCourses: async (params?: {
    category?: string;
    difficulty?: string;
    search?: string;
  }): Promise<CourseSummary[]> => {
    const response = await apiClient.get<CourseSummary[]>('/learning/courses', {
      params,
    });
    return response.data;
  },

  /**
   * Fetch detailed course syllabus with lesson contents
   */
  getCourse: async (courseId: string): Promise<CourseDetail> => {
    const response = await apiClient.get<CourseDetail>(`/learning/courses/${courseId}`);
    return response.data;
  },

  /**
   * Enroll in a course (idempotent)
   */
  enroll: async (courseId: string): Promise<ProgressMutationResponse> => {
    const response = await apiClient.post<ProgressMutationResponse>(
      `/learning/courses/${courseId}/enroll`
    );
    return response.data;
  },

  /**
   * Mark a lesson as completed
   */
  completeLesson: async (
    courseId: string,
    lessonId: string
  ): Promise<ProgressMutationResponse> => {
    const response = await apiClient.post<ProgressMutationResponse>(
      `/learning/courses/${courseId}/lessons/${lessonId}/complete`
    );
    return response.data;
  },

  /**
   * Unmark a lesson as completed
   */
  uncompleteLesson: async (
    courseId: string,
    lessonId: string
  ): Promise<ProgressMutationResponse> => {
    const response = await apiClient.post<ProgressMutationResponse>(
      `/learning/courses/${courseId}/lessons/${lessonId}/uncomplete`
    );
    return response.data;
  },

  /**
   * Reset course progress
   */
  resetCourseProgress: async (courseId: string): Promise<ProgressMutationResponse> => {
    const response = await apiClient.post<ProgressMutationResponse>(
      `/learning/courses/${courseId}/reset`
    );
    return response.data;
  },

  /**
   * Fetch aggregate personal learning statistics
   */
  getMyProgress: async (): Promise<MyLearningSummary> => {
    const response = await apiClient.get<MyLearningSummary>('/learning/my-progress');
    return response.data;
  },
};

export default learningApi;
