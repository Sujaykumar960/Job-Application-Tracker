import { apiClient } from './client';
import { NetworkUser } from '../types';

export const connectionApi = {
  /**
   * Fetch 1st-degree connected engineers
   */
  getConnections: async (): Promise<NetworkUser[]> => {
    const response = await apiClient.get<NetworkUser[]>('/network/connections');
    return response.data;
  },

  /**
   * Fetch incoming connection invitations
   */
  getConnectionRequests: async (): Promise<NetworkUser[]> => {
    const response = await apiClient.get<NetworkUser[]>('/network/requests');
    return response.data;
  },

  /**
   * Fetch recommended candidate & engineering peers
   */
  getSuggestedConnections: async (): Promise<NetworkUser[]> => {
    const response = await apiClient.get<NetworkUser[]>('/network/suggestions');
    return response.data;
  },

  /**
   * Fetch overview of network stats and connections
   */
  getNetworkSummary: async (): Promise<{
    connections: NetworkUser[];
    totalConnections: number;
    pendingIncomingCount: number;
    pendingOutgoingCount: number;
  }> => {
    const response = await apiClient.get('/network');
    return response.data;
  },

  /**
   * Discover real candidates and engineering peers with filters
   */
  discoverUsers: async (params?: {
    search?: string;
    role?: string;
    skills?: string;
    company?: string;
    location?: string;
    limit?: number;
    skip?: number;
  }): Promise<NetworkUser[]> => {
    const response = await apiClient.get<NetworkUser[]>('/network/discover', { params });
    return response.data;
  },

  /**
   * Send connection request to a candidate or recruiter
   */
  sendConnectionRequest: async (userId: string, note?: string): Promise<{ success: boolean; id?: string }> => {
    const response = await apiClient.post<{ success: boolean; id?: string }>('/network/requests', {
      recipientId: userId,
      note,
    });
    return response.data;
  },

  /**
   * Accept an incoming connection request
   */
  acceptConnectionRequest: async (requestId: string): Promise<{ success: boolean; status: string }> => {
    const response = await apiClient.post<{ success: boolean; status: string }>(`/network/requests/${requestId}/accept`);
    return response.data;
  },

  /**
   * Reject an incoming connection request
   */
  rejectConnectionRequest: async (requestId: string): Promise<{ success: boolean; status: string }> => {
    const response = await apiClient.post<{ success: boolean; status: string }>(`/network/requests/${requestId}/reject`);
    return response.data;
  },

  /**
   * Cancel an outgoing pending connection request
   */
  cancelConnectionRequest: async (requestId: string): Promise<{ success: boolean; status: string }> => {
    const response = await apiClient.delete<{ success: boolean; status: string }>(`/network/requests/${requestId}`);
    return response.data;
  },

  /**
   * Remove/disconnect 1st-degree connection
   */
  removeConnection: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/network/connections/${userId}`);
    return response.data;
  },

  /**
   * Accept or ignore an incoming connection request (legacy wrapper)
   */
  respondToConnectionRequest: async (requestId: string, accept: boolean): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/network/requests/${requestId}/respond`, { accept });
    return response.data;
  },

  /**
   * Follow or unfollow a tech leader
   */
  followUser: async (userId: string): Promise<{ following: boolean }> => {
    const response = await apiClient.post<{ following: boolean }>(`/network/follow/${userId}`);
    return response.data;
  },
};

export default connectionApi;
