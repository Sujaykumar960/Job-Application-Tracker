import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { jobApi } from '../api/jobApi';
import { resumeApi, ResumeItem } from '../api/resumeApi';
import { skillGapApi } from '../api/skillGapApi';
import { applicationApi } from '../api/applicationApi';
import { JobItem, JobMatchAnalysisResult } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Briefcase,
  ArrowRight,
  BookOpen,
  Send,
  SlidersHorizontal,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';

export const JobMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resume selection state
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  // Job selection state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  // Custom job description toggle
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [customJobText, setCustomJobText] = useState('');
  
  // Real match analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysisResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Function to execute real backend compatibility matching
  const executeMatch = useCallback(
    async (jobId: string | null, resumeId: string, isCustom: boolean, customText: string) => {
      try {
        setIsAnalyzing(true);
        setMatchError(null);

        if (isCustom) {
          if (!customText.trim()) {
            setMatchError('Please paste a job description to analyze.');
            setIsAnalyzing(false);
            return;
          }
          const res = await skillGapApi.analyzeCustomJob({
            jobDescription: customText,
            resumeId: resumeId || undefined,
          });
          setMatchAnalysis(res);
        } else if (jobId) {
          const res = await jobApi.getJobMatchAnalysis(jobId, resumeId || undefined);
          setMatchAnalysis(res);
        }
      } catch (err: any) {
        console.error('Job match evaluation failed:', err);
        setMatchError(err?.response?.data?.detail || 'Failed to calculate compatibility diagnostics.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // Initial Data Fetching: Jobs + User Resumes
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [jobsData, resumesData] = await Promise.all([
          jobApi.getJobs(),
          resumeApi.getResumes().catch(() => [] as ResumeItem[]),
        ]);

        if (!isMounted) return;

        setJobs(jobsData);
        setResumes(resumesData);

        // Select active resume if available
        let initialResumeId = '';
        if (resumesData.length > 0) {
          const active = resumesData.find((r) => r.isActive) || resumesData[0];
          initialResumeId = active.id;
          setSelectedResumeId(initialResumeId);
        }

        // Select first job if available
        if (jobsData.length > 0) {
          const initialJobId = jobsData[0].id;
          setSelectedJobId(initialJobId);
          // Auto-run initial match
          executeMatch(initialJobId, initialResumeId, false, '');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.response?.data?.detail || 'Failed to load jobs and resumes. Please try again.');
        console.error('Jobs & Resumes fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [executeMatch]);

  const currentJob: JobItem | null = selectedJobId ? jobs.find((j) => j.id === selectedJobId) || null : null;
  const activeResumeObj = resumes.find((r) => r.id === selectedResumeId);
  const selectedResumeDisplay = activeResumeObj ? activeResumeObj.name : 'Profile Verified Skills';

  const handleRunMatch = () => {
    executeMatch(selectedJobId, selectedResumeId, isCustomJob, customJobText);
  };

  const handleApply = async () => {
    if (!currentJob) return;

    try {
      const currentScore = matchAnalysis?.overallScore ?? matchAnalysis?.matchScore ?? currentJob.matchScore ?? 0;
      const newApp = {
        id: `app-${Date.now()}`,
        company: currentJob.company,
        role: currentJob.title,
        location: currentJob.location,
        appliedDate: new Date().toISOString().split('T')[0],
        deadline: '2026-09-30',
        status: 'Applied' as const,
        priority: (currentScore >= 80 ? 'High' : 'Medium') as 'High' | 'Medium',
        matchScore: currentScore,
        salaryRange: currentJob.salaryRange,
        tags: currentJob.skills.slice(0, 3).map((s) => s.name),
        notes: `Applied from Job Match Diagnostics with ${currentScore}% compatibility score.`,
        resume: selectedResumeDisplay,
      };

      await applicationApi.createApplication(newApp);
      setToastMessage(
        `🎉 Application submitted for ${currentJob.title} at ${currentJob.company}! Added to your Application Tracker.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to apply:', err);
      alert('Failed to submit application. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading jobs and candidate resume...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load matching diagnostics</h3>
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

  // Empty jobs state
  if (jobs.length === 0 && !isCustomJob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Briefcase className="w-12 h-12 text-[#788896]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">No job postings available</h3>
          <p className="text-[#56687A] mt-1">You can test candidate compatibility by pasting a custom job description.</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCustomJob(true)}
            className="mt-4"
          >
            + Paste Custom Job Description
          </Button>
        </div>
      </div>
    );
  }

  const score = matchAnalysis ? (matchAnalysis.overallScore ?? matchAnalysis.matchScore) : (currentJob?.matchScore || 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Resume-to-Job Match Analysis"
        description="Compare your active resume against target job requirements to detect matched, partial, and missing competencies."
        badge={
          <Badge variant="brand" size="sm">
            Deterministic Match Engine
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/skills">
              <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-brand-400" />}>
                View Skill Gap Matrix
              </Button>
            </Link>
            <Link to="/jobs">
              <Button size="sm" variant="secondary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Browse More Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {/* Notice if no resume uploaded */}
      {resumes.length === 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>No uploaded resume found:</strong> Matching is currently using verified profile skills. Upload a resume to enable deep text extraction and AI ATS analysis.
            </span>
          </div>
          <Link to="/resume">
            <Button size="xs" variant="primary" icon={<UploadCloud className="w-3 h-3" />}>
              Upload Resume
            </Button>
          </Link>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/applications"
            className="font-semibold text-emerald-800 underline text-xs flex items-center gap-1 flex-shrink-0"
          >
            Open Tracker <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INPUT CONFIGURATION: RESUME + TARGET JOB                               */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A66C2]" />
            Comparison Inputs
          </span>
          <button
            onClick={() => {
              setIsCustomJob(!isCustomJob);
              setMatchAnalysis(null);
            }}
            className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium transition"
          >
            {isCustomJob ? '← Select from Saved Jobs' : '+ Paste Custom Job Description'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: Select Candidate Resume */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0A66C2]" />
              1. Candidate Resume / Skill Source
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => {
                setSelectedResumeId(e.target.value);
              }}
              className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              {resumes.length === 0 ? (
                <option value="">Profile Skills (Default)</option>
              ) : (
                <>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.format} • {r.atsScore ? `${r.atsScore}% ATS` : 'Uploaded'}
                      {r.isActive ? ' • Active' : ''})
                    </option>
                  ))}
                  <option value="">Profile Skills Only</option>
                </>
              )}
            </select>
          </div>

          {/* Right: Select Job or Paste Custom */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              2. Target Opportunity
            </label>
            {isCustomJob ? (
              <textarea
                rows={2}
                value={customJobText}
                onChange={(e) => setCustomJobText(e.target.value)}
                placeholder="Paste the target job description or required competencies here..."
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
            ) : (
              <select
                value={selectedJobId || ''}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                }}
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} @ {job.company} ({job.location})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="primary"
            loading={isAnalyzing}
            onClick={handleRunMatch}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {isAnalyzing ? 'Evaluating Compatibility...' : 'Re-Calculate Compatibility'}
          </Button>
        </div>
      </Card>

      {/* Match Error Alert */}
      {matchError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{matchError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OVERALL MATCH SCORE BANNER                                             */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#1D2226] font-mono tracking-tight">
              {score}% Match
            </span>
            <Badge
              variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}
              size="md"
            >
              {score >= 80 ? 'High Compatibility' : score >= 60 ? 'Moderate Compatibility' : 'Developing Match'}
            </Badge>
          </div>
          <p className="text-xs text-[#56687A]">
            Comparing <span className="text-[#0A66C2] font-semibold">{selectedResumeDisplay}</span> against{' '}
            <span className="text-[#1D2226] font-semibold">
              {isCustomJob ? 'Custom Opportunity' : `${currentJob?.title || 'Selected Role'} @ ${currentJob?.company || ''}`}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/skills">
            <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-[#0A66C2]" />}>
              Skill Gap Matrix
            </Button>
          </Link>
          <Link to="/learning">
            <Button size="sm" variant="secondary" icon={<BookOpen className="w-3.5 h-3.5 text-[#0A66C2]" />}>
              Learn Missing Skills
            </Button>
          </Link>
          {!isCustomJob && currentJob && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleApply}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Apply to Role
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPETENCIES COMPARISON (Matched, Partial, Missing)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MATCHED SKILLS */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Matched Skills ({matchAnalysis?.matchedSkills?.length || 0})</span>
            </div>
            <Badge variant="success" size="sm">
              Verified
            </Badge>
          </div>

          <div className="space-y-2">
            {!matchAnalysis?.matchedSkills || matchAnalysis.matchedSkills.length === 0 ? (
              <p className="text-xs text-[#788896] italic py-2">No matching skills detected for this role.</p>
            ) : (
              matchAnalysis.matchedSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#E6F4EA] border border-[#c6ecd2] text-xs font-mono text-[#1D2226]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span className="font-semibold">{skill}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-sans">Full Match</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* PARTIAL SKILLS */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A66C2]">
              <Sparkles className="w-4 h-4" />
              <span>Partial Skills ({matchAnalysis?.partialSkills?.length || 0})</span>
            </div>
            <Badge variant="info" size="sm">
              Developing
            </Badge>
          </div>

          <div className="space-y-2">
            {!matchAnalysis?.partialSkills || matchAnalysis.partialSkills.length === 0 ? (
              <p className="text-xs text-[#788896] italic py-2">No adjacent partial competencies flagged.</p>
            ) : (
              matchAnalysis.partialSkills.map((item) => (
                <div
                  key={item.name}
                  className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#d0e6fc] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[#0A66C2]">~ {item.name}</span>
                    <span className="text-[10px] text-[#0A66C2]">Partial Depth</span>
                  </div>
                  <p className="text-[11px] text-[#56687A] leading-snug">{item.note}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* MISSING SKILLS */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing Skills ({matchAnalysis?.missingSkills?.length || 0})</span>
            </div>
            <Badge variant="warning" size="sm">
              Gaps
            </Badge>
          </div>

          <div className="space-y-2">
            {!matchAnalysis?.missingSkills || matchAnalysis.missingSkills.length === 0 ? (
              <p className="text-xs text-emerald-700 italic py-2">All required technical competencies are satisfied!</p>
            ) : (
              matchAnalysis.missingSkills.map((item, idx) => {
                const skillName = typeof item === 'string' ? item : item.name;
                const moduleName = typeof item === 'object' && item.module ? item.module : 'Dev Learning Hub';
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-[#FFF4CC]/50 border border-[#ffe899] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A6100] font-bold">⚠</span>
                      <span className="text-[#1D2226] font-semibold">{skillName}</span>
                    </div>
                    <Link
                      to="/learning"
                      className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5"
                      title={`Learn ${moduleName}`}
                    >
                      Learn <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECOMMENDATIONS TO CLOSE THE GAP (Linked to Learning)                  */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Actionable Recommendations to Close the Gap
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Target steps to increase compatibility before submitting your application.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            {matchAnalysis?.recommendations?.length || 0} Steps
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {!matchAnalysis?.recommendations || matchAnalysis.recommendations.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-[#788896]">
              No recommendations at this time.
            </div>
          ) : (
            matchAnalysis.recommendations.map((rec, i) => {
              const title = typeof rec === 'string' ? rec : rec.title;
              const desc = typeof rec === 'object' && rec.desc ? rec.desc : 'Close this competency gap to elevate your match score.';
              const action = typeof rec === 'object' && rec.action ? rec.action : 'Open Module';
              const link = typeof rec === 'object' && rec.link ? rec.link : '/learning';

              return (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-3 group hover:border-[#0A66C2]/40 transition"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                      {title}
                    </h4>
                    <p className="text-[11px] text-[#56687A] leading-relaxed">{desc}</p>
                  </div>

                  <div className="pt-2 border-t border-[#E8E8E8] flex justify-end">
                    <Link to={link}>
                      <Button size="xs" variant="primary" className="text-[10px]">
                        {action}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default JobMatchPage;
