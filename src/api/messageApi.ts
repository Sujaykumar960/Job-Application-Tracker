import { apiClient } from './client';
import { ChatConversation, ChatMessage } from './chatWebSocket';

export const messageApi = {
  /**
   * Fetch all active recruiter and peer conversations
   */
  getConversations: async (): Promise<ChatConversation[]> => {
    const response = await apiClient.get<ChatConversation[]>('/messages/conversations');
    return response.data;
  },

  /**
   * Fetch message history for a specific conversation thread
   */
  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}/messages`);
    return response.data;
  },

  /**
   * Send a direct message with optional PDF attachment
   */
  sendMessage: async (
    conversationId: string,
    content: string,
    attachment?: { name: string; size: string }
  ): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/send`, { content, attachment });
    return response.data;
  },

  /**
   * Start or retrieve a direct conversation with a recipient
   */
  createConversation: async (participantId: string): Promise<ChatConversation> => {
    const response = await apiClient.post<ChatConversation>('/messages/conversations', { participantId });
    return response.data;
  },

  /**
   * Edit a sent message
   */
  editMessage: async (
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<ChatMessage> => {
    const response = await apiClient.patch<ChatMessage>(
      `/messages/conversations/${conversationId}/messages/${messageId}`,
      { content }
    );
    return response.data;
  },

  /**
   * Delete a sent message
   */
  deleteMessage: async (
    conversationId: string,
    messageId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/messages/conversations/${conversationId}/messages/${messageId}`
    );
    return response.data;
  },

  /**
   * Mark all unread messages in thread as read
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/messages/conversations/${conversationId}/read`);
    return response.data;
  },
};

export default messageApi;
