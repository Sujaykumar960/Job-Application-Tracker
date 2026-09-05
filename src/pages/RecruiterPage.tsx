import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RecruiterCandidateCard } from '../components/recruiter/RecruiterCandidateCard';
import { CandidateDossierModal } from '../components/recruiter/CandidateDossierModal';
import {
  INITIAL_RECRUITER_CANDIDATES,
  RecruiterCandidate,
} from '../data/mockRecruiterData';
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
} from 'lucide-react';
import { cn } from '../utils/cn';

const RECRUITER_STORAGE_KEY = 'careerx_recruiter_candidates_v2';

export const RecruiterPage: React.FC = () => {
  const navigate = useNavigate();

  // Load and persist candidate shortlist state
  const [candidates, setCandidates] = useState<RecruiterCandidate[]>(() => {
    const saved = localStorage.getItem(RECRUITER_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_RECRUITER_CANDIDATES;
      }
    }
    return INITIAL_RECRUITER_CANDIDATES;
  });

  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidate | null>(null);
  const [activeTab, setActiveTab] = useState<'pool' | 'shortlisted' | 'interviews'>('pool');

  // Search & 6 Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [assessmentFilter, setAssessmentFilter] = useState('All');
  const [jobMatchFilter, setJobMatchFilter] = useState('All');

  const syncCandidates = (updated: RecruiterCandidate[]) => {
    setCandidates(updated);
    localStorage.setItem(RECRUITER_STORAGE_KEY, JSON.stringify(updated));
    if (selectedCandidate) {
      const active = updated.find((c) => c.id === selectedCandidate.id);
      if (active) setSelectedCandidate(active);
    }
  };

  // Toggle Shortlist
  const handleShortlistToggle = (candidateId: string) => {
    const updated = candidates.map((c) => {
      if (c.id === candidateId) {
        return { ...c, isShortlisted: !c.isShortlisted };
      }
      return c;
    });
    syncCandidates(updated);
  };

  // Direct Message Trigger
  const handleMessage = (candidate: RecruiterCandidate) => {
    navigate(`/messages?user=${candidate.id}`, {
      state: { targetUserId: candidate.id },
    });
  };

  // Counts
  const shortlistedCount = useMemo(
    () => candidates.filter((c) => c.isShortlisted).length,
    [candidates]
  );

  const interviewCount = useMemo(
    () => candidates.filter((c) => c.interviewStage && c.interviewStage !== 'Not Started').length,
    [candidates]
  );

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Tab filter
      if (activeTab === 'shortlisted' && !c.isShortlisted) return false;
      if (activeTab === 'interviews' && (!c.interviewStage || c.interviewStage === 'Not Started'))
        return false;

      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)) ||
        c.location.toLowerCase().includes(q);

      // 1. Role Filter
      const matchesRole =
        roleFilter === 'All' || c.role.toLowerCase().includes(roleFilter.toLowerCase());

      // 2. Skill Filter
      const matchesSkill =
        skillFilter === 'All' || c.skills.some((s) => s.toLowerCase() === skillFilter.toLowerCase());

      // 3. Experience Filter
      const matchesExperience =
        experienceFilter === 'All' || c.experienceLevel.toLowerCase().includes(experienceFilter.toLowerCase());

      // 4. Location Filter
      const matchesLocation =
        locationFilter === 'All' || c.location.toLowerCase().includes(locationFilter.toLowerCase());

      // 5. Assessment Score Filter
      let matchesAssessment = true;
      if (assessmentFilter === '95%+') matchesAssessment = c.assessmentScore >= 95;
      else if (assessmentFilter === '90%+') matchesAssessment = c.assessmentScore >= 90;
      else if (assessmentFilter === '85%+') matchesAssessment = c.assessmentScore >= 85;

      // 6. Job Match Filter
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
    activeTab,
    searchQuery,
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Technical Talent & Candidate Discovery Portal"
        description="Search, evaluate, and recruit pre-vetted software engineers with verified ATS resumes, algorithmic test scores, and production repos."
        badge={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            Recruiter Workspace: Stripe Talent Partner
          </Badge>
        }
      />

      {/* ========================================================================= */}
      {/* 1. RECRUITER DASHBOARD METRICS: 5 SPECIFIED METRICS                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Metric 1: Jobs Posted */}
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-[#0A66C2]" /> Jobs Posted
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">6</p>
          <span className="text-[10px] text-[#0A66C2] font-mono font-semibold">Active Headcount</span>
        </div>

        {/* Metric 2: Applications */}
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block flex items-center gap-1">
            <Users className="w-3 h-3 text-sky-600" /> Applications
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">148</p>
          <span className="text-[10px] text-sky-600 font-mono font-semibold">+12 this week</span>
        </div>

        {/* Metric 3: Shortlisted */}
        <div
          onClick={() => setActiveTab('shortlisted')}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            activeTab === 'shortlisted'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] block flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" /> Shortlisted
          </span>
          <p className="text-xl font-bold text-[#8A6100] font-mono">{shortlistedCount}</p>
          <span className="text-[10px] text-[#8A6100] font-mono font-semibold">Top Candidates</span>
        </div>

        {/* Metric 4: Interviews */}
        <div
          onClick={() => setActiveTab('interviews')}
          className={cn(
            'p-3.5 rounded-xl border space-y-0.5 cursor-pointer transition shadow-xs',
            activeTab === 'interviews'
              ? 'bg-[#E8F3FF] border-[#0A66C2]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          )}
        >
          <span className="text-[10px] uppercase font-mono text-[#788896] block flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-600" /> Interviews
          </span>
          <p className="text-xl font-bold text-emerald-600 font-mono">{interviewCount}</p>
          <span className="text-[10px] text-emerald-600 font-mono font-semibold">Loops In-Flight</span>
        </div>

        {/* Metric 5: Hired */}
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 col-span-2 sm:col-span-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hired
          </span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">5</p>
          <span className="text-[10px] text-[#788896] font-mono">Q3 Targets Met</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CANDIDATE SEARCH & 6 MULTI-PARAMETER FILTERS                           */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
        {/* Top Search Input & Tab Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Freeform Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, headline, location, or technical skills..."
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
            />
          </div>

          {/* View Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pool')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1',
                activeTab === 'pool'
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Discovery Pool</span>
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                activeTab === 'pool' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
              )}>
                {candidates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shortlisted')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1',
                activeTab === 'shortlisted'
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Shortlisted</span>
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                activeTab === 'shortlisted' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
              )}>
                {shortlistedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('interviews')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1',
                activeTab === 'interviews'
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Loops</span>
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                activeTab === 'interviews' ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
              )}>
                {interviewCount}
              </span>
            </button>
          </div>
        </div>

        {/* 6 Filter Dropdowns Toolbar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          {/* 1. Role */}
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

          {/* 2. Skills */}
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

          {/* 3. Experience */}
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

          {/* 4. Location */}
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

          {/* 5. Assessment Score */}
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

          {/* 6. Job Match */}
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

      {/* ========================================================================= */}
      {/* 3. CANDIDATE CARDS GRID                                                   */}
      {/* ========================================================================= */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
          <p className="text-sm font-semibold text-[#1D2226]">No candidates found matching criteria</p>
          <p className="text-xs text-[#56687A]">
            Try loosening assessment score or experience filters to expand the discovery pool.
          </p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('All');
              setSkillFilter('All');
              setExperienceFilter('All');
              setLocationFilter('All');
              setAssessmentFilter('All');
              setJobMatchFilter('All');
            }}
          >
            Reset All Filters
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

      {/* ========================================================================= */}
      {/* 4. CANDIDATE PROFILE DOSSIER MODAL                                        */}
      {/* ========================================================================= */}
      <CandidateDossierModal
        candidate={selectedCandidate}
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        onShortlistToggle={handleShortlistToggle}
        onMessage={handleMessage}
      />
    </div>
  );
};

export default RecruiterPage;
