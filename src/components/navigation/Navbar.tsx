import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import {
  Sparkles,
  LayoutDashboard,
  Briefcase,
  FileSearch,
  GitPullRequest,
  Code2,
  Building2,
  UserCheck,
  Users,
  MessageSquare,
  Calendar,
  Bell,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, role, toggleRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Tracker', path: '/applications', icon: Briefcase },
    { label: 'AI Resume', path: '/resume', icon: FileSearch },
    { label: 'Skill Match', path: '/matcher', icon: GitPullRequest },
    { label: 'Dev Hub', path: '/learning', icon: Code2 },
    { label: 'Jobs', path: '/jobs', icon: Building2 },
    { label: 'Recruiter', path: '/recruiter', icon: UserCheck, highlight: true },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D9D9D9] bg-white/95 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-[#1D2226] font-sans">
                Career<span className="text-[#0A66C2]">X</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#E8F3FF] text-[#0A66C2] border border-[#d0e6fc]">
                SaaS
              </span>
            </div>
          </Link>
        </div>

        {/* Center Nav Links - Laptop optimized */}
        <nav className="hidden laptop:flex items-center gap-1 overflow-x-auto py-1">
          {navLinks.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-[#E8F3FF] text-[#0A66C2] font-semibold border border-[#d0e6fc]'
                    : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]',
                  item.highlight && role === 'recruiter' && 'ring-1 ring-[#137333]/40 text-[#137333]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Role Switcher */}
          <button
            onClick={toggleRole}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition duration-150',
              role === 'seeker'
                ? 'bg-[#E8F3FF] border-[#d0e6fc] text-[#0A66C2] hover:bg-[#d0e6fc]'
                : 'bg-[#E6F4EA] border-[#c6ecd2] text-[#137333] hover:bg-[#c6ecd2]'
            )}
            title="Toggle Seeker / Recruiter View"
          >
            <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
            <span className="capitalize">{role === 'seeker' ? 'Seeker Mode' : 'Recruiter Mode'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Link */}
          <Link
            to="/notifications"
            className="p-1.5 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </Link>

          {/* Settings Link */}
          <Link
            to="/settings"
            className="p-1.5 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Profile link */}
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#F3F6F8] transition"
          >
            <div className="w-8 h-8 rounded-full bg-[#E8F3FF] border border-[#d0e6fc] text-[#0A66C2] font-semibold text-xs flex items-center justify-center">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'CX'}
            </div>
          </Link>
        </div>
      </div>

      {/* Sub-bar for smaller laptop viewports */}
      <div className="laptop:hidden flex items-center gap-1 px-4 py-2 border-t border-[#E8E8E8] overflow-x-auto bg-[#F3F6F8]">
        {navLinks.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition',
                isActive
                  ? 'bg-[#E8F3FF] text-[#0A66C2] font-semibold'
                  : 'text-[#56687A] hover:text-[#1D2226]'
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
