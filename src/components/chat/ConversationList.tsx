import React, { useState } from 'react';
import { ChatConversation } from '../../api/chatWebSocket';
import { Search, X, SquarePen, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvatarGradientClass, getAvatarInitials } from './avatarUtils';

export interface ConversationListProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewConversation?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  onNewConversation,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  // Strict deduplication by peer ID so duplicate threads can never appear in UI
  const uniqueConversations = React.useMemo(() => {
    const seen = new Set<string>();
    const result: ChatConversation[] = [];
    for (const c of conversations) {
      const pid = c.peer?.id || c.id;
      if (!seen.has(pid)) {
        seen.add(pid);
        result.push(c);
      }
    }
    return result;
  }, [conversations]);

  const totalUnread = uniqueConversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const filteredConversations = uniqueConversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.peer.name.toLowerCase().includes(q) ||
      (c.peer.company && c.peer.company.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q));

    const matchesFilter = filterMode === 'all' || c.unreadCount > 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 select-none">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Messages
            </h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#0A66C2] text-white font-mono text-[10px] font-bold">
                {totalUnread} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-medium border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md transition-all font-semibold',
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md transition-all font-semibold',
                  filterMode === 'unread'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Unread {totalUnread > 0 && `(${totalUnread})`}
              </button>
            </div>

            {onNewConversation && (
              <button
                type="button"
                onClick={onNewConversation}
                className="p-1.5 rounded-lg text-slate-600 hover:text-[#0A66C2] hover:bg-brand-50 transition border border-transparent hover:border-brand-200"
                title="Start new message"
              >
                <SquarePen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-slate-900 placeholder-slate-400 text-xs rounded-xl border border-slate-200 pl-8.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {uniqueConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-800">No conversations yet</p>
            <p className="text-[11px] text-slate-500">Connect with recruiters or peers to begin chatting.</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-800">No conversations found</p>
            <p className="text-[11px] text-slate-500">Check your spelling or reset the filter</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const hasUnread = conv.unreadCount > 0;
            const gradientClass = getAvatarGradientClass(conv.peer.name || conv.peer.id);
            const initials = getAvatarInitials(conv.peer.name, conv.peer.avatarInitials);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'p-3.5 flex items-start gap-3 cursor-pointer transition-all relative border-l-[3px]',
                  isActive
                    ? 'bg-[#F0F7FF] border-[#0A66C2] shadow-xs'
                    : 'border-transparent hover:bg-slate-50/80'
                )}
              >
                {/* Avatar with Online Status Indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-black/5 select-none',
                      gradientClass
                    )}
                  >
                    {initials}
                  </div>
                  {conv.peer.isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-xs" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className={cn(
                      'text-xs truncate tracking-tight',
                      isActive ? 'font-bold text-[#0A66C2]' : 'font-semibold text-slate-900'
                    )}>
                      {conv.peer.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                      {conv.lastMessageTime || ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {conv.peer.headline || 'Software Engineer'}
                    {conv.peer.company && conv.peer.company !== 'Tech' && ` • ${conv.peer.company}`}
                  </p>

                  <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    <p
                      className={cn(
                        'text-xs truncate leading-snug',
                        hasUnread
                          ? 'text-slate-900 font-bold'
                          : isActive
                          ? 'text-slate-700'
                          : 'text-slate-500'
                      )}
                    >
                      {conv.lastMessage || 'Start a conversation...'}
                    </p>

                    {hasUnread && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#0A66C2] text-white font-mono text-[9px] font-bold flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
