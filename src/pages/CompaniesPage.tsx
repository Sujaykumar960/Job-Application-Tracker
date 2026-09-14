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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track applied jobs (would need to be fetched from backend)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Follow Toggle
  const handleFollowToggle = async (companyId: string) => {
    try {
      const result = await companyApi.toggleFollowCompany(companyId);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? { ...c, isFollowing: result.isFollowing, followersCount: result.followersCount }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to toggle follow:', err);
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
    return companies.filter((c) => {
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

      return matchesSearch && matchesIndustry;
    });
  }, [companies, searchQuery, selectedIndustry]);

  const totalJobs = useMemo(
    () => companies.reduce((acc, c) => acc + (c.jobs?.length || c.openJobsCount || 0), 0),
    [companies]
  );

  const followingCount = useMemo(
    () => companies.filter((c) => c.isFollowing).length,
    [companies]
  );

  const industriesList = ['All', 'Fintech', 'Developer Tools', 'Cloud Platform', 'Monitoring'];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading companies...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load companies</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
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
        <Building2 className="w-12 h-12 text-[#788896]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">No companies available</h3>
          <p className="text-[#56687A] mt-1">Check back later for new hiring partners.</p>
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
      {/* 1. TOP STATS BAR                                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Companies</span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">{companies.length}</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Tier-1 Tech</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Open Engineering Roles</span>
          <p className="text-xl font-bold text-[#0A66C2] font-mono">{totalJobs} Roles</p>
          <span className="text-[10px] text-[#0A66C2] font-mono font-semibold">Active Pipelines</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Following</span>
          <p className="text-xl font-bold text-[#8A6100] font-mono">{followingCount}</p>
          <span className="text-[10px] text-[#8A6100] font-mono font-semibold">Instant Alerts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Avg Profile Match</span>
          <p className="text-xl font-bold text-emerald-700 font-mono">91%</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Based on ATS Resume</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & INDUSTRY FILTER BAR                                           */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, tech stack (Go, Kafka, React), or location..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
          />
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {industriesList.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                selectedIndustry === ind
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPANIES CARDS GRID                                                   */}
      {/* ========================================================================= */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-surface-800 rounded-2xl bg-surface-900/40 space-y-2">
          <p className="text-sm font-semibold text-slate-300">No companies found matching your criteria</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search query or reset the industry filter.
          </p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('All');
            }}
          >
            Reset Filters
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
