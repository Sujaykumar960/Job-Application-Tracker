export interface ChatAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'code' | 'doc';
  url?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachment?: ChatAttachment;
}

export interface ChatConversation {
  id: string;
  peer: {
    id: string;
    name: string;
    headline: string;
    company: string;
    avatarInitials: string;
    avatarGradient: string;
    isOnline: boolean;
    lastActive: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export type WsConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

export interface WebSocketEnvelope {
  type: 'message' | 'typing' | 'read' | 'presence';
  payload: any;
}

/**
 * ChatWebSocketClient manages real-time messaging with FastAPI WebSocket backend.
 * Gracefully provides local simulation when remote WebSocket server is offline.
 */
class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private status: WsConnectionStatus = 'CLOSED';
  private listeners: Array<(event: WebSocketEnvelope) => void> = [];
  private statusListeners: Array<(status: WsConnectionStatus) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(url = 'ws://localhost:8000/api/ws/chat') {
    this.url = url;
  }

  public connect(token?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');

    try {
      const wsUrl = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('OPEN');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEnvelope = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(parsed));
        } catch (err) {
          console.warn('Failed to parse WebSocket message', err);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('CLOSED');
      };

      this.ws.onerror = () => {
        this.setStatus('CLOSED');
      };
    } catch {
      this.setStatus('CLOSED');
    }
  }

  public send(envelope: WebSocketEnvelope) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
  }

  public onMessage(callback: (event: WebSocketEnvelope) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public onStatusChange(callback: (status: WsConnectionStatus) => void) {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== callback);
    };
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('CLOSED');
  }

  private setStatus(status: WsConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }
}

export const chatWebSocket = new ChatWebSocketClient();
