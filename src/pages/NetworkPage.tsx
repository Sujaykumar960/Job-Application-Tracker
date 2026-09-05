import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CandidateCard } from '../components/network/CandidateCard';
import { ConnectionRequestCard } from '../components/network/ConnectionRequestCard';
import { INITIAL_NETWORK_USERS, NetworkUser, ConnectionState } from '../data/mockNetwork';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Search,
  Filter,
  Sparkles,
  Building2,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { cn } from '../utils/cn';

type NetworkTab = 'suggestions' | 'requests' | 'connections' | 'following';

const NETWORK_STORAGE_KEY = 'careerx_network_users_v2';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();

  // Load and persist network state
  const [users, setUsers] = useState<NetworkUser[]>(() => {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NETWORK_USERS;
      }
    }
    return INITIAL_NETWORK_USERS;
  });

  const [activeTab, setActiveTab] = useState<NetworkTab>('suggestions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('All');

  const syncUsers = (updated: NetworkUser[]) => {
    setUsers(updated);
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(updated));
  };

  // Toggle Connect state between 'Connect' and 'Pending'
  const handleConnectToggle = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextState: ConnectionState = u.connectionState === 'Connect' ? 'Pending' : 'Connect';
        return {
          ...u,
          connectionState: nextState,
          isIncomingRequest: false,
        };
      }
      return u;
    });
    syncUsers(updated);
  };

  // Accept incoming request -> sets state to 'Connected'
  const handleAcceptRequest = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          connectionState: 'Connected' as const,
          isIncomingRequest: false,
          connectedDate: 'Just now',
        };
      }
      return u;
    });
    syncUsers(updated);
  };

  // Ignore incoming request
  const handleIgnoreRequest = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          connectionState: 'Connect' as const,
          isIncomingRequest: false,
        };
      }
      return u;
    });
    syncUsers(updated);
  };

  // Toggle Following
  const handleToggleFollowing = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          isFollowing: !u.isFollowing,
        };
      }
      return u;
    });
    syncUsers(updated);
  };

  // Handle direct message navigation
  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`, { state: { targetUserId: userId } });
  };

  // Calculate Tab Counts
  const incomingRequests = useMemo(
    () => users.filter((u) => u.isIncomingRequest && u.connectionState === 'Pending'),
    [users]
  );

  const outgoingPending = useMemo(
    () => users.filter((u) => !u.isIncomingRequest && u.connectionState === 'Pending'),
    [users]
  );

  const connections = useMemo(
    () => users.filter((u) => u.connectionState === 'Connected'),
    [users]
  );

  const followingUsers = useMemo(
    () => users.filter((u) => u.isFollowing),
    [users]
  );

  const suggestions = useMemo(
    () => users.filter((u) => u.connectionState !== 'Connected' && !u.isIncomingRequest),
    [users]
  );

  // Filtered Users for Current Tab
  const displayedUsers = useMemo(() => {
    let source: NetworkUser[] = [];
    if (activeTab === 'suggestions') source = suggestions;
    else if (activeTab === 'requests') source = incomingRequests;
    else if (activeTab === 'connections') source = connections;
    else if (activeTab === 'following') source = followingUsers;

    return source.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.company.toLowerCase().includes(q) ||
        u.skills.some((s) => s.toLowerCase().includes(q));

      const matchesCompany =
        selectedCompany === 'All' || u.company.toLowerCase() === selectedCompany.toLowerCase();

      return matchesSearch && matchesCompany;
    });
  }, [activeTab, suggestions, incomingRequests, connections, followingUsers, searchQuery, selectedCompany]);

  const companiesList = ['All', 'Stripe', 'Linear', 'Vercel', 'Datadog', 'Netflix', 'Microsoft'];

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <PageHeader
        title="Professional Engineering Network"
        description="Expand your technical network, review inbound recruiter connection requests, and stay in touch with engineering peers."
        badge={
          <Badge variant="brand" size="sm">
            {connections.length + 280} Active Connections
          </Badge>
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/feed')}
            icon={<Sparkles className="w-3.5 h-3.5 text-brand-400" />}
          >
            Engineering Feed
          </Button>
        }
      />

      {/* ========================================================================= */}
      {/* 1. TOP STATS BAR                                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('connections')}
          className={cn(
            'p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between',
            activeTab === 'connections'
              ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-[#788896] block">Connections</span>
            <span className="text-xl font-bold text-[#1D2226] font-mono">{connections.length + 280}</span>
          </div>
          <UserCheck className="w-5 h-5 text-emerald-600" />
        </div>

        <div
          onClick={() => setActiveTab('requests')}
          className={cn(
            'p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between',
            activeTab === 'requests'
              ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-[#788896] block">Inbound Requests</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-[#8A6100] font-mono">{incomingRequests.length}</span>
              {incomingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
          </div>
          <Clock className="w-5 h-5 text-amber-600" />
        </div>

        <div
          onClick={() => setActiveTab('suggestions')}
          className={cn(
            'p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between',
            activeTab === 'suggestions'
              ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-[#788896] block">Suggestions</span>
            <span className="text-xl font-bold text-[#1D2226] font-mono">{suggestions.length}</span>
          </div>
          <UserPlus className="w-5 h-5 text-[#0A66C2]" />
        </div>

        <div
          onClick={() => setActiveTab('following')}
          className={cn(
            'p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between',
            activeTab === 'following'
              ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-[#788896] block">Following</span>
            <span className="text-xl font-bold text-[#1D2226] font-mono">{followingUsers.length + 38}</span>
          </div>
          <Users className="w-5 h-5 text-sky-600" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB CONTROLS & SEARCH/FILTER TOOLBAR                                   */}
      {/* ========================================================================= */}
      <div className="p-3 rounded-2xl bg-white border border-[#D9D9D9] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5',
              activeTab === 'suggestions'
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>People Suggestions</span>
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              activeTab === 'suggestions' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
            )}>
              {suggestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5',
              activeTab === 'requests'
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Connection Requests</span>
            {incomingRequests.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5',
              activeTab === 'connections'
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Connections</span>
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              activeTab === 'connections' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
            )}>
              {connections.length + 280}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5',
              activeTab === 'following'
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Following</span>
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              activeTab === 'following' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
            )}>
              {followingUsers.length + 38}
            </span>
          </button>
        </div>

        {/* Search & Company Filter */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-[#788896] absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, skill, company..."
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            />
          </div>

          {/* Company Filter Dropdown */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-white text-[#1D2226] text-xs font-semibold rounded-xl border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            {companiesList.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Companies' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: CARDS GRID PER ACTIVE TAB                                */}
      {/* ========================================================================= */}

      {/* INCOMING REQUESTS VIEW (Dedicated Request Cards with Accept/Ignore) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Incoming Invitations ({incomingRequests.length})
            </h3>
            {outgoingPending.length > 0 && (
              <span className="text-[11px] text-[#788896] font-mono">
                {outgoingPending.length} Outgoing Pending Requests
              </span>
            )}
          </div>

          {incomingRequests.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No pending connection requests</p>
              <p className="text-xs text-[#56687A]">
                You are all caught up! Browse suggested engineers below to grow your network.
              </p>
              <Button size="xs" variant="outline" onClick={() => setActiveTab('suggestions')}>
                Browse People Suggestions
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <ConnectionRequestCard
                  key={req.id}
                  user={req}
                  onAccept={handleAcceptRequest}
                  onIgnore={handleIgnoreRequest}
                />
              ))}
            </div>
          )}

          {/* Outgoing Pending Requests Section */}
          {outgoingPending.length > 0 && (
            <div className="pt-4 space-y-3">
              <h4 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
                <span>Sent Invitations Waiting for Response ({outgoingPending.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {outgoingPending.map((u) => (
                  <CandidateCard
                    key={u.id}
                    user={u}
                    onConnectToggle={handleConnectToggle}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUGGESTIONS, CONNECTIONS, AND FOLLOWING VIEWS (Responsive 3-Column Grid) */}
      {activeTab !== 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              {activeTab === 'suggestions' && <UserPlus className="w-3.5 h-3.5 text-[#0A66C2]" />}
              {activeTab === 'connections' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
              {activeTab === 'following' && <Users className="w-3.5 h-3.5 text-sky-600" />}
              <span>
                {activeTab === 'suggestions' && 'Recommended Engineers for You'}
                {activeTab === 'connections' && 'Your 1st-Degree Connections'}
                {activeTab === 'following' && 'Engineers & Tech Leaders You Follow'}
              </span>
              <span className="text-[10px] font-mono text-[#788896] font-normal">
                ({displayedUsers.length} shown)
              </span>
            </h3>
          </div>

          {displayedUsers.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No profiles found</p>
              <p className="text-xs text-[#56687A]">
                Try adjusting your search query or company filter.
              </p>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCompany('All');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedUsers.map((user) => (
                <CandidateCard
                  key={user.id}
                  user={user}
                  onConnectToggle={handleConnectToggle}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkPage;
