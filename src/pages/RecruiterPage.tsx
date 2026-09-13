import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RecruiterCandidateCard } from '../components/recruiter/RecruiterCandidateCard';
import { CandidateDossierModal } from '../components/recruiter/CandidateDossierModal';
import { PostJobModal } from '../components/recruiter/PostJobModal';
import { RecruiterCandidate, JobItem, Application, ApplicationStatus } from '../types';
import { recruiterApi, RecruiterMetrics } from '../api/recruiterApi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Star,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  FileText,
  Download,
  Trash2,
  MapPin,
  DollarSign,
  Clock,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Eye,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const RecruiterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, toggleRole } = useAuth();

  // Top-level tabs: 'jobs' | 'pipeline' | 'discovery'
  const [mainTab, setMainTab] = useState<'jobs' | 'pipeline' | 'discovery'>('jobs');

  // Recruiter posted jobs & applications
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobIdFilter, setSelectedJobIdFilter] = useState<string>('all');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<string>('all');
  const [pipelineSearch, setPipelineSearch] = useState<string>('');

  // Candidates discovery pool
  const [candidates, setCandidates] = useState<RecruiterCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidate | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<RecruiterMetrics>({
    jobsPosted: 0,
    applicationsCount: 0,
    shortlistedCount: 0,
    interviewsCount: 0,
    hiredCount: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Discovery Filters
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [assessmentFilter, setAssessmentFilter] = useState('All');
  const [jobMatchFilter, setJobMatchFilter] = useState('All');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all recruiter data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [jobsData, appsData, metricsData, candsData] = await Promise.all([
        recruiterApi.getRecruiterJobs().catch(() => []),
        recruiterApi.getAllApplications().catch(() => []),
        recruiterApi.getRecruiterMetrics().catch(() => null),
        recruiterApi.searchCandidates().catch(() => []),
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      setCandidates(candsData);

      if (metricsData) {
        setMetrics(metricsData);
      } else {
        // Compute dynamically if metrics endpoint returns null
        setMetrics({
          jobsPosted: jobsData.length,
          applicationsCount: appsData.length,
          shortlistedCount: appsData.filter((a) => a.status === 'Shortlisted').length,
          interviewsCount: appsData.filter((a) => a.status === 'Interview').length,
          hiredCount: appsData.filter((a) => a.status === 'Hired').length,
        });
      }
    } catch (err) {
      console.error('Recruiter portal load error:', err);
      setError('Unable to load recruiter portal data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle new job created
  const handleJobCreated = (newJob: JobItem) => {
    setJobs((prev) => [newJob, ...prev]);
    setMetrics((prev) => ({ ...prev, jobsPosted: prev.jobsPosted + 1 }));
    showToast(`Job listing "${newJob.title}" published successfully!`);
    setMainTab('jobs');
  };

  // Toggle Job Status (published <-> closed)
  const handleToggleJobStatus = async (job: JobItem) => {
    const nextStatus = job.status === 'published' ? 'closed' : 'published';
    try {
      const updated = await recruiterApi.updateJob(job.id, { status: nextStatus });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: updated.status } : j)));
      showToast(`Job "${job.title}" is now ${nextStatus}.`);
    } catch (err) {
      console.error('Failed to toggle job status:', err);
      alert('Failed to update job status. Please try again.');
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the job "${jobTitle}"? This will also remove it from the public marketplace.`)) {
      return;
    }
    try {
      await recruiterApi.deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setMetrics((prev) => ({ ...prev, jobsPosted: Math.max(0, prev.jobsPosted - 1) }));
      showToast(`Job "${jobTitle}" deleted.`);
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('Failed to delete job. Please try again.');
    }
  };

  // Update Applicant Status
  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      setUpdatingAppId(appId);
      const updated = await recruiterApi.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: updated.status as ApplicationStatus } : a))
      );
      showToast(`Candidate status updated to "${newStatus}".`);

      // Refresh metrics in background
      recruiterApi.getRecruiterMetrics().then(setMetrics).catch(() => {});
    } catch (err) {
      console.error('Failed to update application status:', err);
      alert('Failed to update candidate status.');
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Toggle Candidate Shortlist in Discovery
  const handleShortlistToggle = async (candidateId: string) => {
    try {
      const result = await recruiterApi.toggleShortlistCandidate(candidateId);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, isShortlisted: result.isShortlisted } : c
        )
      );
    } catch (err) {
      console.error('Failed to toggle shortlist:', err);
      alert('Failed to update shortlist.');
    }
  };

  // Direct Message Trigger
  const handleMessage = (candidate: RecruiterCandidate) => {
    navigate(`/messages?user=${candidate.id}`, {
      state: { targetUserId: candidate.id },
    });
  };

  // Filtered Applications for Pipeline
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (selectedJobIdFilter !== 'all') {
        if (app.jobId !== selectedJobIdFilter && app.id !== selectedJobIdFilter) return false;
      }
      if (pipelineStatusFilter !== 'all' && app.status !== pipelineStatusFilter) {
        return false;
      }
      if (pipelineSearch.trim()) {
        const q = pipelineSearch.toLowerCase().trim();
        const matchesName = (app.applicantName || '').toLowerCase().includes(q);
        const matchesEmail = (app.applicantEmail || '').toLowerCase().includes(q);
        const matchesRole = (app.role || app.roleTitle || '').toLowerCase().includes(q);
        const matchesCompany = (app.company || app.companyName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole && !matchesCompany) return false;
      }
      return true;
    });
  }, [applications, selectedJobIdFilter, pipelineStatusFilter, pipelineSearch]);

  // Filtered Candidates for Discovery
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const q = discoverySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)) ||
        c.location.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === 'All' || c.role.toLowerCase().includes(roleFilter.toLowerCase());
      const matchesSkill =
        skillFilter === 'All' || c.skills.some((s) => s.toLowerCase() === skillFilter.toLowerCase());
      const matchesExperience =
        experienceFilter === 'All' || c.experienceLevel.toLowerCase().includes(experienceFilter.toLowerCase());
      const matchesLocation =
        locationFilter === 'All' || c.location.toLowerCase().includes(locationFilter.toLowerCase());

      let matchesAssessment = true;
      if (assessmentFilter === '95%+') matchesAssessment = c.assessmentScore >= 95;
      else if (assessmentFilter === '90%+') matchesAssessment = c.assessmentScore >= 90;
      else if (assessmentFilter === '85%+') matchesAssessment = c.assessmentScore >= 85;

      let matchesJobMatch = true;
      if (jobMatchFilter === '95%+') matchesJobMatch = c.jobMatch >= 95;
      else if (jobMatchFilter === '90%+') matchesJobMatch = c.jobMatch >= 90;
      else if (jobMatchFilter === '85%+') matchesJobMatch = c.jobMatch >= 85;

      return (
        matchesSearch &&
        matchesRole &&
        matchesSkill &&
        matchesExperience &&
        matchesLocation &&
        matchesAssessment &&
        matchesJobMatch
      );
    });
  }, [
    candidates,
    discoverySearch,
    roleFilter,
    skillFilter,
    experienceFilter,
    locationFilter,
    assessmentFilter,
    jobMatchFilter,
  ]);

  const rolesList = ['All', 'Backend', 'Distributed Systems', 'Full Stack', 'Cloud', 'Database'];
  const skillsList = ['All', 'Go', 'Kafka', 'PostgreSQL', 'Redis Lua', 'React', 'TypeScript', 'Kubernetes', 'C++'];
  const experienceList = ['All', 'Entry / Intern', 'Junior', 'Mid Level', 'Senior', 'Lead'];
  const locationsList = ['All', 'Remote', 'Seattle', 'San Francisco', 'New York'];
  const thresholdList = ['All', '95%+', '90%+', '85%+'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading recruiter workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load recruiter workspace</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button size="sm" variant="primary" onClick={fetchData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1D2226] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Role Notice if not recruiter */}
      {role !== 'recruiter' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              You are currently viewing as <strong>{role}</strong>. Switch to recruiter role to post jobs and review applicant resumes.
            </span>
          </div>
          <Button size="xs" variant="outline" onClick={toggleRole}>
            Switch to Recruiter Role
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Technical Recruiter & Talent Portal"
        description="Publish active engineering listings, track candidate pipelines through interviews and offers, and discover pre-vetted engineers."
        badge={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            {user?.name ? `${user.name} Workspace` : 'Recruiter Portal'}
          </Badge>
        }
        actions={
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsPostJobModalOpen(true)}
          >
            Post New Job
          </Button>
        }
      />

      {/* 5 Real Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Metric 1: Jobs Posted */}
        <div
          onClick={() => setMainTab('jobs')}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            mainTab === 'jobs'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-[#0A66C2]" /> Posted Jobs
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">{jobs.length}</p>
          <span className="text-[10px] text-[#0A66C2] font-mono font-semibold">
            {jobs.length === 0 ? 'No jobs posted' : `${jobs.filter((j) => j.status === 'published').length} Active`}
          </span>
        </div>

        {/* Metric 2: Applications */}
        <div
          onClick={() => {
            setMainTab('pipeline');
            setPipelineStatusFilter('all');
          }}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            mainTab === 'pipeline' && pipelineStatusFilter === 'all'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] flex items-center gap-1">
            <Users className="w-3 h-3 text-sky-600" /> Applicants
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">{applications.length}</p>
          <span className="text-[10px] text-sky-600 font-mono font-semibold">
            {applications.length === 0 ? '0 received' : `${applications.length} Received`}
          </span>
        </div>

        {/* Metric 3: Shortlisted */}
        <div
          onClick={() => {
            setMainTab('pipeline');
            setPipelineStatusFilter('Shortlisted');
          }}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            mainTab === 'pipeline' && pipelineStatusFilter === 'Shortlisted'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" /> Shortlisted
          </span>
          <p className="text-xl font-bold text-[#8A6100] font-mono">
            {applications.filter((a) => a.status === 'Shortlisted').length || metrics.shortlistedCount}
          </p>
          <span className="text-[10px] text-[#8A6100] font-mono font-semibold">Priority Pool</span>
        </div>

        {/* Metric 4: Interviews */}
        <div
          onClick={() => {
            setMainTab('pipeline');
            setPipelineStatusFilter('Interview');
          }}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            mainTab === 'pipeline' && pipelineStatusFilter === 'Interview'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-600" /> Interviews
          </span>
          <p className="text-xl font-bold text-emerald-600 font-mono">
            {applications.filter((a) => a.status === 'Interview').length || metrics.interviewsCount}
          </p>
          <span className="text-[10px] text-emerald-600 font-mono font-semibold">In Progress</span>
        </div>

        {/* Metric 5: Hired */}
        <div
          onClick={() => {
            setMainTab('pipeline');
            setPipelineStatusFilter('Hired');
          }}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 col-span-2 sm:col-span-1 cursor-pointer transition shadow-xs',
            mainTab === 'pipeline' && pipelineStatusFilter === 'Hired'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hired
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">
            {applications.filter((a) => a.status === 'Hired').length || metrics.hiredCount}
          </p>
          <span className="text-[10px] text-[#788896] font-mono">Offers Accepted</span>
        </div>
      </div>

      {/* Main Tab Navigation Header */}
      <div className="flex items-center gap-2 border-b border-[#D9D9D9] pb-2 overflow-x-auto">
        <button
          onClick={() => setMainTab('jobs')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2',
            mainTab === 'jobs'
              ? 'bg-[#0A66C2] text-white shadow-sm'
              : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
          )}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>My Posted Jobs</span>
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              mainTab === 'jobs' ? 'bg-[#004182] text-white' : 'bg-[#E8F3FF] text-[#0A66C2]'
            )}
          >
            {jobs.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('pipeline')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2',
            mainTab === 'pipeline'
              ? 'bg-[#0A66C2] text-white shadow-sm'
              : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Applicant Pipeline</span>
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              mainTab === 'pipeline' ? 'bg-[#004182] text-white' : 'bg-[#E8F3FF] text-[#0A66C2]'
            )}
          >
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('discovery')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2',
            mainTab === 'discovery'
              ? 'bg-[#0A66C2] text-white shadow-sm'
              : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Talent Discovery Pool</span>
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
              mainTab === 'discovery' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
            )}
          >
            {candidates.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POSTED JOBS MANAGEMENT                                            */}
      {/* ========================================================================= */}
      {mainTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1D2226] flex items-center gap-2">
              <span>Active Job Listings</span>
              <span className="text-xs font-normal text-[#56687A]">({jobs.length} total)</span>
            </h3>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsPostJobModalOpen(true)}
            >
              Post Another Job
            </Button>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-3">
              <Briefcase className="w-10 h-10 text-[#788896] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#1D2226]">No jobs posted yet</p>
                <p className="text-xs text-[#56687A] max-w-sm mx-auto">
                  Publish your company's open engineering roles to begin receiving real verified candidate applications.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsPostJobModalOpen(true)}
              >
                Post Your First Job Listing
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {jobs.map((job) => {
                const jobAppCount =
                  applications.filter((a) => a.jobId === job.id || a.id === job.id).length ||
                  job.applicantsCount ||
                  0;
                const isPublished = job.status !== 'closed' && job.status !== 'draft';

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-white border border-[#D9D9D9] hover:border-[#0A66C2]/40 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-[#1D2226]">{job.title}</h4>
                        <span
                          className={cn(
                            'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full',
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          )}
                        >
                          {job.status || 'published'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8F3FF] text-[#0A66C2] font-semibold">
                          {jobAppCount} {jobAppCount === 1 ? 'Applicant' : 'Applicants'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#56687A] flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-[#1D2226]">
                          <Building2 className="w-3.5 h-3.5 text-[#788896]" />
                          {job.company || job.companyName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#788896]" />
                          {job.location} ({job.workType || 'Remote'})
                        </span>
                        {job.salaryRange && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-[#788896]" />
                            {job.salaryRange}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-[#788896]">
                          {job.experienceLevel || 'Mid'} • {job.jobType || 'Full-time'}
                        </span>
                      </div>

                      {/* Skills Tags */}
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {job.skills.slice(0, 5).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono bg-[#F3F6F8] text-[#56687A] px-2 py-0.5 rounded-md"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Users className="w-3 h-3" />}
                        onClick={() => {
                          setSelectedJobIdFilter(job.id);
                          setMainTab('pipeline');
                        }}
                      >
                        View Applicants ({jobAppCount})
                      </Button>

                      <Button
                        size="xs"
                        variant={isPublished ? 'ghost' : 'outline'}
                        onClick={() => handleToggleJobStatus(job)}
                        className={isPublished ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                      >
                        {isPublished ? 'Close Listing' : 'Reopen Listing'}
                      </Button>

                      <button
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APPLICANT PIPELINE                                                 */}
      {/* ========================================================================= */}
      {mainTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                  placeholder="Search candidate name, email, or role..."
                  className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                />
              </div>

              {/* Job Filter Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#56687A] whitespace-nowrap">Filter Job:</span>
                <select
                  value={selectedJobIdFilter}
                  onChange={(e) => setSelectedJobIdFilter(e.target.value)}
                  className="bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] max-w-xs truncate"
                >
                  <option value="all">All Jobs ({applications.length})</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({applications.filter((a) => a.jobId === j.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              {[
                { id: 'all', label: 'All Stages' },
                { id: 'Applied', label: 'Applied' },
                { id: 'Screening', label: 'Screening' },
                { id: 'Shortlisted', label: 'Shortlisted' },
                { id: 'Interview', label: 'Interview' },
                { id: 'Offer', label: 'Offer' },
                { id: 'Hired', label: 'Hired' },
                { id: 'Rejected', label: 'Rejected' },
              ].map((stage) => {
                const count =
                  stage.id === 'all'
                    ? applications.length
                    : applications.filter((a) => a.status === stage.id).length;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setPipelineStatusFilter(stage.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1',
                      pipelineStatusFilter === stage.id
                        ? 'bg-[#0A66C2] text-white shadow-xs'
                        : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
                    )}
                  >
                    <span>{stage.label}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                        pipelineStatusFilter === stage.id
                          ? 'bg-[#004182] text-white'
                          : 'bg-[#F3F6F8] text-[#56687A]'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <Users className="w-10 h-10 text-[#788896] mx-auto" />
              <p className="text-sm font-semibold text-[#1D2226]">No applications in this view</p>
              <p className="text-xs text-[#56687A]">
                Applications will appear here as engineers apply to your posted jobs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredApplications.map((app) => {
                const isUpdating = updatingAppId === app.id;
                const resumeDownloadUrl = recruiterApi.getResumeDownloadUrl(app.id);

                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-white border border-[#D9D9D9] hover:border-[#0A66C2]/40 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-[#1D2226]">
                          {app.applicantName || 'Candidate Application'}
                        </h4>
                        {app.applicantEmail && (
                          <span className="text-xs text-[#56687A] font-mono">
                            ({app.applicantEmail})
                          </span>
                        )}
                        {app.matchScore && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {app.matchScore}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#56687A] flex-wrap">
                        <span className="font-medium text-[#1D2226]">
                          Target Role: {app.role || app.roleTitle}
                        </span>
                        <span>•</span>
                        <span>{app.company || app.companyName}</span>
                        <span>•</span>
                        <span>Applied: {app.appliedDate}</span>
                        {app.resume && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-[#0A66C2] flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {app.resume}
                            </span>
                          </>
                        )}
                      </div>

                      {app.notes && (
                        <p className="text-xs text-[#56687A] bg-[#F3F6F8] p-2 rounded-lg max-w-2xl">
                          {app.notes}
                        </p>
                      )}
                    </div>

                    {/* Pipeline Stage Selector & Actions */}
                    <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-[#788896] uppercase font-mono">Pipeline Stage:</span>
                        <select
                          value={app.status}
                          disabled={isUpdating}
                          onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                          className={cn(
                            'text-xs font-semibold rounded-xl border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] cursor-pointer',
                            app.status === 'Hired'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : app.status === 'Interview'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : app.status === 'Shortlisted'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : app.status === 'Screening'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : app.status === 'Offer'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : app.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-white text-[#1D2226] border-[#D9D9D9]'
                          )}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Screening">Screening</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Hired">Hired</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      {/* Download Resume Link */}
                      <a
                        href={resumeDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D9D9D9] text-xs font-medium text-[#1D2226] hover:bg-[#F3F6F8] hover:border-[#0A66C2] transition"
                        title="Download Candidate Resume"
                      >
                        <Download className="w-3.5 h-3.5 text-[#0A66C2]" />
                        <span>Resume</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TALENT DISCOVERY POOL                                              */}
      {/* ========================================================================= */}
      {mainTab === 'discovery' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
            {/* Top Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={discoverySearch}
                onChange={(e) => setDiscoverySearch(e.target.value)}
                placeholder="Search candidate name, headline, location, or technical competencies..."
                className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
            </div>

            {/* 6 Multi-Parameter Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">1. Target Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {rolesList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">2. Core Skill</label>
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {skillsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">3. Experience</label>
                <select
                  value={experienceFilter}
                  onChange={(e) => setExperienceFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {experienceList.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">4. Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {locationsList.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">5. Assessment Score</label>
                <select
                  value={assessmentFilter}
                  onChange={(e) => setAssessmentFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {thresholdList.map((t) => (
                    <option key={t} value={t}>
                      {t === 'All' ? 'All Scores' : t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-[#788896] block">6. Job Match</label>
                <select
                  value={jobMatchFilter}
                  onChange={(e) => setJobMatchFilter(e.target.value)}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  {thresholdList.map((t) => (
                    <option key={t} value={t}>
                      {t === 'All' ? 'All Matches' : t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No candidates match criteria</p>
              <p className="text-xs text-[#56687A]">
                Try adjusting the filters to expand the discovery pool.
              </p>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setDiscoverySearch('');
                  setRoleFilter('All');
                  setSkillFilter('All');
                  setExperienceFilter('All');
                  setLocationFilter('All');
                  setAssessmentFilter('All');
                  setJobMatchFilter('All');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => (
                <RecruiterCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onViewProfile={setSelectedCandidate}
                  onMessage={handleMessage}
                  onShortlistToggle={handleShortlistToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Dossier Modal */}
      <CandidateDossierModal
        candidate={selectedCandidate}
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        onShortlistToggle={handleShortlistToggle}
        onMessage={handleMessage}
      />

      {/* Post Job Modal */}
      <PostJobModal
        isOpen={isPostJobModalOpen}
        onClose={() => setIsPostJobModalOpen(false)}
        onJobCreated={handleJobCreated}
        defaultCompany={user?.company || ''}
      />
    </div>
  );
};

export default RecruiterPage;
