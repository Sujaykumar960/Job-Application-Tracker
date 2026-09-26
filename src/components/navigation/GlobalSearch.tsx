import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Command,
  Users,
  Building2,
  Briefcase,
  MapPin,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { connectionApi } from '../../api/connectionApi';
import { companyApi } from '../../api/companyApi';
import { jobApi } from '../../api/jobApi';
import { NetworkUser, JobItem } from '../../types';
import { CompanyProfile } from '../../types/company';

type SearchCategoryTab = 'all' | 'candidates' | 'companies' | 'jobs';

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>('all');
  const [isLoading, setIsLoading] = useState(false);

  const [candidates, setCandidates] = useState<NetworkUser[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut listener: Cmd+K / Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close (works anywhere on site, including outside modal & trigger)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // Do not close if clicking inside modal or the trigger button
      if (modalRef.current && modalRef.current.contains(target)) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setActiveTab('all');
    }
  }, [isOpen]);

  // Live search with debounce across Candidates, Companies, and Jobs
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [candRes, compRes, jobRes] = await Promise.allSettled([
          connectionApi.discoverUsers({ search: trimmed || undefined, limit: trimmed ? 6 : 4 }),
          companyApi.getCompanies(trimmed || undefined),
          jobApi.getJobs(trimmed ? ({ search: trimmed } as any) : undefined),
        ]);

        if (candRes.status === 'fulfilled') {
          setCandidates(candRes.value || []);
        }
        if (compRes.status === 'fulfilled') {
          const list = compRes.value || [];
          setCompanies(trimmed ? list.slice(0, 6) : list.slice(0, 4));
        }
        if (jobRes.status === 'fulfilled') {
          const list = jobRes.value || [];
          setJobs(trimmed ? list.slice(0, 6) : list.slice(0, 4));
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, trimmed ? 250 : 0);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Navigation handlers
  const handleSelectCandidate = (candidateId: string) => {
    setIsOpen(false);
    navigate(`/profile/${candidateId}`);
  };

  const handleSelectCompany = (company: CompanyProfile) => {
    setIsOpen(false);
    navigate(`/companies?search=${encodeURIComponent(company.name)}`);
  };

  const handleSelectJob = (job: JobItem) => {
    setIsOpen(false);
    navigate(`/jobs?search=${encodeURIComponent(job.title)}`);
  };

  const totalResultsCount = candidates.length + companies.length + jobs.length;

  const getInitials = (name?: string, fallback?: string): string => {
    if (fallback && fallback.trim()) return fallback.trim();
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return 'CX';
  };

  const getGradient = (gradient?: string): string => {
    const g = (gradient || '').toLowerCase();
    if (g.includes('amber') || g.includes('orange')) return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white';
    if (g.includes('slate') || g.includes('gray')) return 'bg-gradient-to-br from-slate-600 to-gray-700 text-white';
    if (g.includes('emerald') || g.includes('teal')) return 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white';
    if (g.includes('purple') || g.includes('indigo')) return 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white';
    return 'bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white';
  };

  return (
    <>
      {/* Trigger Button in Topbar */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] text-xs text-[#56687A] hover:text-[#1D2226] hover:border-[#0A66C2] transition w-44 sm:w-60 lg:w-72 justify-between group"
        aria-label="Global Search"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-[#56687A] group-hover:text-[#0A66C2] transition" />
          <span className="truncate">Search candidates, companies, jobs...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#D9D9D9] text-[#788896]">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Modal / Command Palette rendered via Portal directly to body */}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-20 p-4">
            {/* Fullscreen Backdrop (Click anywhere on backdrop closes) */}
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-150"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Modal Dialog Container */}
            <div
              ref={modalRef}
              className="relative w-full max-w-xl rounded-2xl bg-white border border-[#D9D9D9] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Top Search Input Bar */}
              <div className="flex items-center px-4 py-3.5 border-b border-[#E8E8E8] gap-3">
                <Search className="w-4 h-4 text-[#0A66C2] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search candidates by name/skills, companies, or jobs..."
                  className="w-full bg-transparent text-sm text-[#1D2226] placeholder-[#788896] focus:outline-none"
                />
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#0A66C2] flex-shrink-0" />}
                {query && !isLoading && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1 text-[#788896] hover:text-[#1D2226] rounded-md transition"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="px-4 py-2 border-b border-[#E8E8E8] bg-[#F8F9FA] flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition flex items-center gap-1',
                    activeTab === 'all'
                      ? 'bg-[#0A66C2] text-white shadow-xs'
                      : 'text-[#56687A] hover:bg-white hover:text-[#1D2226]'
                  )}
                >
                  All Results
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('candidates')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                    activeTab === 'candidates'
                      ? 'bg-[#0A66C2] text-white shadow-xs'
                      : 'text-[#56687A] hover:bg-white hover:text-[#1D2226]'
                  )}
                >
                  <Users className="w-3 h-3" />
                  <span>Candidates</span>
                  {candidates.length > 0 && (
                    <span className="text-[10px] opacity-80">({candidates.length})</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('companies')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                    activeTab === 'companies'
                      ? 'bg-[#0A66C2] text-white shadow-xs'
                      : 'text-[#56687A] hover:bg-white hover:text-[#1D2226]'
                  )}
                >
                  <Building2 className="w-3 h-3" />
                  <span>Companies</span>
                  {companies.length > 0 && (
                    <span className="text-[10px] opacity-80">({companies.length})</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('jobs')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                    activeTab === 'jobs'
                      ? 'bg-[#0A66C2] text-white shadow-xs'
                      : 'text-[#56687A] hover:bg-white hover:text-[#1D2226]'
                  )}
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Jobs</span>
                  {jobs.length > 0 && (
                    <span className="text-[10px] opacity-80">({jobs.length})</span>
                  )}
                </button>
              </div>

              {/* Search Results Stream */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
                {totalResultsCount === 0 && !isLoading ? (
                  <div className="px-4 py-12 text-center text-xs text-[#788896] space-y-2">
                    <p className="font-semibold text-[#1D2226] text-sm">
                      {query ? `No matches found for "${query}"` : 'No results found'}
                    </p>
                    <p className="text-[#56687A]">
                      Try searching by candidate name, programming skill, company, or job title.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: CANDIDATES / USERS */}
                    {(activeTab === 'all' || activeTab === 'candidates') && candidates.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-[#788896] tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-[#0A66C2]" />
                            Candidates & Engineering Profiles
                          </span>
                          <span>{candidates.length}</span>
                        </div>
                        {candidates.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectCandidate(user.id)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-[#F3F6F8] transition text-xs group border border-transparent hover:border-[#D9D9D9]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-xs',
                                  getGradient(user.avatarGradient)
                                )}
                              >
                                {getInitials(user.name, user.avatarInitials)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition truncate">
                                  {user.name}
                                </p>
                                <p className="text-[11px] text-[#56687A] truncate">
                                  {user.headline || 'Software Engineer'} • {user.company || 'Tech'}
                                </p>
                                {user.location && (
                                  <p className="text-[10px] text-[#788896] flex items-center gap-1 font-mono">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {user.location}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-[#0A66C2] font-semibold opacity-0 group-hover:opacity-100 transition flex items-center gap-1 flex-shrink-0 ml-2">
                              <span>View Profile</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SECTION 2: COMPANIES */}
                    {(activeTab === 'all' || activeTab === 'companies') && companies.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-[#788896] tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-emerald-600" />
                            Companies & Employers
                          </span>
                          <span>{companies.length}</span>
                        </div>
                        {companies.map((company) => (
                          <button
                            key={company.id || company.slug}
                            type="button"
                            onClick={() => handleSelectCompany(company)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-[#F3F6F8] transition text-xs group border border-transparent hover:border-[#D9D9D9]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-center font-bold text-xs text-[#0A66C2] flex-shrink-0 shadow-xs">
                                {company.logoInitials || company.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition truncate">
                                  {company.name}
                                </p>
                                <p className="text-[11px] text-[#56687A] truncate">
                                  {company.industry || 'Technology'}
                                  {company.headquarters ? ` • ${company.headquarters}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-700 bg-[#E6F4EA] border border-[#c6ecd2] px-2 py-0.5 rounded-full font-mono font-semibold flex-shrink-0 ml-2">
                              View Company
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SECTION 3: JOBS */}
                    {(activeTab === 'all' || activeTab === 'jobs') && jobs.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-[#788896] tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-purple-600" />
                            Active Jobs & Opportunities
                          </span>
                          <span>{jobs.length}</span>
                        </div>
                        {jobs.map((job) => (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => handleSelectJob(job)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-[#F3F6F8] transition text-xs group border border-transparent hover:border-[#D9D9D9]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-xl bg-[#F3E5F5] border border-[#E1BEE7] text-[#6A1B9A] flex items-center justify-center flex-shrink-0">
                                <Briefcase className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition truncate">
                                  {job.title}
                                </p>
                                <p className="text-[11px] text-[#56687A] truncate">
                                  {job.company} • {job.location || 'Remote'}
                                  {job.workType ? ` (${job.workType})` : ''}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#D9D9D9] group-hover:text-[#0A66C2] group-hover:translate-x-0.5 transition flex-shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom Keyboard Hint Bar */}
              <div className="px-4 py-2.5 border-t border-[#E8E8E8] bg-[#F8F9FA] flex items-center justify-between text-[11px] text-[#788896]">
                <span className="flex items-center gap-2">
                  <span>Click outside or press</span>
                  <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#D9D9D9] text-[#788896]">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>
                <span className="text-[10px] font-mono text-[#56687A]">
                  CareerX Universal Search
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default GlobalSearch;
