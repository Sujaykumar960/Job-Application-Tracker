import { apiClient, withFallback } from './client';
import { NetworkUser, INITIAL_NETWORK_USERS } from '../data/mockNetwork';

const NETWORK_STORAGE_KEY = 'careerx_network_users_v2';

function getLocalNetworkUsers(): NetworkUser[] {
  const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_NETWORK_USERS;
    }
  }
  return INITIAL_NETWORK_USERS;
}

export const connectionApi = {
  /**
   * Fetch 1st-degree connected engineers
   */
  getConnections: async (): Promise<NetworkUser[]> => {
    const users = getLocalNetworkUsers().filter((u) => u.connectionState === 'Connected');

    return withFallback(
      apiClient.get<NetworkUser[]>('/network/connections'),
      users
    );
  },

  /**
   * Fetch incoming connection invitations
   */
  getConnectionRequests: async (): Promise<NetworkUser[]> => {
    const users = getLocalNetworkUsers().filter((u) => u.isIncomingRequest);

    return withFallback(
      apiClient.get<NetworkUser[]>('/network/requests'),
      users
    );
  },

  /**
   * Fetch recommended candidate & engineering peers
   */
  getSuggestedConnections: async (): Promise<NetworkUser[]> => {
    const users = getLocalNetworkUsers().filter((u) => !u.isIncomingRequest && u.connectionState !== 'Connected');

    return withFallback(
      apiClient.get<NetworkUser[]>('/network/suggestions'),
      users
    );
  },

  /**
   * Send connection request to a candidate or recruiter
   */
  sendConnectionRequest: async (userId: string): Promise<{ success: boolean }> => {
    const existing = getLocalNetworkUsers();
    const updated = existing.map((u) => (u.id === userId ? { ...u, connectionState: 'Pending' as const } : u));
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ success: boolean }>(`/network/connect/${userId}`),
      { success: true }
    );
  },

  /**
   * Accept or ignore an incoming connection request
   */
  respondToConnectionRequest: async (requestId: string, accept: boolean): Promise<{ success: boolean }> => {
    const existing = getLocalNetworkUsers();
    const updated = existing.map((u) => {
      if (u.id === requestId) {
        return {
          ...u,
          isIncomingRequest: false,
          connectionState: accept ? ('Connected' as const) : ('Connect' as const),
        };
      }
      return u;
    });
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ success: boolean }>(`/network/requests/${requestId}/respond`, { accept }),
      { success: true }
    );
  },

  /**
   * Follow or unfollow a tech leader
   */
  followUser: async (userId: string): Promise<{ following: boolean }> => {
    const existing = getLocalNetworkUsers();
    let isFollowing = false;
    const updated = existing.map((u) => {
      if (u.id === userId) {
        isFollowing = !u.isFollowing;
        return { ...u, isFollowing };
      }
      return u;
    });
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ following: boolean }>(`/network/follow/${userId}`),
      { following: isFollowing }
    );
  },
};

export default connectionApi;
