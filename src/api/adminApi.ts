import { apiClient } from './client';

export interface AdminMetrics {
  totalUsers: number;
  totalSeekers: number;
  totalRecruiters: number;
  totalAdmins: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalResumes: number;
  totalPosts: number;
}

export interface AdminOverviewResponse {
  metrics: AdminMetrics;
  system: {
    status: string;
    environment: string;
    timestamp: string;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'seeker' | 'recruiter' | 'admin';
  isActive: boolean;
  isVerified?: boolean;
  createdAt: string;
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminPostItem {
  id: string;
  authorId?: string;
  author?: {
    id?: string;
    name: string;
    headline?: string;
  };
  type: string;
  content: string;
  createdAt: string;
  likes?: string[];
  comments?: any[];
}

export interface AdminAuditLogItem {
  id: string;
  event: string;
  actorId: string;
  targetUserId?: string;
  targetPostId?: string;
  reason?: string;
  changes?: Record<string, any>;
  timestamp: string;
}

export const adminApi = {
  async getOverview(): Promise<AdminOverviewResponse> {
    const res = await apiClient.get<AdminOverviewResponse>('/admin/overview');
    return res.data;
  },

  async listUsers(params?: { q?: string; role?: string; limit?: number; skip?: number }): Promise<AdminUserListResponse> {
    const res = await apiClient.get<AdminUserListResponse>('/admin/users', { params });
    return res.data;
  },

  async updateUserStatus(userId: string, body: { isActive?: boolean; role?: string }): Promise<{ message: string; userId: string; changes: any }> {
    const res = await apiClient.patch<{ message: string; userId: string; changes: any }>(`/admin/users/${userId}/status`, body);
    return res.data;
  },

  async listModerationPosts(limit: number = 50): Promise<{ posts: AdminPostItem[]; total: number }> {
    const res = await apiClient.get<{ posts: AdminPostItem[]; total: number }>('/admin/moderation/posts', { params: { limit } });
    return res.data;
  },

  async deleteModerationPost(postId: string, reason?: string): Promise<{ message: string; postId: string }> {
    const res = await apiClient.delete<{ message: string; postId: string }>(`/admin/moderation/posts/${postId}`, {
      params: { reason },
    });
    return res.data;
  },

  async getAuditLogs(limit: number = 50): Promise<{ auditLogs: AdminAuditLogItem[] }> {
    const res = await apiClient.get<{ auditLogs: AdminAuditLogItem[] }>('/admin/audit-logs', { params: { limit } });
    return res.data;
  },
};
