import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  INITIAL_NOTIFICATIONS,
  CareerNotification,
  NotificationCategory,
} from '../data/mockNotifications';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  MessageSquare,
  UserPlus,
  Sparkles,
  Flame,
  Check,
  Trash2,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import { cn } from '../utils/cn';

const NOTIFICATIONS_STORAGE_KEY = 'careerx_notifications_v2';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<CareerNotification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const syncNotifications = (updated: CareerNotification[]) => {
    setNotifications(updated);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    syncNotifications(updated);
  };

  // Mark single notification as read
  const handleToggleRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n));
    syncNotifications(updated);
  };

  // Delete notification
  const handleDelete = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    syncNotifications(updated);
  };

  // Clear all read
  const handleClearRead = () => {
    const updated = notifications.filter((n) => !n.isRead);
    syncNotifications(updated);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Category Icon & Color Mapping
  const getCategoryConfig = (category: NotificationCategory) => {
    switch (category) {
      case 'interview_reminder':
        return {
          icon: Calendar,
          label: 'Interview',
          color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
        };
      case 'application_deadline':
        return {
          icon: Clock,
          label: 'Deadline',
          color: 'text-[#B3261E] bg-[#FCE8E6] border-[#f8cbc7]',
        };
      case 'follow_up':
        return {
          icon: AlertCircle,
          label: 'Follow-up',
          color: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
        };
      case 'message':
        return {
          icon: MessageSquare,
          label: 'Message',
          color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
        };
      case 'connection_request':
        return {
          icon: UserPlus,
          label: 'Network',
          color: 'text-[#137333] bg-[#E6F4EA] border-[#c6ecd2]',
        };
      case 'job_recommendation':
        return {
          icon: Sparkles,
          label: 'Job Match',
          color: 'text-[#6A1B9A] bg-[#F3E5F5] border-[#E1BEE7]',
        };
      case 'learning_achievement':
        return {
          icon: Flame,
          label: 'Learning',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
    }
  };

  // Category Filters
  const filterTabs = [
    { id: 'all', label: 'All Notifications' },
    { id: 'interview_reminder', label: 'Interviews' },
    { id: 'application_deadline', label: 'Deadlines' },
    { id: 'follow_up', label: 'Follow-ups' },
    { id: 'message', label: 'Messages' },
    { id: 'connection_request', label: 'Connection Requests' },
    { id: 'job_recommendation', label: 'Job Matches' },
    { id: 'learning_achievement', label: 'Achievements' },
  ];

  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') return notifications;
    return notifications.filter((n) => n.category === selectedFilter);
  }, [notifications, selectedFilter]);

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <PageHeader
        title="Notifications & Action Center"
        description="Real-time interview reminders, application deadlines, recruiter follow-ups, and learning milestones."
        badge={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            {unreadCount} Unread Notifications
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={unreadCount === 0}
              onClick={handleMarkAllAsRead}
              icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Mark All Read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearRead}
              className="text-slate-400 hover:text-rose-400"
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Read
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. FILTER TABS TOOLBAR                                                    */}
      {/* ========================================================================= */}
      <div className="p-2.5 rounded-2xl bg-white border border-[#D9D9D9] flex items-center gap-1.5 overflow-x-auto shadow-sm">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          const count =
            tab.id === 'all'
               ? notifications.length
              : notifications.filter((n) => n.category === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5',
                isActive
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                  isActive ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. NOTIFICATIONS STREAM                                                   */}
      {/* ========================================================================= */}
      <div className="space-y-3 max-w-4xl">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
            <Bell className="w-8 h-8 text-[#788896] mx-auto" />
            <p className="text-sm font-semibold text-[#1D2226]">No notifications in this category</p>
            <p className="text-xs text-[#56687A]">
              You are all caught up! As interviews and deadlines approach, reminders will appear here.
            </p>
            <Button size="xs" variant="outline" onClick={() => setSelectedFilter('all')}>
              Show All Notifications
            </Button>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const config = getCategoryConfig(notif.category);
            const Icon = config.icon;

            return (
              <Card
                key={notif.id}
                className={cn(
                  'p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-sm',
                  notif.isRead
                    ? 'bg-white border-[#E8E8E8] hover:border-[#D9D9D9]'
                    : 'bg-[#E8F3FF] border-[#0A66C2]/40 shadow-sm'
                )}
              >
                {/* Left: Icon + Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category Icon */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 shadow-xs',
                      config.color
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold leading-snug text-[#1D2226]">
                        {notif.title}
                      </h4>

                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#0A66C2] animate-pulse flex-shrink-0" />
                      )}

                      {notif.priority === 'urgent' && (
                        <Badge variant="danger" size="sm">
                          Urgent
                        </Badge>
                      )}

                      <span className="text-[10px] font-mono text-[#788896]">
                        • {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-[#56687A] leading-relaxed font-sans">
                      {notif.description}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {/* Action Link Button */}
                  {notif.actionLabel && notif.actionUrl && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => navigate(notif.actionUrl!)}
                      icon={<ArrowRight className="w-3 h-3" />}
                    >
                      {notif.actionLabel}
                    </Button>
                  )}

                  {/* Mark as Read Toggle */}
                  <button
                    onClick={() => handleToggleRead(notif.id)}
                    className="p-1.5 rounded-lg bg-white text-[#56687A] hover:text-[#1D2226] border border-[#D9D9D9] hover:bg-[#F3F6F8] transition shadow-xs"
                    title={notif.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    <Check className={cn('w-3.5 h-3.5', notif.isRead ? 'text-emerald-600' : '')} />
                  </button>

                  {/* Dismiss / Delete */}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 rounded-lg bg-white text-[#56687A] hover:text-[#B3261E] border border-[#D9D9D9] hover:bg-[#FCE8E6] transition shadow-xs"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
