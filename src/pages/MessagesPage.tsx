import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageComposer } from '../components/chat/MessageComposer';
import { NewConversationModal } from '../components/chat/NewConversationModal';
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
  Loader2,
  AlertCircle,
  MessageSquarePlus,
  SquarePen,
  Users,
  ShieldCheck,
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Fetch messages for active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CLOSED');

  // Auto-scroll ref and creation guard
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isCreatingRef = useRef(false);
  const location = useLocation();

  const deduplicate = (list: ChatConversation[]): ChatConversation[] => {
    const seen = new Set<string>();
    const out: ChatConversation[] = [];
    for (const c of list) {
      const key = c.peer?.id || c.id;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  };

  // 1. Fetch conversations from backend
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await messageApi.getConversations();
      const deduped = deduplicate(data);
      setConversations(deduped);
      if (deduped.length > 0 && !activeConversationId) {
        setActiveConversationId(deduped[0].id);
      }
    } catch (err) {
      setError('Failed to load conversations. Please try again.');
      console.error('Conversations fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

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

  // 3. Handle deep-link to specific conversation or peer from other modules (Network, Recruiter, Profile)
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

    if (requestedUserId && !isLoading) {
      const matchedConv = conversations.find(
        (c) =>
          c.peer.id === requestedUserId ||
          c.peer.name.toLowerCase().includes(requestedUserId.toLowerCase())
      );
      if (matchedConv) {
        if (activeConversationId !== matchedConv.id) {
          setActiveConversationId(matchedConv.id);
        }
      } else if (!isCreatingRef.current) {
        isCreatingRef.current = true;
        // Auto-create or fetch conversation thread with requested peer
        messageApi
          .createConversation(requestedUserId)
          .then((newConv) => {
            setConversations((prev) => deduplicate([newConv, ...prev]));
            setActiveConversationId(newConv.id);
          })
          .catch((err) => {
            console.error('Failed to auto-create conversation with peer:', err);
          })
          .finally(() => {
            isCreatingRef.current = false;
          });
      }
    }
  }, [location.search, location.state, conversations, isLoading]);

  // 4. WebSocket Connection Hookup
  useEffect(() => {
    chatWebSocket.connect();

    const unsubStatus = chatWebSocket.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubMessage = chatWebSocket.onMessage((envelope) => {
      if (envelope.type === 'message') {
        const incomingMsg: ChatMessage = envelope.payload;
        setMessages((prev) => {
          if (incomingMsg.conversationId === activeConversationId) {
            const exists = prev.some((m) => m.id === incomingMsg.id);
            return exists ? prev : [...prev, incomingMsg];
          }
          return prev;
        });

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === incomingMsg.conversationId) {
              return {
                ...c,
                messages: [...(c.messages || []), incomingMsg],
                lastMessage: incomingMsg.content,
                lastMessageTime: incomingMsg.timestamp,
                unreadCount:
                  c.id === activeConversationId ? 0 : (c.unreadCount || 0) + 1,
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
  }, [activeConversationId]);

  // Active Conversation resolution
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return conversations[0] || null;
    return conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;
  }, [conversations, activeConversationId]);

  // Display messages
  const displayMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    return activeConversation?.messages || [];
  }, [messages, activeConversation]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, isPeerTyping]);

  // Handle Select Conversation
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      await messageApi.markAsRead(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // Handle Select Peer from New Conversation Modal
  const handleSelectPeer = async (peerId: string) => {
    const existing = conversations.find((c) => c.peer.id === peerId);
    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    try {
      const newConv = await messageApi.createConversation(peerId);
      setConversations((prev) => deduplicate([newConv, ...prev]));
      setActiveConversationId(newConv.id);
    } catch (err) {
      console.error('Failed to create conversation:', err);
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

      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: [...(c.messages || []), newMsg],
                lastMessage: text || (attachment ? `Sent attachment: ${attachment.name}` : ''),
                lastMessageTime: newMsg.timestamp,
              }
            : c
        )
      );

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
        showBreadcrumbs={false}
        title="Candidate & Recruiter Messenger"
        description="Direct real-time communications with technical recruiters, hiring managers, and connected candidates."
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

      {/* Main Container */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[440px] bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
          <span className="text-sm font-medium text-slate-500">Loading conversations...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[440px] bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center gap-4">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">Unable to load conversations</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <Button size="sm" variant="primary" onClick={fetchConversations}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="h-[calc(100vh-200px)] min-h-[520px] max-h-[760px] rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row">
          {/* ==================== LEFT PANEL: CONVERSATIONS LIST ==================== */}
          <div className="w-full md:w-80 lg:w-88 flex-shrink-0 h-full border-r border-slate-200/80">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewConversation={() => setIsNewChatModalOpen(true)}
            />
          </div>

          {/* ==================== RIGHT PANEL: ACTIVE CHAT VIEW ==================== */}
          <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] min-w-0 border-t md:border-t-0">
            {activeConversation ? (
              <>
                {/* 1. Header: User Information */}
                <ChatHeader conversation={activeConversation} />

                {/* 2. Messages Stream */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-[#F8FAFC]">
                  <div className="text-center py-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-500 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0A66C2]" />
                      End-to-end encrypted channel • Direct hiring & peer communications
                    </span>
                  </div>

                  {isLoadingMessages && displayMessages.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A66C2]" />
                      <span>Loading messages...</span>
                    </div>
                  ) : displayMessages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-600">No messages in this thread yet</p>
                      <p>Send a message below to start the conversation.</p>
                    </div>
                  ) : (
                    displayMessages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))
                  )}

                  {isPeerTyping && (
                    <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 w-fit shadow-xs animate-in fade-in duration-150">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-bounce [animation-delay:0.4s]" />
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 ml-1">
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-[#0A66C2] shadow-xs">
                  <MessageSquarePlus className="w-8 h-8" />
                </div>
                <div className="max-w-sm space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">Start a Conversation</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {conversations.length === 0
                      ? 'You have no active message threads yet. Connect with other candidates and start chatting directly.'
                      : 'Select a conversation from the left panel or start a new chat with a connection.'}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 pt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsNewChatModalOpen(true)}
                    icon={<SquarePen className="w-3.5 h-3.5" />}
                  >
                    Start New Message
                  </Button>
                  <Link to="/network?tab=connections">
                    <Button size="sm" variant="outline" icon={<Users className="w-3.5 h-3.5" />}>
                      View Connections
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Conversation Selection Modal */}
      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectPeer={handleSelectPeer}
        existingPeerIds={conversations.map((c) => c.peer.id)}
      />
    </div>
  );
};

export default MessagesPage;
