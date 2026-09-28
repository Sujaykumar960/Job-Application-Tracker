import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { JobCard } from '../components/jobs/JobCard';
import { JobDetailsPanel } from '../components/jobs/JobDetailsPanel';
import { JobMatchModal } from '../components/jobs/JobMatchModal';
import { JobFilters } from '../components/jobs/JobFilters';
import { JobItem, JobFilterState, Application } from '../types';
import { jobApi } from '../api/jobApi';
import { applicationApi } from '../api/applicationApi';
import { resumeApi } from '../api/resumeApi';
import {
  Building2,
  Sparkles,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Search,
  UserCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [matchAnalysisJob, setMatchAnalysisJob] = useState<JobItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Set of job IDs already applied to
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Fetch jobs from backend
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await jobApi.getJobs();
        setJobs(data);
      } catch (err) {
        setError('Failed to load jobs. Please try again.');
        console.error('Jobs fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Fetch applications to track applied jobs
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apps = await applicationApi.getApplications();
        const jobIds = new Set<string>();
        apps.forEach((a) => {
          if (a.jobId) {
            jobIds.add(a.jobId);
          }
          const comp = (a.company || a.companyName || '').trim().toLowerCase();
          const role = (a.role || a.roleTitle || '').trim().toLowerCase();
          if (comp && role) {
            jobIds.add(`${comp}:::${role}`);
          }
        });
        setAppliedJobIds(jobIds);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      }
    };

    fetchApplications();
  }, []);

  // Helper to check if a job has already been applied to
  const isJobApplied = (job: JobItem): boolean => {
    if (appliedJobIds.has(job.id)) return true;
    const comp = (job.company || job.companyName || '').trim().toLowerCase();
    const role = (job.title || '').trim().toLowerCase();
    return appliedJobIds.has(`${comp}:::${role}`);
  };

  // Filter State
  const [filters, setFilters] = useState<JobFilterState>({
    search: '',
    role: 'All',
    location: 'All',
    experience: 'All',
    skill: 'All',
    jobType: 'All',
    workType: 'All',
    sortBy: 'match',
    matchLevel: 'all',
  });

  // Derived filter options from dataset
  const availableRoles = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.roleCategory))).filter(Boolean);
  }, [jobs]);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.location))).filter(Boolean);
  }, [jobs]);

  const availableSkills = useMemo(() => {
    const all = jobs.flatMap((j) => j.skills.map((s) => s.name));
    return Array.from(new Set(all)).sort();
  }, [jobs]);

  // Metric counts for the given boxes
  const highMatchCount = useMemo(() => jobs.filter((j) => j.matchScore >= 90).length, [jobs]);
  const remoteCount = useMemo(() => jobs.filter((j) => j.workType === 'Remote').length, [jobs]);
  const internshipsCount = useMemo(() => jobs.filter((j) => j.jobType === 'Internship').length, [jobs]);
  const highMatchInternshipsCount = useMemo(
    () => jobs.filter((j) => j.jobType === 'Internship' && j.matchScore >= 90).length,
    [jobs]
  );
  const restInternshipsCount = useMemo(
    () => jobs.filter((j) => j.jobType === 'Internship' && j.matchScore < 90).length,
    [jobs]
  );

  // Filtering & Sorting
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Search
        const q = filters.search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          job.skills.some((s) => s.name.toLowerCase().includes(q)) ||
          job.description.toLowerCase().includes(q);

        // Role
        const matchesRole = filters.role === 'All' || job.roleCategory === filters.role;

        // Location
        const matchesLocation = filters.location === 'All' || job.location === filters.location;

        // Experience
        const matchesExperience =
          filters.experience === 'All' || job.experienceLevel === filters.experience;

        // Skill
        const matchesSkill =
          filters.skill === 'All' || job.skills.some((s) => s.name === filters.skill);

        // Job Type
        const matchesJobType = filters.jobType === 'All' || job.jobType === filters.jobType;

        // Work Type
        const matchesWorkType = filters.workType === 'All' || job.workType === filters.workType;

        // Match Level Quick Filter (controlled from the given metric boxes)
        let matchesLevel = true;
        if (filters.matchLevel === 'highMatch') {
          matchesLevel = job.matchScore >= 90;
        } else if (filters.matchLevel === 'remote') {
          matchesLevel = job.workType === 'Remote';
        } else if (filters.matchLevel === 'internships') {
          matchesLevel = job.jobType === 'Internship';
        } else if (filters.matchLevel === 'highMatchInternships') {
          matchesLevel = job.jobType === 'Internship' && job.matchScore >= 90;
        } else if (filters.matchLevel === 'restInternships') {
          matchesLevel = job.jobType === 'Internship' && job.matchScore < 90;
        }

        return (
          matchesSearch &&
          matchesRole &&
          matchesLocation &&
          matchesExperience &&
          matchesSkill &&
          matchesJobType &&
          matchesWorkType &&
          matchesLevel
        );
      })
      .sort((a, b) => {
        if (filters.sortBy === 'match') {
          return b.matchScore - a.matchScore;
        }
        if (filters.sortBy === 'newest') {
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        }
        if (filters.sortBy === 'salary') {
          return b.salaryRange.localeCompare(a.salaryRange);
        }
        return 0;
      });
  }, [jobs, filters]);

  // Handle Application Preparation Record
  const handleApply = async (job: JobItem) => {
    if (isJobApplied(job)) {
      setToastMessage(`You have already applied for ${job.title} at ${job.company}. Track it in your Application Tracker!`);
      return;
    }

    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 14);

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

      const newApp: Application = {
        id: `app-from-job-${Date.now()}`,
        jobId: job.id,
        companyId: job.companyId,
        company: job.company,
        role: job.title,
        companyName: job.company,
        roleTitle: job.title,
        location: job.location,
        jobUrl: job.jobUrl,
        appliedDate: new Date().toISOString().slice(0, 10),
        deadline: deadlineDate.toISOString().slice(0, 10),
        deadlineDate: deadlineDate.toISOString().slice(0, 10),
        status: 'Applied',
        priority: job.matchScore >= 90 ? 'High' : 'Medium',
        notes: `Prepared via CareerX Marketplace. Matches ${job.matchScore}% of competencies. Attached candidate resume.`,
        resume: resumeName || undefined,
        resumeId: resumeId || undefined,
        matchScore: job.matchScore,
        salaryRange: job.salaryRange,
        tags: job.skills.map((s) => s.name),
      };

      await applicationApi.createApplication(newApp);
      setAppliedJobIds((prev) => {
        const next = new Set(prev);
        next.add(job.id);
        const comp = (job.company || job.companyName || '').trim().toLowerCase();
        const role = (job.title || '').trim().toLowerCase();
        if (comp && role) {
          next.add(`${comp}:::${role}`);
        }
        return next;
      });
      setToastMessage(`Application submitted for ${job.title} at ${job.company}! Added to your Application Tracker.`);

      // Auto-dismiss toast after 4 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to apply:', err);
      const msg = err.response?.data?.detail || 'Failed to submit application. Please try again.';
      alert(msg);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'All',
      location: 'All',
      experience: 'All',
      skill: 'All',
      jobType: 'All',
      workType: 'All',
      sortBy: 'match',
      matchLevel: 'all',
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Curated Engineering Opportunities"
        description="Discover software engineering roles and internships matching your verified technical profile."
        badge={
          <Badge variant="brand" size="sm">
            {jobs.length} Verified Roles
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/recruiter">
              <Button size="sm" variant="outline" icon={<UserCheck className="w-3.5 h-3.5 text-brand-400" />}>
                Recruiter Discovery
              </Button>
            </Link>
            <Link to="/applications">
              <Button size="sm" variant="primary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Application Tracker
              </Button>
            </Link>
          </div>
        }
      />

      {/* Preparation Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link to="/applications" className="font-semibold text-white underline text-xs flex items-center gap-1 flex-shrink-0">
            View Tracker <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Quick Marketplace Metrics (Given Boxes with Checkable Features) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Box 1: Total Positions */}
        <div
          onClick={() => setFilters((prev) => ({ ...prev, matchLevel: 'all' }))}
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            filters.matchLevel === 'all'
              ? 'bg-blue-50/60 dark:bg-slate-800/90 border-[#0A66C2] dark:border-sky-500 ring-2 ring-[#0A66C2]/20 dark:ring-sky-500/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40 dark:hover:border-slate-700'
          }`}
          title="Click to check All Roles (Reset quick filter)"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#788896] dark:text-slate-400 font-semibold">Total Positions</span>
                {filters.matchLevel === 'all' && (
                  <CheckCircle2 className="w-3 h-3 text-[#0A66C2] dark:text-sky-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#1D2226] dark:text-slate-100 font-mono">{jobs.length}</p>
            </div>
            <Building2 className="w-4 h-4 text-[#788896] dark:text-slate-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#56687A] dark:text-slate-400">
            <span>All Verified Roles</span>
            <span className="font-mono text-[9px] uppercase tracking-wider">{filters.matchLevel === 'all' ? 'Active' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 2: High Match (>90%) */}
        <div
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              matchLevel: prev.matchLevel === 'highMatch' ? 'all' : 'highMatch',
            }))
          }
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            filters.matchLevel === 'highMatch'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 dark:ring-emerald-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700'
          }`}
          title="Click to check High Match Roles (≥90%)"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">High Match (&gt;90%)</span>
                {filters.matchLevel === 'highMatch' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                {highMatchCount} Roles
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400">
            <span>Top Compatibility</span>
            <span className="font-mono text-[9px] uppercase tracking-wider">{filters.matchLevel === 'highMatch' ? 'Checked ✓' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 3: Remote Available */}
        <div
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              matchLevel: prev.matchLevel === 'remote' ? 'all' : 'remote',
            }))
          }
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            filters.matchLevel === 'remote'
              ? 'bg-blue-50/60 dark:bg-sky-950/30 border-[#0A66C2] dark:border-sky-400 ring-2 ring-[#0A66C2]/20 dark:ring-sky-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40 dark:hover:border-sky-700'
          }`}
          title="Click to check Remote Roles"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#0A66C2] dark:text-blue-400 font-semibold">Remote Available</span>
                {filters.matchLevel === 'remote' && (
                  <CheckCircle2 className="w-3 h-3 text-[#0A66C2] dark:text-blue-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#0A66C2] dark:text-blue-400 font-mono">
                {remoteCount}
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#0A66C2] dark:text-blue-400" />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#0A66C2] dark:text-blue-400">
            <span>Work From Anywhere</span>
            <span className="font-mono text-[9px] uppercase tracking-wider">{filters.matchLevel === 'remote' ? 'Checked ✓' : 'Click to Check'}</span>
          </div>
        </div>

        {/* Box 4: Internships (with features on the given box to check High Match & Rest) */}
        <div
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              matchLevel: prev.matchLevel === 'internships' ? 'all' : 'internships',
            }))
          }
          className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs cursor-pointer transition-all duration-200 select-none ${
            filters.matchLevel === 'internships' ||
            filters.matchLevel === 'highMatchInternships' ||
            filters.matchLevel === 'restInternships'
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 dark:ring-amber-400/20'
              : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700'
          }`}
          title="Click to check All Internships"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#8A6100] dark:text-amber-400 font-semibold">Internships</span>
                {(filters.matchLevel === 'internships' ||
                  filters.matchLevel === 'highMatchInternships' ||
                  filters.matchLevel === 'restInternships') && (
                  <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <p className="text-xl font-bold text-[#8A6100] dark:text-amber-400 font-mono">
                {internshipsCount}
              </p>
            </div>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>

          {/* Quick checks directly on the given box: High Match & Rest */}
          <div className="mt-1.5 pt-1.5 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilters((prev) => ({
                  ...prev,
                  matchLevel: prev.matchLevel === 'highMatchInternships' ? 'all' : 'highMatchInternships',
                }));
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer ${
                filters.matchLevel === 'highMatchInternships'
                  ? 'bg-amber-600 text-white dark:bg-amber-500 shadow-xs ring-1 ring-amber-600 dark:ring-amber-400'
                  : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
              title="Click to check High Match Internships (≥90%)"
            >
              <span>★ High Match</span>
              <span className="font-bold">({highMatchInternshipsCount})</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilters((prev) => ({
                  ...prev,
                  matchLevel: prev.matchLevel === 'restInternships' ? 'all' : 'restInternships',
                }));
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer ${
                filters.matchLevel === 'restInternships'
                  ? 'bg-amber-600 text-white dark:bg-amber-500 shadow-xs ring-1 ring-amber-600 dark:ring-amber-400'
                  : 'bg-[#F3F6F8] text-[#56687A] hover:bg-[#E8E8E8] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
              title="Click to check Rest of Internships (<90%)"
            >
              <span>Rest</span>
              <span className="font-bold">({restInternshipsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <JobFilters
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        availableRoles={availableRoles}
        availableLocations={availableLocations}
        availableSkills={availableSkills}
        totalResults={filteredJobs.length}
      />

      {/* Job Cards Grid (Laptop optimized 1366px+) */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] dark:border-slate-800 rounded-2xl bg-[#F3F6F8] dark:bg-slate-900/50 space-y-2">
          <p className="text-sm font-semibold text-[#1D2226] dark:text-slate-100">No jobs match your filter criteria</p>
          <p className="text-xs text-[#56687A] dark:text-slate-400">Try adjusting your skill, location, or workplace filters</p>
          <Button size="xs" variant="outline" onClick={resetFilters}>
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isApplied={isJobApplied(job)}
              onView={(j) => setSelectedJob(j)}
              onApply={handleApply}
              onAnalyzeMatch={(j) => setMatchAnalysisJob(j)}
            />
          ))}
        </div>
      )}

      {/* Job Details Slide-over Panel */}
      <JobDetailsPanel
        job={selectedJob}
        isOpen={Boolean(selectedJob)}
        isApplied={selectedJob ? isJobApplied(selectedJob) : false}
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
        onAnalyzeMatch={(j) => {
          setSelectedJob(null);
          setMatchAnalysisJob(j);
        }}
      />

      {/* In-Depth Match Analysis Modal */}
      <JobMatchModal
        job={matchAnalysisJob}
        isOpen={Boolean(matchAnalysisJob)}
        isApplied={matchAnalysisJob ? isJobApplied(matchAnalysisJob) : false}
        onClose={() => setMatchAnalysisJob(null)}
        onApply={handleApply}
      />
    </div>
  );
};

export default JobsPage;
