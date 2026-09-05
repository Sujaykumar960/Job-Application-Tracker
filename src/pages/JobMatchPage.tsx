import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { MOCK_JOBS } from '../data/mockData';
import { JobItem } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
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
  ChevronRight,
  Target,
  RefreshCw,
} from 'lucide-react';

interface MatchAnalysisResult {
  overallScore: number;
  matchedSkills: string[];
  partialSkills: Array<{ name: string; note: string }>;
  missingSkills: Array<{ name: string; priority: 'High' | 'Medium' | 'Low'; module: string }>;
  recommendations: Array<{ title: string; desc: string; action: string; link: string }>;
}

export const JobMatchPage: React.FC = () => {
  const navigate = useNavigate();

  // Resume selection state
  const [selectedResume, setSelectedResume] = useState('Alex_Rivera_Distributed_Systems.pdf');
  // Job selection state
  const [selectedJobId, setSelectedJobId] = useState(MOCK_JOBS[0].id);
  // Custom job description toggle
  const [isCustomJob, setIsCustomJob] = useState(false);
  const [customJobText, setCustomJobText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentJob: JobItem = MOCK_JOBS.find((j) => j.id === selectedJobId) || MOCK_JOBS[0];

  const handleApply = () => {
    const existingRaw = localStorage.getItem('careerx_applications_v2');
    let apps = [];
    if (existingRaw) {
      try {
        apps = JSON.parse(existingRaw);
      } catch {
        apps = [];
      }
    }

    const alreadyApplied = apps.some(
      (a: any) =>
        a.company.toLowerCase() === currentJob.company.toLowerCase() &&
        a.role.toLowerCase() === currentJob.title.toLowerCase()
    );

    if (alreadyApplied) {
      setToastMessage(`You have already applied to ${currentJob.title} at ${currentJob.company}`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const newApp = {
      id: `app-${Date.now()}`,
      company: currentJob.company,
      role: currentJob.title,
      location: currentJob.location,
      appliedDate: new Date().toISOString().split('T')[0],
      deadline: '2026-09-30',
      status: 'Applied',
      priority: currentJob.matchScore >= 90 ? 'High' : 'Medium',
      matchScore: currentJob.matchScore,
      salaryRange: currentJob.salaryRange,
      tags: currentJob.skills.slice(0, 3).map((s) => s.name),
      notes: `Applied from Job Match Diagnostics with ${currentJob.matchScore}% compatibility score.`,
      resume: selectedResume,
    };

    localStorage.setItem('careerx_applications_v2', JSON.stringify([newApp, ...apps]));
    setToastMessage(`🎉 Application submitted for ${currentJob.title} at ${currentJob.company}! Added to your Application Tracker.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Mock Analysis Result for Current Selection
  const matchResult: MatchAnalysisResult = {
    overallScore: currentJob.matchScore || 87,
    matchedSkills: ['Python', 'SQL', 'React', 'TypeScript', 'Go', 'PostgreSQL'],
    partialSkills: [
      {
        name: 'Kubernetes',
        note: 'Candidate has verified Docker containerization skills, but needs multi-node cluster orchestration experience.',
      },
      {
        name: 'Distributed Systems',
        note: 'Solid microservices fundamentals, but lacks hands-on multi-region data replication experience.',
      },
    ],
    missingSkills: [
      { name: 'Docker', priority: 'High', module: 'Container Runtimes & Dockerfile Optimization' },
      { name: 'AWS', priority: 'High', module: 'AWS Cloud Architecture (ECS, S3, RDS)' },
      { name: 'Kafka', priority: 'Medium', module: 'Distributed Event Streaming with Kafka' },
      { name: 'Redis Lua Scripts', priority: 'Medium', module: 'Distributed Rate Limiting with Redis Lua' },
    ],
    recommendations: [
      {
        title: 'Complete "AWS Cloud Architecture" in Dev Hub',
        desc: 'Closing the AWS gap will elevate your match score from 87% to 94% for this position.',
        action: 'Launch Module',
        link: '/learning',
      },
      {
        title: 'Add PostgreSQL Indexing Metrics to Resume',
        desc: 'Highlight query execution latency benchmarks in your projects section.',
        action: 'Optimize Bullets',
        link: '/resume',
      },
      {
        title: 'Prepared to Apply',
        desc: 'An 87% score ranks in the top 12% of applicants for this opening.',
        action: 'Prepare Application',
        link: '/applications',
      },
    ],
  };

  const handleRunMatch = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 600);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Resume-to-Job Match Analysis"
        description="Compare your active resume against target job requirements to detect matched, partial, and missing competencies."
        badge={
          <Badge variant="brand" size="sm">
            Neural Match v2.1
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
            onClick={() => setIsCustomJob(!isCustomJob)}
            className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium transition"
          >
            {isCustomJob ? 'Select from Saved Jobs' : '+ Paste Custom Job Description'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: Select Candidate Resume */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0A66C2]" />
              1. Candidate Resume
            </label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="Alex_Rivera_Distributed_Systems.pdf">
                Alex_Rivera_Distributed_Systems.pdf (Active • 88% ATS)
              </option>
              <option value="Alex_Rivera_FullStack_v2.pdf">
                Alex_Rivera_FullStack_v2.pdf (82% ATS)
              </option>
              <option value="Alex_Rivera_FrontendPlatform.docx">
                Alex_Rivera_FrontendPlatform.docx (85% ATS)
              </option>
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
                placeholder="Paste the target job description or requirements here..."
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              >
                {MOCK_JOBS.map((job) => (
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
            {isAnalyzing ? 'Evaluating Semantics...' : 'Re-Calculate Compatibility'}
          </Button>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. OVERALL MATCH SCORE BANNER                                             */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#1D2226] font-mono tracking-tight">
              {matchResult.overallScore}% Match
            </span>
            <Badge variant="success" size="md">
              High Probability
            </Badge>
          </div>
          <p className="text-xs text-[#56687A]">
            Comparing <span className="text-[#0A66C2] font-semibold">{selectedResume}</span> against{' '}
            <span className="text-[#1D2226] font-semibold">
              {currentJob.title} @ {currentJob.company}
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
          <Button
            size="sm"
            variant="primary"
            onClick={handleApply}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Apply to Role
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPETENCIES COMPARISON (Matched, Partial, Missing)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MATCHED SKILLS (✓ Python, ✓ SQL, ✓ React) */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Matched Skills ({matchResult.matchedSkills.length})</span>
            </div>
            <Badge variant="success" size="sm">
              Verified
            </Badge>
          </div>

          <div className="space-y-2">
            {matchResult.matchedSkills.map((skill) => (
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
            ))}
          </div>
        </Card>

        {/* PARTIAL SKILLS (~ Kubernetes, ~ Distributed Systems) */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A66C2]">
              <Sparkles className="w-4 h-4" />
              <span>Partial Skills ({matchResult.partialSkills.length})</span>
            </div>
            <Badge variant="info" size="sm">
              Developing
            </Badge>
          </div>

          <div className="space-y-2">
            {matchResult.partialSkills.map((item) => (
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
            ))}
          </div>
        </Card>

        {/* MISSING SKILLS (⚠ Docker, ⚠ AWS, ⚠ Kafka) */}
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing Skills ({matchResult.missingSkills.length})</span>
            </div>
            <Badge variant="warning" size="sm">
              Gaps
            </Badge>
          </div>

          <div className="space-y-2">
            {matchResult.missingSkills.map((item) => (
              <div
                key={item.name}
                className="p-2 rounded-xl bg-[#FFF4CC]/50 border border-[#ffe899] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#8A6100] font-bold">⚠</span>
                  <span className="text-[#1D2226] font-semibold">{item.name}</span>
                </div>
                <Link
                  to="/learning"
                  className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5"
                  title={`Learn ${item.module}`}
                >
                  Learn <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            ))}
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
              Tailored AI Recommendations to Close the Gap
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Actionable steps to reach 95%+ compatibility before submitting your application.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            {matchResult.recommendations.length} Steps
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {matchResult.recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-3 group hover:border-[#0A66C2]/40 transition"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                  {rec.title}
                </h4>
                <p className="text-[11px] text-[#56687A] leading-relaxed">{rec.desc}</p>
              </div>

              <div className="pt-2 border-t border-[#E8E8E8] flex justify-end">
                <Link to={rec.link}>
                  <Button size="xs" variant="primary" className="text-[10px]">
                    {rec.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default JobMatchPage;
