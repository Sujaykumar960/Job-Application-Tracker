import { apiClient, withFallback } from './client';
import { ChatConversation, ChatMessage } from './chatWebSocket';
import { INITIAL_CONVERSATIONS } from '../data/mockConversations';

const CHAT_STORAGE_KEY = 'careerx_conversations_v2';

function getLocalConversations(): ChatConversation[] {
  const saved = localStorage.getItem(CHAT_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  }
  return INITIAL_CONVERSATIONS;
}

export const messageApi = {
  /**
   * Fetch all active recruiter and peer conversations
   */
  getConversations: async (): Promise<ChatConversation[]> => {
    return withFallback(
      apiClient.get<ChatConversation[]>('/messages/conversations'),
      getLocalConversations()
    );
  },

  /**
   * Fetch message history for a specific conversation thread
   */
  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const conv = getLocalConversations().find((c) => c.id === conversationId);
    const messages = conv ? conv.messages : [];

    return withFallback(
      apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}`),
      messages
    );
  },

  /**
   * Send a direct message with optional PDF attachment
   */
  sendMessage: async (
    conversationId: string,
    content: string,
    attachment?: { name: string; size: string }
  ): Promise<ChatMessage> => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'usr_001',
      senderName: 'Alex Rivera',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      status: 'sent',
      attachment: attachment
        ? {
            id: `att-${Date.now()}`,
            name: attachment.name,
            size: attachment.size,
            type: 'pdf',
            url: '#',
          }
        : undefined,
    };

    const convs = getLocalConversations();
    const updated = convs.map((c) => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage: content,
          lastMessageTime: newMsg.timestamp,
          messages: [...c.messages, newMsg],
        };
      }
      return c;
    });

    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/send`, { content, attachment }),
      newMsg
    );
  },

  /**
   * Mark all unread messages in thread as read
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    const convs = getLocalConversations();
    const updated = convs.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ success: boolean }>(`/messages/conversations/${conversationId}/read`),
      { success: true }
    );
  },
};

export default messageApi;
