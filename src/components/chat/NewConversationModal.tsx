import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { connectionApi } from '../../api/connectionApi';
import { NetworkUser } from '../../types';
import {
  Search,
  MessageSquare,
  Users,
  Loader2,
  AlertCircle,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPeer: (peerId: string) => Promise<void>;
  existingPeerIds?: string[];
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectPeer,
  existingPeerIds = [],
}) => {
  const [connections, setConnections] = useState<NetworkUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartingPeerId, setIsStartingPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchConnections = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await connectionApi.getConnections();
        setConnections(data);
      } catch (err) {
        console.error('Failed to load connections:', err);
        setError('Failed to load your connections. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [isOpen]);

  const filteredConnections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.headline && c.headline.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.skills && c.skills.some((s) => s.toLowerCase().includes(q)))
    );
  }, [connections, searchQuery]);

  const handleStartChat = async (peerId: string) => {
    try {
      setIsStartingPeerId(peerId);
      await onSelectPeer(peerId);
      onClose();
    } catch (err) {
      console.error('Failed to start conversation:', err);
      alert('Unable to start conversation. Please try again.');
    } finally {
      setIsStartingPeerId(null);
    }
  };

  const getInitials = (name: string, fallback?: string) => {
    if (fallback && fallback.trim()) return fallback.trim();
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return 'CX';
  };

  const getGradient = (gradient?: string) => {
    const g = (gradient || '').toLowerCase();
    if (g.includes('amber') || g.includes('orange')) return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white';
    if (g.includes('slate') || g.includes('gray')) return 'bg-gradient-to-br from-slate-600 to-gray-700 text-white';
    if (g.includes('emerald') || g.includes('teal')) return 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white';
    if (g.includes('purple') || g.includes('indigo')) return 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white';
    return 'bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Conversation"
      subtitle="Select a 1st-degree connection to start messaging"
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Search Header */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, headline, company, or skill..."
            className="w-full bg-white dark:bg-[#1E293B] text-[#1D2226] dark:text-[#F8FAFC] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] dark:border-[#334155] pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-[#38BDF8]"
            autoFocus
          />
        </div>

        {/* Content Stream */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5 text-[#56687A] dark:text-[#94A3B8]">
              <Loader2 className="w-7 h-7 animate-spin text-[#0A66C2] dark:text-[#38BDF8]" />
              <span className="text-xs font-medium">Loading your connections...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center rounded-xl bg-[#FDF2F2] dark:bg-[#451A22] border border-[#F8D7DA] dark:border-[#7F1D1D] space-y-2">
              <AlertCircle className="w-6 h-6 text-[#E6395A] dark:text-[#F87171] mx-auto" />
              <p className="text-xs text-[#E6395A] dark:text-[#F87171] font-semibold">{error}</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#D9D9D9] dark:border-[#334155] bg-[#F3F6F8] dark:bg-[#1E293B]/40 space-y-3">
              <Users className="w-8 h-8 text-[#788896] dark:text-[#64748B] mx-auto" />
              <div>
                <p className="text-sm font-semibold text-[#1D2226] dark:text-[#F8FAFC]">No connections yet</p>
                <p className="text-xs text-[#56687A] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto">
                  When you send or accept connection requests with candidates and peers, they will appear here so you can chat.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/network"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition shadow-xs"
                >
                  <span>Explore Network & Find Peers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#F3F6F8] dark:bg-[#1E293B]/50 text-[#56687A] dark:text-[#94A3B8] text-xs">
              No connections match <span className="font-semibold text-[#1D2226] dark:text-[#F8FAFC]">"{searchQuery}"</span>.
            </div>
          ) : (
            filteredConnections.map((user) => {
              const hasExistingChat = existingPeerIds.includes(user.id);
              const isStarting = isStartingPeerId === user.id;

              return (
                <div
                  key={user.id}
                  className="p-3 rounded-xl border border-[#E8E8E8] dark:border-[#334155] hover:border-[#0A66C2]/50 hover:bg-[#F3F6F8]/60 dark:hover:bg-[#1E293B] transition flex items-center justify-between gap-3 group bg-white dark:bg-[#1E293B]/40 shadow-xs"
                >
                  {/* Left: Avatar + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-xs',
                        getGradient(user.avatarGradient)
                      )}
                    >
                      {getInitials(user.name, user.avatarInitials)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1D2226] dark:text-[#F8FAFC] truncate">
                          {user.name}
                        </span>
                        {hasExistingChat && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#E8F3FF] dark:bg-[#0A66C2]/20 text-[#0A66C2] dark:text-[#38BDF8] text-[9px] font-mono font-semibold">
                            Existing Chat
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#56687A] dark:text-[#94A3B8] truncate">
                        {user.headline || 'Software Engineer'} • {user.company || 'Tech'}
                      </p>
                      {user.location && (
                        <p className="text-[10px] text-[#788896] dark:text-[#64748B] flex items-center gap-1 font-mono">
                          <MapPin className="w-2.5 h-2.5" />
                          {user.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <Button
                    size="xs"
                    variant={hasExistingChat ? 'secondary' : 'primary'}
                    disabled={isStarting}
                    onClick={() => handleStartChat(user.id)}
                    icon={
                      isStarting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )
                    }
                  >
                    {isStarting ? 'Opening...' : hasExistingChat ? 'Open Chat' : 'Message'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewConversationModal;
