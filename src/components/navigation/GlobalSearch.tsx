import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Command, Briefcase, FileSearch, Code2, Users, ArrowRight, GitPullRequest } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface SearchResultItem {
  title: string;
  category: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_LINKS: SearchResultItem[] = [
  { title: 'Job Application Tracker', category: 'Tracking', path: '/applications', icon: Briefcase },
  { title: 'Resume-to-Job Match Analysis', category: 'Matching', path: '/job-match', icon: GitPullRequest },
  { title: 'Skill Gap & Competency Roadmap', category: 'Skills', path: '/skills', icon: Code2 },
  { title: 'AI Resume & ATS Scorer', category: 'Intelligence', path: '/resume', icon: FileSearch },
  { title: 'Developer Learning Hub', category: 'Skills', path: '/learning', icon: Code2 },
  { title: 'Open Job Positions', category: 'Career', path: '/jobs', icon: Briefcase },
  { title: 'Engineering Community Feed', category: 'Network', path: '/network', icon: Users },
];

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut listener: Cmd+K or Ctrl+K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredResults = QUICK_LINKS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Trigger Button in Topbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] text-xs text-[#56687A] hover:text-[#1D2226] hover:border-[#0A66C2] transition w-44 sm:w-60 lg:w-72 justify-between group"
        aria-label="Global Search"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-[#56687A] group-hover:text-[#0A66C2] transition" />
          <span className="truncate">Search jobs, skills, candidates...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D9D9D9] text-[#788896]">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Modal / Command Palette */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#D9D9D9] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input Box */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#E8E8E8]">
              <Search className="w-4 h-4 text-[#0A66C2] mr-3 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search platform resources..."
                className="w-full bg-transparent text-sm text-[#1D2226] placeholder-[#788896] focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-[#788896] hover:text-[#1D2226]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results / Suggestions */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-[#788896] tracking-wider">
                Quick Navigation
              </div>

              {filteredResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[#788896]">
                  No matches found for "{query}"
                </div>
              ) : (
                filteredResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-[#F3F6F8] transition text-xs text-[#56687A] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] flex items-center justify-center text-[#56687A] group-hover:text-[#0A66C2] group-hover:border-[#0A66C2] transition">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-[#788896]">{item.category}</span>
                        </div>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-[#D9D9D9] group-hover:text-[#56687A] group-hover:translate-x-0.5 transition" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#E8E8E8] bg-[#F3F6F8] flex items-center justify-between text-[11px] text-[#788896]">
              <span>Navigation: Use mouse or arrow keys</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#D9D9D9] text-[#788896]">
                ESC to close
              </kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;
