import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../common/Breadcrumb';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';
import { NotificationBadge } from '../common/NotificationBadge';
import {
  Menu,
  Bell,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TopbarProps {
  onOpenMobileSidebar: () => void;
  isSidebarCollapsed: boolean;
  messagesCount?: number;
  notificationsCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  isSidebarCollapsed,
  messagesCount,
  notificationsCount,
}) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 border-b border-[#D9D9D9] dark:border-[#1E293B] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md transition-all duration-300 ease-in-out',
        // Desktop sidebar offset: 240px on laptop, 256px on large screens, or 72px (collapsed)
        isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60 laptop-lg:pl-64'
      )}
    >
      <div className="h-full px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-4 max-w-[1400px] mx-auto">
        {/* Left: Mobile menu toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger button */}
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B] transition"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb path */}
          <div className="hidden sm:block truncate">
            <Breadcrumb />
          </div>
        </div>

        {/* Center/Right Actions: Global Search, Messages, Notifications, User Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
          {/* Global Search Bar */}
          <GlobalSearch />

          {/* Messages Quick Action */}
          <Link
            to="/messages"
            className="relative p-2 rounded-xl text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B] transition duration-150"
            aria-label="Messages"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1">
              <NotificationBadge
                count={messagesCount !== undefined ? messagesCount : 0}
                showZero
                variant="brand"
              />
            </span>
          </Link>

          {/* Notifications Quick Action */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl text-[#56687A] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] hover:bg-[#F3F6F8] dark:hover:bg-[#1E293B] transition duration-150"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1">
              <NotificationBadge
                count={notificationsCount !== undefined ? notificationsCount : 0}
                showZero
                variant="danger"
              />
            </span>
          </Link>

          <div className="h-5 w-px bg-[#D9D9D9] dark:bg-[#334155] mx-0.5" />

          {/* User Menu Dropdown */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
