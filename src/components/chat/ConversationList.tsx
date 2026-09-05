import React, { useState } from 'react';
import { ChatConversation } from '../../api/chatWebSocket';
import { Search, X, Circle, CheckCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ConversationListProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.peer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.peer.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterMode === 'all' || c.unreadCount > 0;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col bg-white border-r border-[#D9D9D9] select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-[#E8E8E8] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
              Conversations
            </h2>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0A66C2] text-white font-mono text-[10px] font-bold">
                {totalUnread} new
              </span>
            )}
          </div>

          <div className="flex items-center bg-[#F3F6F8] rounded-lg p-0.5 border border-[#D9D9D9] text-[10px] font-mono">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                'px-2 py-0.5 rounded-md transition font-semibold',
                filterMode === 'all'
                  ? 'bg-white text-[#1D2226] shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226]'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('unread')}
              className={cn(
                'px-2 py-0.5 rounded-md transition font-semibold',
                filterMode === 'unread'
                  ? 'bg-white text-[#1D2226] shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226]'
              )}
            >
              Unread {totalUnread > 0 && `(${totalUnread})`}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search messages or recruiters..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#788896] hover:text-[#1D2226]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8]">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#788896] space-y-1">
            <p className="font-semibold text-[#1D2226]">No conversations found</p>
            <p className="text-[11px]">Check your spelling or reset the filter</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const hasUnread = conv.unreadCount > 0;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'p-3 flex items-start gap-3 cursor-pointer transition relative',
                  isActive
                    ? 'bg-[#E8F3FF] border-l-2 border-[#0A66C2]'
                    : 'hover:bg-[#F3F6F8]'
                )}
              >
                {/* Avatar with Online Status Indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow border border-surface-700/60',
                      conv.peer.avatarGradient
                    )}
                  >
                    {conv.peer.avatarInitials}
                  </div>
                  {conv.peer.isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-semibold truncate text-[#1D2226]">
                      {conv.peer.name}
                    </h3>
                    <span className="text-[10px] text-[#788896] font-mono flex-shrink-0">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#0A66C2] font-mono truncate">
                    {conv.peer.headline} • {conv.peer.company}
                  </p>

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <p
                      className={cn(
                        'text-[11px] truncate',
                        hasUnread ? 'text-[#1D2226] font-semibold' : 'text-[#56687A]'
                      )}
                    >
                      {conv.lastMessage}
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
