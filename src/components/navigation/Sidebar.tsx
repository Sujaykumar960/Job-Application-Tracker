import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationBadge } from '../common/NotificationBadge';
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Building,
  FileSearch,
  Code2,
  TrendingUp,
  Radio,
  Users,
  MessageSquare,
  Calendar,
  Bell,
  User,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeVariant?: 'danger' | 'brand' | 'warning' | 'emerald';
  /** If set, only users with these roles will see this item */
  roles?: string[];
}

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  applicationsCount?: number;
  messagesCount?: number;
  notificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  applicationsCount,
  messagesCount,
  notificationsCount,
}) => {
  const location = useLocation();
  const { role } = useAuth();

  const allNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      label: 'Applications',
      path: '/applications',
      icon: Briefcase,
      badgeCount: applicationsCount !== undefined ? applicationsCount : 0,
      badgeVariant: 'brand',
    },
    { label: 'Jobs', path: '/jobs', icon: Building2 },
    { label: 'Companies', path: '/companies', icon: Building },
    { label: 'Resume AI', path: '/resume', icon: FileSearch },
    { label: 'Learning Hub', path: '/learning', icon: Code2 },
    { label: 'Progress', path: '/progress', icon: TrendingUp },
    { label: 'Social Feed', path: '/feed', icon: Radio },
    { label: 'Network', path: '/network', icon: Users },
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageSquare,
      badgeCount: messagesCount !== undefined ? messagesCount : 0,
      badgeVariant: 'brand',
    },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badgeCount: notificationsCount !== undefined ? notificationsCount : 0,
      badgeVariant: 'danger',
    },
    { label: 'Profile', path: '/profile', icon: User },
    // Recruiter Portal: only visible to recruiters and admins
    { label: 'Recruiter Portal', path: '/recruiter', icon: UserCheck, roles: ['recruiter', 'admin'] },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // Filter nav items by current user role
  const navItems = allNavItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0B1120] border-r border-[#D9D9D9] dark:border-[#1E293B] transition-all duration-300 ease-in-out',
          // Desktop sizing: 240px on laptop, 256px on large screens, or 72px (collapsed)
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-60 laptop-lg:w-64',
          // Mobile responsive slide-in
          isMobileOpen
            ? 'translate-x-0 w-60 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header: Brand & Logo */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#D9D9D9] dark:border-[#1E293B] flex-shrink-0">
          <NavLink
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 overflow-hidden group"
          >
            <div className="w-7 h-7 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex items-center gap-1.5 overflow-hidden transition-opacity duration-200">
                <span className="font-extrabold text-sm tracking-tight text-[#1D2226] dark:text-[#F8FAFC] font-sans">
                  Career<span className="text-[#0A66C2]">X</span>
                </span>
                <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-[#E8F3FF] dark:bg-[#1E293B] text-[#0A66C2] dark:text-[#38BDF8] border border-[#d0e6fc] dark:border-[#334155]">
                  PRO
                </span>
              </div>
            )}
          </NavLink>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B]"
            aria-label="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#E8F3FF] dark:bg-[#1E293B] text-[#0A66C2] dark:text-[#38BDF8] font-semibold'
                    : 'text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B]',
                  isCollapsed && !isMobileOpen && 'justify-center px-2 py-2'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
                    isActive ? 'text-[#0A66C2] dark:text-[#38BDF8]' : 'text-[#56687A] dark:text-[#94A3B8] group-hover:text-[#1D2226] dark:group-hover:text-[#F8FAFC]'
                  )}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate flex-1">{item.label}</span>
                )}

                {/* Badge if present */}
                {item.badgeCount !== undefined && (!isCollapsed || isMobileOpen) && (
                  <NotificationBadge
                    count={item.badgeCount}
                    variant={isActive ? 'emerald' : item.badgeVariant}
                    showZero
                  />
                )}

                {/* Dot indicator when collapsed */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && isCollapsed && !isMobileOpen && (
                  <span className="absolute top-1.5 right-1.5">
                    <NotificationBadge dot variant={item.badgeVariant} />
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Role Status & Desktop Collapse Toggle */}
        <div className="p-3 border-t border-[#D9D9D9] dark:border-[#1E293B] bg-white dark:bg-[#0B1120] flex-shrink-0 flex items-center justify-between">
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={cn(
                  'w-2 h-2 rounded-full animate-pulse flex-shrink-0',
                  role === 'seeker' ? 'bg-[#0A66C2]' : 'bg-[#12B886]'
                )}
              />
              <span className="text-[11px] text-[#56687A] dark:text-[#94A3B8] truncate capitalize">
                {role === 'seeker' ? 'Job Seeker Mode' : 'Recruiter Mode'}
              </span>
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex items-center justify-center p-1.5 rounded-lg text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B] transition duration-150',
              isCollapsed && 'w-full'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
