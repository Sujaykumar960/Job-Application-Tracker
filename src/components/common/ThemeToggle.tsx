import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  size = 'xs',
  showLabel = true,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs gap-1.5',
    sm: 'px-3 py-2 text-xs gap-2',
    md: 'px-3.5 py-2 text-sm gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
  }[size];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 shadow-xs cursor-pointer select-none',
        isDark
          ? 'bg-[#1E293B] text-[#F8FAFC] border-[#334155] hover:bg-[#334155] hover:border-[#475569]'
          : 'bg-white text-[#1D2226] border-[#D9D9D9] hover:bg-[#F3F6F8] hover:border-[#788896]',
        sizeClasses,
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className={cn(iconSizes, 'text-[#F5A623] animate-in spin-in-180 duration-300')} />
      ) : (
        <Moon className={cn(iconSizes, 'text-[#56687A] transition-transform duration-200 hover:-rotate-12')} />
      )}
      {showLabel && (
        <span className="font-semibold">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
