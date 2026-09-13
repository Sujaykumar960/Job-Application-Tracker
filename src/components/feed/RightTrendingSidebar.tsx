import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  UserPlus,
  UserCheck,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Hash,
} from 'lucide-react';
import { connectionApi } from '../../api/connectionApi';
import { NetworkUser } from '../../types';

export const RightTrendingSidebar: React.FC = () => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [suggestedPeers, setSuggestedPeers] = useState<NetworkUser[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await connectionApi.getSuggestedConnections();
        setSuggestedPeers(data);
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      }
    };
    fetchSuggestions();
  }, []);

  const trendingTopics = [
    { tag: 'RedisLuaScripts', count: '1.4k posts', category: 'Backend' },
    { tag: 'KafkaPartitioning', count: '980 posts', category: 'Distributed' },
    { tag: 'PostgreSQL_17', count: '740 posts', category: 'Databases' },
    { tag: 'LocalFirstArchitecture', count: '520 posts', category: 'FullStack' },
    { tag: 'MonacoEditorSandbox', count: '380 posts', category: 'Frontend' },
  ];

  const toggleConnect = async (id: string) => {
    try {
      await connectionApi.sendConnectionRequest(id);
      setConnectedPeers((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to send connection request:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Trending Topics Card */}
      <Card className="p-3.5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#0A66C2]" />
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
              Trending Topics
            </h3>
          </div>
          <Badge variant="brand" size="sm">
            Live
          </Badge>
        </div>

        <div className="space-y-2">
          {trendingTopics.map((t) => (
            <div
              key={t.tag}
              className="p-2 rounded-lg bg-[#F3F6F8] border border-[#E8E8E8] hover:border-[#0A66C2]/40 transition cursor-pointer flex items-center justify-between group"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition flex items-center gap-1 truncate font-mono">
                  <Hash className="w-3 h-3 text-[#788896]" />
                  {t.tag}
                </span>
                <span className="text-[10px] text-[#788896] font-mono">{t.count}</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#56687A] border border-[#D9D9D9]">
                {t.category}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommended Connections Card */}
      <Card className="p-3.5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
              People to Connect
            </h3>
          </div>
        </div>

        <div className="space-y-2.5">
          {suggestedPeers.length === 0 ? (
            <p className="text-xs text-[#788896] text-center py-2">No connection suggestions right now.</p>
          ) : (
            suggestedPeers.slice(0, 4).map((peer) => {
              const isConn = connectedPeers.has(peer.id) || peer.connectionState === 'pending' || peer.connectionState === 'connected';

              return (
                <div
                  key={peer.id}
                  className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-xs font-bold text-[#0A66C2] flex-shrink-0">
                      {peer.avatarInitials || peer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#1D2226] truncate">{peer.name}</h4>
                      <p className="text-[10px] text-[#56687A] truncate">{peer.headline}</p>
                      <span className="text-[9px] text-[#788896] font-mono">
                        {peer.mutualConnections || peer.mutualCount || 0} mutual connections
                      </span>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant={isConn ? 'outline' : 'secondary'}
                    onClick={() => toggleConnect(peer.id)}
                    className="flex-shrink-0 text-[10px] px-2"
                    icon={
                      isConn ? (
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )
                    }
                  >
                    {isConn ? 'Sent' : 'Connect'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Quick Hiring Spotlight */}
      <Card className="p-3.5 bg-white border border-[#D9D9D9] space-y-2">
        <div className="flex items-center justify-between text-xs pb-1 border-b border-[#E8E8E8]">
          <span className="font-bold text-[#1D2226] flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-amber-500" />
            Spotlight Opportunities
          </span>
          <Link to="/jobs" className="text-[10px] text-[#0A66C2] hover:text-[#004182]">
            View All →
          </Link>
        </div>
        <p className="text-[11px] text-[#38434F]">
          Stripe and Linear are hiring for Senior Backend & Product roles matching 94%+ of your active profile.
        </p>
        <Link to="/jobs" className="block pt-1">
          <Button size="xs" variant="outline" className="w-full text-xs">
            Open Job Marketplace
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default RightTrendingSidebar;
