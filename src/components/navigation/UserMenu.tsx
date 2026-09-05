import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import {
  User,
  Settings,
  ShieldCheck,
  Check,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const UserMenu: React.FC = () => {
  const { user, role, toggleRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CX';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 p-1 rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30',
          isOpen ? 'bg-[#F3F6F8]' : 'hover:bg-[#F3F6F8]'
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-lg object-cover border border-[#D9D9D9]"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#E8F3FF] text-[#0A66C2] font-semibold border border-[#d0e6fc] flex items-center justify-center text-xs">
              {initials}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#12B886] ring-2 ring-white" />
        </div>

        {/* User text (desktop) */}
        <div className="hidden desktop:flex flex-col text-left">
          <span className="text-xs font-semibold text-[#1D2226] leading-tight">
            {user?.name ? user.name.split(' ')[0] : 'User'}
          </span>
          <span className="text-[10px] text-[#56687A] capitalize leading-tight">
            {role}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#56687A] transition-transform duration-150',
            isOpen && 'rotate-180 text-[#1D2226]'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#D9D9D9] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          {/* Header section */}
          <div className="px-3 py-2.5 border-b border-[#E8E8E8] mb-1">
            <p className="text-xs font-bold text-[#1D2226] truncate">{user?.name || 'Account'}</p>
            <p className="text-[11px] text-[#56687A] truncate">{user?.email || ''}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="brand" size="sm">
                ATS Score: {user?.atsScore || 88}%
              </Badge>
              <span className="text-[10px] text-[#56687A] font-mono">
                {role === 'seeker' ? 'Job Seeker' : 'Recruiter'}
              </span>
            </div>
          </div>

          {/* Role switcher button */}
          <div className="p-1">
            <button
              onClick={() => {
                toggleRole();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#1D2226] hover:bg-[#F3F6F8] transition duration-150 group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0A66C2] group-hover:scale-110 transition" />
                <span>Switch to {role === 'seeker' ? 'Recruiter' : 'Seeker'}</span>
              </span>
              <Check className="w-3.5 h-3.5 text-[#0A66C2]" />
            </button>
          </div>

          <div className="h-px bg-[#E8E8E8] my-1" />

          {/* Links */}
          <div className="space-y-0.5 text-xs">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1D2226] hover:text-[#0A66C2] hover:bg-[#F3F6F8] transition"
              role="menuitem"
            >
              <User className="w-3.5 h-3.5 text-[#56687A]" />
              <span>Public Profile</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1D2226] hover:text-[#0A66C2] hover:bg-[#F3F6F8] transition"
              role="menuitem"
            >
              <Settings className="w-3.5 h-3.5 text-[#56687A]" />
              <span>Account Settings</span>
            </Link>

            <Link
              to="/learning"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1D2226] hover:text-[#0A66C2] hover:bg-[#F3F6F8] transition"
              role="menuitem"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#56687A]" />
              <span>Learning Hub</span>
            </Link>

            {/* Theme Toggle in Menu */}
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[#1D2226] hover:text-[#0A66C2] hover:bg-[#F3F6F8] transition text-left"
              role="menuitem"
            >
              <span className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#56687A]" />
                )}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="text-[10px] uppercase font-mono text-[#788896]">
                {theme}
              </span>
            </button>
          </div>

          <div className="h-px bg-[#E8E8E8] my-1" />

          {/* Logout */}
          <button
            onClick={async () => {
              setIsOpen(false);
              await logout();
              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#E6395A] hover:text-[#B3261E] hover:bg-[#FCE8E6] transition text-xs text-left"
            role="menuitem"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
