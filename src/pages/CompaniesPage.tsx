import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CompanyCard } from '../components/companies/CompanyCard';
import { CompanyDetailModal } from '../components/companies/CompanyDetailModal';
import { JobMatchModal } from '../components/jobs/JobMatchModal';
import { companyApi } from '../api/companyApi';
import { applicationApi } from '../api/applicationApi';
import { resumeApi } from '../api/resumeApi';
import { useAuth } from '../context/AuthContext';
import { CompanyProfile } from '../types/company';
import { JobItem, Application } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  Sparkles,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Companies state from backend
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies from backend
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await companyApi.getCompanies();
        setCompanies(data);
      } catch (err) {
        setError('Failed to load companies. Please try again.');
        console.error('Companies fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [matchAnalysisJob, setMatchAnalysisJob] = useState<JobItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [quickFilter, setQuickFilter] = useState<'all' | 'openRoles' | 'following' | 'highMatch'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track applied jobs (would need to be fetched from backend)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Helper to calculate real-time match score for a company
  const getCompanyMatchScore = (c: CompanyProfile): number => {
    if (c.matchScore !== undefined && c.matchScore !== null) {
      return c.matchScore;
    }
    if (c.jobs && c.jobs.length > 0) {
      const scores = c.jobs.map((j) => j.matchScore || 0);
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    return user?.atsScore ? Math.round((user.atsScore + 85) / 2) : 88;
  };

  // Follow Toggle with optimistic instant UI update
  const handleFollowToggle = async (companyId: string) => {
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === companyId || c.slug === companyId) {
          const nextFollowing = !c.isFollowing;
          const nextCount = Math.max(0, (c.followersCount || 0) + (nextFollowing ? 1 : -1));
          return { ...c, isFollowing: nextFollowing, followersCount: nextCount };
        }
        return c;
      })
    );

    try {
      const result = await companyApi.toggleFollowCompany(companyId);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId || c.slug === companyId
            ? { ...c, isFollowing: result.isFollowing, followersCount: result.followersCount }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      // Revert optimistic update
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === companyId || c.slug === companyId) {
            const nextFollowing = !c.isFollowing;
            const nextCount = Math.max(0, (c.followersCount || 0) + (nextFollowing ? 1 : -1));
            return { ...c, isFollowing: nextFollowing, followersCount: nextCount };
          }
          return c;
        })
      );
      alert('Failed to update follow status. Please try again.');
    }
  };

  // Apply to Job
  const handleApplyJob = async (job: JobItem) => {
    const alreadyApplied = appliedJobIds.has(job.id);
    if (alreadyApplied) {
      setToastMessage(`You have already applied to ${job.title} at ${job.company}`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    try {
      let resumeName = '';
      let resumeId = '';
      try {
        const activeRes = await resumeApi.getActiveResume();
        if (activeRes) {
          resumeName = activeRes.name;
          resumeId = activeRes.id;
        }
      } catch {
        // Fall back to server auto-attaching resume
      }

      const newApplication: Application = {
        id: `app-${Date.now()}`,
        jobId: job.id,
        companyId: job.companyId || selectedCompany?.id,
        company: job.company,
        role: job.title,
        location: job.location,
        appliedDate: new Date().toISOString().split('T')[0],
        deadline: '2026-09-30',
        status: 'Applied',
        priority: 'High',
        matchScore: job.matchScore,
        salaryRange: job.salaryRange,
        tags: job.skills.slice(0, 3).map((s) => s.name),
        notes: `Direct application submitted via CareerX Companies Portal. Tech stack verified: ${job.skills.map((s) => s.name).join(', ')}.`,
        resume: resumeName || undefined,
        resumeId: resumeId || undefined,
      };

      await applicationApi.createApplication(newApplication);
      setAppliedJobIds((prev) => new Set([...prev, job.id]));
      setToastMessage(`🎉 Applied successfully to ${job.title} at ${job.company}! Added to your Application Tracker.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to apply:', err);
      const msg = err.response?.data?.detail || 'Failed to submit application. Please try again.';
      alert(msg);
    }
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.headquarters.toLowerCase().includes(q) ||
          (c.techStack && c.techStack.some((t) => t.toLowerCase().includes(q))) ||
          (c.jobs && c.jobs.some((j) => j.title.toLowerCase().includes(q)));

        const matchesIndustry =
          selectedIndustry === 'All' || (c.industry && c.industry.toLowerCase().includes(selectedIndustry.toLowerCase()));

        // Quick filter from the top metric boxes
        let matchesQuick = true;
        if (quickFilter === 'openRoles') {
          matchesQuick = (c.jobs?.length || c.openJobsCount || 0) > 0;
        } else if (quickFilter === 'following') {
          matchesQuick = Boolean(c.isFollowing);
        } else if (quickFilter === 'highMatch') {
          const avgScore = getCompanyMatchScore(c);
          const hasTopJob = c.jobs && c.jobs.some((j) => (j.matchScore || 0) >= 90);
          matchesQuick = avgScore >= 90 || Boolean(hasTopJob);
        }

        return matchesSearch && matchesIndustry && matchesQuick;
      })
      .sort((a, b) => {
        if (quickFilter === 'openRoles') {
          return (b.openJobsCount || b.jobs?.length || 0) - (a.openJobsCount || a.jobs?.length || 0);
        }
        if (quickFilter === 'highMatch') {
          return getCompanyMatchScore(b) - getCompanyMatchScore(a);
        }
        return 0;
      });
  }, [companies, searchQuery, selectedIndustry, quickFilter]);

  const totalJobs = useMemo(
    () => companies.reduce((acc, c) => acc + (c.jobs?.length || c.openJobsCount || 0), 0),
    [companies]
  );

  const followingCount = useMemo(
    () => companies.filter((c) => c.isFollowing).length,
    [companies]
  );

  const highMatchCompaniesCount = useMemo(
    () =>
      companies.filter((c) => {
        const avgScore = getCompanyMatchScore(c);
        const hasTopJob = c.jobs && c.jobs.some((j) => (j.matchScore || 0) >= 90);
        return avgScore >= 90 || Boolean(hasTopJob);
      }).length,
    [companies]
  );

  const avgMatchPercent = useMemo(() => {
    if (companies.length === 0) return 91;
    const total = companies.reduce((acc, c) => acc + getCompanyMatchScore(c), 0);
    return Math.round(total / companies.length);
  }, [companies]);

  const industriesList = useMemo(() => {
    const list = ['All'];
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry && c.industry.trim()) set.add(c.industry.trim());
    });
    return [...list, ...Array.from(set).sort()];
  }, [companies]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2] dark:text-sky-400" />
        <span className="ml-3 text-[#56687A] dark:text-slate-400">Loading companies...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226] dark:text-slate-100">Unable to load companies</h3>
          <p className="text-[#56687A] dark:text-slate-400 mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Building2 className="w-12 h-12 text-[#788896] dark:text-slate-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226] dark:text-slate-100">No companies available</h3>
          <p className="text-[#56687A] dark:text-slate-400 mt-1">Check back later for new hiring partners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-brand-950 border border-brand-500 text-white text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/applications"
            className="text-xs font-bold text-brand-300 hover:text-white underline ml-4 flex-shrink-0"
          >
            View Applications →
          </Link>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Partner Engineering Companies"
        description="Explore top engineering cultures, tech stacks, open engineering roles, and connect with technical recruiters."
        badge={
          <Badge variant="brand" size="sm">
            {companies.length} Hiring Partners
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                All Marketplace Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. TOP STATS BAR (Given Metric Boxes with Interactive Checking)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Box 1: Total Companies */}
        <div
          onClick={() => setQuickFilter('all')}
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            quickFilter === 'all'
              ? 'bg-blue-50/60 dark:bg-slate-800/90 border-[#0A66C2] dark:border-sky-500 ring-2 ring-[#0A66C2]/20 dark:ring-sky-500/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40 dark:hover:border-slate-700'
          }`}
          title="Click to check All Companies (Reset filter)"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-semibold text-[#788896] dark:text-slate-400">Companies</span>
                {quickFilter === 'all' && (
                  <CheckCircle2 className="w-3 h-3 text-[#0A66C2] dark:text-sky-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#1D2226] dark:text-slate-100 font-mono">{companies.length}</p>
            </div>
            <Building2 className="w-4 h-4 text-[#788896] dark:text-slate-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
            <span>Tier-1 Tech</span>
            <span className="text-[9px] uppercase tracking-wider">{quickFilter === 'all' ? 'Active' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 2: Open Engineering Roles */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === 'openRoles' ? 'all' : 'openRoles'))}
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            quickFilter === 'openRoles'
              ? 'bg-blue-50/60 dark:bg-sky-950/30 border-[#0A66C2] dark:border-sky-400 ring-2 ring-[#0A66C2]/20 dark:ring-sky-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40 dark:hover:border-sky-700'
          }`}
          title="Click to check Companies with Open Engineering Roles"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-semibold text-[#0A66C2] dark:text-blue-400">Open Engineering Roles</span>
                {quickFilter === 'openRoles' && (
                  <CheckCircle2 className="w-3 h-3 text-[#0A66C2] dark:text-blue-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#0A66C2] dark:text-blue-400 font-mono">{totalJobs} Roles</p>
            </div>
            <Briefcase className="w-4 h-4 text-[#0A66C2] dark:text-blue-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#0A66C2] dark:text-blue-400 font-mono font-semibold">
            <span>Active Pipelines</span>
            <span className="text-[9px] uppercase tracking-wider">{quickFilter === 'openRoles' ? 'Checked ✓' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 3: Following */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === 'following' ? 'all' : 'following'))}
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            quickFilter === 'following'
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 dark:ring-amber-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700'
          }`}
          title="Click to check Companies You Follow"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-semibold text-[#8A6100] dark:text-amber-400">Following</span>
                {quickFilter === 'following' && (
                  <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#8A6100] dark:text-amber-400 font-mono">{followingCount}</p>
            </div>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#8A6100] dark:text-amber-400 font-mono font-semibold">
            <span>Instant Alerts</span>
            <span className="text-[9px] uppercase tracking-wider">{quickFilter === 'following' ? 'Checked ✓' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 4: Avg Profile Match */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === 'highMatch' ? 'all' : 'highMatch'))}
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            quickFilter === 'highMatch'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 dark:ring-emerald-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700'
          }`}
          title="Click to check Top Profile Match Companies (≥90%)"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-semibold text-emerald-700 dark:text-emerald-400">Avg Profile Match</span>
                {quickFilter === 'highMatch' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                {avgMatchPercent}%
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
            <span>
              {user?.atsScore
                ? `ATS Resume: ${user.atsScore}%`
                : user?.skills?.length
                ? `Matched: ${user.skills.length} skills`
                : 'Live ATS Matching'}
            </span>
            <span className="text-[9px] uppercase tracking-wider">{quickFilter === 'highMatch' ? `Checked (${highMatchCompaniesCount}) ✓` : 'Click to Check'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & INDUSTRY FILTER BAR                                           */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#788896] dark:text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, tech stack (Go, Kafka, React), or location..."
            className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-xl border border-[#D9D9D9] dark:border-slate-700 pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-sky-500 font-mono"
          />
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {industriesList.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer',
                selectedIndustry === ind
                  ? 'bg-[#0A66C2] text-white dark:bg-sky-600 shadow-sm'
                  : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter count & reset indicator */}
      {(quickFilter !== 'all' || selectedIndustry !== 'All' || searchQuery !== '') && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-[11px] text-[#56687A] dark:text-slate-400 font-mono">
            Showing <strong className="text-[#1D2226] dark:text-slate-100 font-bold">{filteredCompanies.length}</strong> of {companies.length} companies
          </span>
          <button
            onClick={() => {
              setQuickFilter('all');
              setSelectedIndustry('All');
              setSearchQuery('');
            }}
            className="text-[11px] text-[#0A66C2] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COMPANIES CARDS GRID                                                   */}
      {/* ========================================================================= */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] dark:border-slate-800 rounded-2xl bg-[#F3F6F8] dark:bg-slate-900/50 space-y-2">
          <p className="text-sm font-semibold text-[#1D2226] dark:text-slate-100">
            {quickFilter === 'following'
              ? 'You are not following any companies yet'
              : 'No companies found matching your criteria'}
          </p>
          <p className="text-xs text-[#56687A] dark:text-slate-400">
            {quickFilter === 'following'
              ? 'Click "Follow" on any company card to get instant hiring alerts and follow their latest updates.'
              : 'Try adjusting your search query or reset the industry filter.'}
          </p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('All');
              setQuickFilter('all');
            }}
          >
            {quickFilter === 'following' ? 'Browse All Companies' : 'Reset Filters'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map((comp) => (
            <CompanyCard
              key={comp.id}
              company={comp}
              onFollowToggle={handleFollowToggle}
              onSelectCompany={setSelectedCompany}
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMPANY DETAIL MODAL (About, Jobs, Posts, Employees)                   */}
      {/* ========================================================================= */}
      <CompanyDetailModal
        company={selectedCompany}
        isOpen={Boolean(selectedCompany)}
        onClose={() => setSelectedCompany(null)}
        onFollowToggle={handleFollowToggle}
        onApplyJob={handleApplyJob}
        onAnalyzeMatch={(job) => setMatchAnalysisJob(job)}
        appliedJobIds={appliedJobIds}
      />

      {/* ========================================================================= */}
      {/* 5. JOB MATCH MODAL (Analyze Match against Candidate Resume)               */}
      {/* ========================================================================= */}
      {matchAnalysisJob && (
        <JobMatchModal
          job={matchAnalysisJob}
          isOpen={Boolean(matchAnalysisJob)}
          onClose={() => setMatchAnalysisJob(null)}
          onApply={(job) => {
            handleApplyJob(job);
            setMatchAnalysisJob(null);
          }}
        />
      )}
    </div>
  );
};

export default CompaniesPage;
