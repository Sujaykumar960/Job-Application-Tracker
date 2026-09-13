import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageComposer } from '../components/chat/MessageComposer';
import { messageApi } from '../api/messageApi';
import {
  ChatConversation,
  ChatMessage,
  ChatAttachment,
  chatWebSocket,
  WsConnectionStatus,
} from '../api/chatWebSocket';
import {
  MessageSquare,
  Sparkles,
  Wifi,
  WifiOff,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  // Load conversations from backend
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Fetch conversations from backend
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await messageApi.getConversations();
        setConversations(data);
        if (data.length > 0 && !activeConversationId) {
          setActiveConversationId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load conversations. Please try again.');
        console.error('Conversations fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages for active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    if (!activeConversationId) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const data = await messageApi.getMessages(activeConversationId);
        setMessages(data);
      } catch (err) {
        console.error('Messages fetch error:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConversationId]);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CLOSED');

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();

  // Handle deep-link to specific conversation or peer from other modules (Network, Recruiter, Notifications)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const requestedConvId =
      (location.state as any)?.conversationId ||
      queryParams.get('conversationId') ||
      queryParams.get('convId');
    const requestedUserId =
      (location.state as any)?.targetUserId ||
      queryParams.get('userId') ||
      queryParams.get('user');

    if (requestedConvId) {
      const exists = conversations.some((c) => c.id === requestedConvId);
      if (exists) {
        setActiveConversationId(requestedConvId);
        return;
      }
    }

    if (requestedUserId) {
      const matchedConv = conversations.find(
        (c) => c.peer.id === requestedUserId || c.peer.name.toLowerCase().includes(requestedUserId.toLowerCase())
      );
      if (matchedConv) {
        setActiveConversationId(matchedConv.id);
      }
    }
  }, [location, conversations]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading conversations...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load conversations</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <MessageSquare className="w-12 h-12 text-[#788896]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">No conversations yet</h3>
          <p className="text-[#56687A] mt-1">Start connecting with recruiters and peers.</p>
        </div>
      </div>
    );
  }

  // WebSocket Connection Hookup (Ready for FastAPI remote endpoint)
  useEffect(() => {
    // Attempt connection to backend WebSocket server
    chatWebSocket.connect();

    const unsubStatus = chatWebSocket.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMessage = chatWebSocket.onMessage((envelope) => {
      if (envelope.type === 'message') {
        const incomingMsg: ChatMessage = envelope.payload;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === incomingMsg.conversationId) {
              return {
                ...c,
                messages: [...c.messages, incomingMsg],
                lastMessage: incomingMsg.content,
                lastMessageTime: incomingMsg.timestamp,
              };
            }
            return c;
          })
        );
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, []);

  // Active Conversation
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isPeerTyping]);

  // Handle Select Conversation
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    // Mark as read
    try {
      await messageApi.markAsRead(id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, attachment?: ChatAttachment) => {
    if (!activeConversation) return;

    try {
      const newMsg = await messageApi.sendMessage(
        activeConversation.id,
        text,
        attachment ? { name: attachment.name, size: attachment.size } : undefined
      );

      // Update local state
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: text || (attachment ? `Sent attachment: ${attachment.name}` : ''),
                lastMessageTime: newMsg.timestamp,
              }
            : c
        )
      );

      // Forward to WebSocket if connected
      chatWebSocket.send({
        type: 'message',
        payload: newMsg,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Candidate & Recruiter Messenger"
        description="Direct real-time communications with technical recruiters, hiring managers, and engineering peers."
        badge={
          <Badge
            variant={wsStatus === 'OPEN' ? 'success' : 'brand'}
            size="sm"
            className="flex items-center gap-1 font-mono text-[10px]"
          >
            {wsStatus === 'OPEN' ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>FastAPI WS Connected</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Realtime Sandbox Ready</span>
              </>
            )}
          </Badge>
        }
      />

      {/* ========================================================================= */}
      {/* DESKTOP TWO-PANEL CHAT CONTAINER (Optimized for 1366px Laptop Screens)    */}
      {/* ========================================================================= */}
      <div className="h-[calc(100vh-175px)] min-h-[440px] max-h-[720px] rounded-2xl bg-white border border-[#D9D9D9] shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* ==================== LEFT PANEL: CONVERSATIONS LIST (280px-320px) ==================== */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 h-full">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* ==================== RIGHT PANEL: ACTIVE CHAT VIEW ==================== */}
        <div className="flex-1 flex flex-col h-full bg-[#F3F2EF] min-w-0 border-t md:border-t-0 md:border-l border-[#D9D9D9]">
          {activeConversation ? (
            <>
              {/* 1. Header: User Information */}
              <ChatHeader conversation={activeConversation} />

              {/* 2. Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F3F2EF]">
                {/* Conversation Start Notice */}
                <div className="text-center py-2">
                  <span className="px-3 py-1 rounded-full bg-white border border-[#D9D9D9] text-[10px] font-mono text-[#788896] shadow-xs">
                    Encrypted channel • Direct hiring communications
                  </span>
                </div>

                {/* Messages List */}
                {activeConversation.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Peer Typing Indicator */}
                {isPeerTyping && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-[#D9D9D9] text-xs text-[#56687A] w-fit shadow-xs animate-in fade-in duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] font-mono ml-1 text-[#788896]">
                      {activeConversation.peer.name} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 3. Bottom: Message Composer */}
              <MessageComposer onSendMessage={handleSendMessage} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#788896] space-y-2">
              <MessageSquare className="w-8 h-8 text-[#788896]" />
              <p className="text-sm font-semibold text-[#1D2226]">No conversation selected</p>
              <p className="text-xs text-[#56687A]">Choose a recruiter or peer from the left panel to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
