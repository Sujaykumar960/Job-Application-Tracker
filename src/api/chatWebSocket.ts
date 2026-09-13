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
  clientMessageId?: string;
  createdAt?: string;
  editedAt?: string;
  isEdited?: boolean;
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

function getDefaultWsUrl(): string {
  if (typeof window !== 'undefined') {
    const wsEnv = (import.meta as any).env?.VITE_WS_BASE_URL;
    if (wsEnv) {
      if (wsEnv.includes('/api/ws/chat')) {
        return wsEnv;
      }
      return `${wsEnv.replace(/\/+$/, '')}/api/ws/chat`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    return `${protocol}//${host}/api/ws/chat`;
  }
  return 'ws://localhost:8000/api/ws/chat';
}

/**
 * ChatWebSocketClient manages real-time messaging with FastAPI WebSocket backend.
 */
class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private status: WsConnectionStatus = 'CLOSED';
  private listeners: Array<(event: WebSocketEnvelope) => void> = [];
  private statusListeners: Array<(status: WsConnectionStatus) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: any = null;
  private currentToken: string | undefined = undefined;

  constructor(url?: string) {
    this.url = url || getDefaultWsUrl();
  }

  public connect(token?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const authToken =
      token ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('careerx_auth_token') || localStorage.getItem('token') || undefined
        : undefined);

    this.currentToken = authToken;
    this.setStatus('CONNECTING');

    try {
      const wsUrl = authToken ? `${this.url}?token=${encodeURIComponent(authToken)}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('OPEN');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
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
        this.ws = null;
        this.handleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('CLOSED');
      };
    } catch {
      this.setStatus('CLOSED');
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
      this.reconnectTimer = setTimeout(() => {
        if (this.status === 'CLOSED') {
          this.connect(this.currentToken);
        }
      }, delay);
    }
  }

  public send(envelope: WebSocketEnvelope) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
  }

  public sendChatMessage(conversationId: string, content: string, clientMessageId?: string, attachment?: ChatAttachment) {
    this.send({
      type: 'message',
      payload: {
        conversationId,
        content,
        clientMessageId,
        attachment,
      },
    });
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      payload: {
        conversationId,
        isTyping,
      },
    });
  }

  public sendReadReceipt(conversationId: string) {
    this.send({
      type: 'read',
      payload: {
        conversationId,
      },
    });
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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
