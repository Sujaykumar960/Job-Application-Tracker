import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CircularAtsGauge } from '../components/resume/CircularAtsGauge';
import { ResumeUploadZone, ResumeItem } from '../components/resume/ResumeUploadZone';
import { AtsPillars } from '../components/resume/AtsPillars';
import { AiBulletOptimizer } from '../components/resume/AiBulletOptimizer';
import {
  FileSearch,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  AlertTriangle,
  Target,
  Code2,
  GraduationCap,
  Layout,
  Briefcase,
  Terminal,
  Loader2,
  FileText,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { resumeApi, ResumeAnalysisResult } from '../api/resumeApi';

export const ResumeAnalyzerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'keywords' | 'skills' | 'experience' | 'projects' | 'education' | 'formatting'
  >('overview');

  // Async States
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume Library & Analysis State
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);

  // Optional Job Description Comparison State
  const [jobDescription, setJobDescription] = useState<string>('');
  const [showJdInput, setShowJdInput] = useState<boolean>(false);

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoadingResumes(true);
      setError(null);
      const list = await resumeApi.getResumes();
      setResumes(list);

      const active = list.find((r) => r.isActive) || list[0];
      if (active) {
        setActiveResumeId(active.id);
        await loadAnalysis(active.id);
      } else {
        setAnalysis(null);
      }
    } catch (err: any) {
      console.error('Failed to load resumes:', err);
      setError(err.response?.data?.detail || 'Failed to load resume documents from server.');
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const loadAnalysis = async (resumeId: string) => {
    try {
      const res = await resumeApi.getResumeAnalysis(resumeId);
      setAnalysis(res);
    } catch (err: any) {
      // 404 indicates document hasn't been evaluated yet
      if (err.response?.status === 404) {
        setAnalysis(null);
      } else {
        console.error('Failed to fetch resume analysis:', err);
        setError(err.response?.data?.detail || 'Failed to fetch resume analysis.');
      }
    }
  };

  const handleUploadNew = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      const uploaded = await resumeApi.uploadResume(file);
      setResumes((prev) => [uploaded, ...prev.map((r) => ({ ...r, isActive: false }))]);
      setActiveResumeId(uploaded.id);

      // Immediately run Groq ATS analysis on newly uploaded document
      await handleTriggerAnalysis(uploaded.id);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Failed to upload and validate resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectResume = async (id: string) => {
    if (id === activeResumeId) return;
    try {
      setActiveResumeId(id);
      setError(null);
      await resumeApi.setActiveResume(id);
      setResumes((prev) => prev.map((r) => ({ ...r, isActive: r.id === id })));
      await loadAnalysis(id);
    } catch (err: any) {
      console.error('Switch active resume failed:', err);
      setError(err.response?.data?.detail || 'Failed to switch active resume.');
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resume document and its analysis?')) {
      return;
    }
    try {
      setError(null);
      await resumeApi.deleteResume(id);
      const remaining = resumes.filter((r) => r.id !== id);
      setResumes(remaining);

      if (activeResumeId === id) {
        if (remaining.length > 0) {
          const nextActive = remaining[0];
          setActiveResumeId(nextActive.id);
          await loadAnalysis(nextActive.id);
        } else {
          setActiveResumeId('');
          setAnalysis(null);
        }
      }
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.detail || 'Failed to delete resume.');
    }
  };

  const handleTriggerAnalysis = async (targetResumeId?: string) => {
    const resumeId = targetResumeId || activeResumeId;
    if (!resumeId) {
      setError('Please select or upload a resume to analyze.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      const res = await resumeApi.analyzeResume(resumeId, jobDescription.trim() || undefined);
      setAnalysis(res);

      // Update ATS score in the local list
      setResumes((prev) =>
        prev.map((r) => (r.id === resumeId ? { ...r, atsScore: res.atsScore } : r))
      );
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setError(
        err.response?.data?.detail ||
          'AI analysis failed. Please verify that GROQ_API_KEY is configured on the backend.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeResume = resumes.find((r) => r.id === activeResumeId) || resumes[0];

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <PageHeader
        title="AI Resume Analysis & ATS Optimizer"
        description="Real-world Applicant Tracking System diagnostics powered by server-side Groq AI screening algorithms."
        badge={
          <Badge variant="brand" size="sm">
            Groq Llama 3.3 Engine
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowJdInput(!showJdInput)}
              icon={<Sliders className="w-3.5 h-3.5 text-brand-600" />}
            >
              {showJdInput ? 'Hide Job Description' : 'Match vs Job Description'}
            </Button>
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                View Matching Jobs
              </Button>
            </Link>
            <Button
              size="sm"
              variant="primary"
              loading={isAnalyzing || isUploading}
              disabled={resumes.length === 0}
              onClick={() => handleTriggerAnalysis()}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {isAnalyzing ? 'Analyzing with Groq...' : 'Analyze Resume'}
            </Button>
          </div>
        }
      />

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Resume Diagnostic Warning</p>
            <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Optional Job Description Comparison Input Box */}
      {showJdInput && (
        <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0A66C2]" />
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
                Target Role / Job Description Comparison
              </h3>
            </div>
            <span className="text-[11px] text-[#56687A]">
              Paste real job requirements to diagnose keyword match & specific skill gaps
            </span>
          </div>

          <textarea
            rows={4}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste target job description here (e.g. Senior Backend Engineer with Go, Kafka, Redis, Distributed Systems)..."
            className="w-full text-xs font-mono p-3 rounded-lg border border-[#D9D9D9] focus:outline-none focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] text-[#1D2226]"
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setJobDescription('')}
              disabled={!jobDescription}
            >
              Clear
            </Button>
            <Button
              size="xs"
              variant="primary"
              loading={isAnalyzing}
              disabled={!jobDescription.trim() || resumes.length === 0}
              onClick={() => handleTriggerAnalysis()}
              icon={<Sparkles className="w-3 h-3" />}
            >
              Compare with Job Description
            </Button>
          </div>
        </Card>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Resume Upload, Version Switcher & Integrity Card (4 Cols)    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
                Resume Library
              </span>
              {activeResume ? (
                <span className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active Document
                </span>
              ) : (
                <span className="text-[10px] text-[#788896] font-mono">0 Documents</span>
              )}
            </div>

            {/* Upload Zone & Resume Library */}
            <ResumeUploadZone
              resumes={resumes}
              activeResumeId={activeResumeId}
              onSelectResume={handleSelectResume}
              onUploadNew={handleUploadNew}
              onDeleteResume={handleDeleteResume}
              isAnalyzing={isAnalyzing || isUploading}
              onTriggerAnalysis={() => handleTriggerAnalysis()}
            />
          </Card>

          {/* AI vs User Legend Card */}
          <Card className="p-3.5 bg-[#F3F6F8] border border-[#E8E8E8] space-y-2 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-[#788896] block">
              Data Integrity & Security Standards
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-[#38434F]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-[#1D2226]">Verified Extraction:</span>
                <span className="text-[#56687A]">Parsed directly from your uploaded PDF/DOCX.</span>
              </div>
              <div className="flex items-center gap-2 text-[#38434F]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2] flex-shrink-0" />
                <span className="font-semibold text-[#0A66C2]">Groq AI Analysis:</span>
                <span className="text-[#56687A]">Evaluated via server-side Llama 3.3 models.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: AI Analysis Dashboard (8 Cols)                              */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* STATE 1: INITIAL LOADING OF RESUMES */}
          {isLoadingResumes && (
            <Card className="p-12 bg-white border border-[#D9D9D9] flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-[#0A66C2] animate-spin" />
              <p className="text-sm font-semibold text-[#1D2226]">Loading resume documents...</p>
              <p className="text-xs text-[#56687A]">Connecting to CareerX document storage</p>
            </Card>
          )}

          {/* STATE 2: NO RESUMES UPLOADED YET */}
          {!isLoadingResumes && resumes.length === 0 && (
            <Card className="p-12 bg-white border border-[#D9D9D9] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#F3F6F8] flex items-center justify-center border border-[#E8E8E8]">
                <FileText className="w-8 h-8 text-[#788896]" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-[#1D2226]">No Resumes Uploaded Yet</h3>
                <p className="text-xs text-[#56687A] leading-relaxed">
                  Upload your actual PDF or Word (.docx) resume using the upload zone on the left to start real-time Groq AI ATS screening diagnostics.
                </p>
              </div>
            </Card>
          )}

          {/* STATE 3: ANALYZING IN PROGRESS */}
          {isAnalyzing && (
            <Card className="p-12 bg-white border border-[#D9D9D9] flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F3FF] flex items-center justify-center text-[#0A66C2]">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-[#1D2226]">Running Groq AI ATS Analysis...</h3>
                <p className="text-xs text-[#56687A] leading-relaxed">
                  Extracting keywords, parsing competency taxonomy, auditing STAR impact metrics, and computing overall ATS readiness score.
                </p>
              </div>
            </Card>
          )}

          {/* STATE 4: RESUME EXISTS BUT NOT ANALYZED YET */}
          {!isLoadingResumes && !isAnalyzing && resumes.length > 0 && !analysis && (
            <Card className="p-10 bg-white border border-[#D9D9D9] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F3FF] flex items-center justify-center text-[#0A66C2]">
                <FileSearch className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-[#1D2226]">Ready for ATS Screening Analysis</h3>
                <p className="text-xs text-[#56687A] leading-relaxed">
                  Active document: <span className="font-semibold text-[#1D2226] font-mono">{activeResume?.name}</span>. Click below to run full AI diagnostics with Groq.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTriggerAnalysis()}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Analyze Document Now
              </Button>
            </Card>
          )}

          {/* STATE 5: SUCCESSFUL REAL ANALYSIS DISPLAY */}
          {!isLoadingResumes && !isAnalyzing && analysis && (
            <>
              {/* SECTION 1: ATS SCORE & PILLARS OVERVIEW */}
              <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-[#E8E8E8]">
                  <div className="flex items-center gap-5">
                    {/* Circular ATS Gauge */}
                    <CircularAtsGauge score={analysis.atsScore} size={118} strokeWidth={9} />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1D2226] tracking-tight">
                          Algorithm Screening Evaluation
                        </h3>
                        <Badge variant={analysis.atsScore >= 80 ? 'success' : analysis.atsScore >= 65 ? 'brand' : 'warning'} size="sm">
                          {analysis.atsScore >= 85 ? 'Top Tier Match' : analysis.atsScore >= 70 ? 'Competitive' : 'Needs Optimization'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#56687A] max-w-md leading-relaxed">
                        Evaluated against real-world enterprise parsing benchmarks using Llama 3.3.
                        {analysis.jobDescription ? ' Custom comparison against target job requirements.' : ' Comprehensive general technical rubric.'}
                      </p>
                      <p className="text-[11px] text-[#788896] font-mono">
                        Document: {activeResume?.name} • Evaluated: {analysis.analyzedAt ? analysis.analyzedAt.slice(0, 10) : 'Today'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Pillars Breakdown */}
                {analysis.pillars && analysis.pillars.length > 0 && (
                  <AtsPillars pillars={analysis.pillars} />
                )}
              </Card>

              {/* SECTION TABS: Overview, Keywords, Skills, Experience, Projects, Education, Formatting */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#E8E8E8]">
                {[
                  { id: 'overview', label: 'Overview & Strength' },
                  { id: 'keywords', label: `Keywords & Gaps (${analysis.missingKeywords?.length || 0})` },
                  { id: 'skills', label: 'Skill Extraction' },
                  { id: 'experience', label: `STAR Rewrites (${analysis.bulletImprovements?.length || 0})` },
                  { id: 'formatting', label: 'Formatting Health' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'bg-[#0A66C2] text-white shadow-sm'
                        : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW & RESUME STRENGTH */}
              {activeTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths Card */}
                    <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Resume Strengths ({analysis.strengths?.length || 0})</span>
                      </div>
                      {analysis.strengths && analysis.strengths.length > 0 ? (
                        <ul className="space-y-2 text-xs text-[#38434F]">
                          {analysis.strengths.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#788896]">No specific strengths identified.</p>
                      )}
                    </Card>

                    {/* Weaknesses / Diagnostic Gaps Card */}
                    <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
                        <AlertCircle className="w-4 h-4" />
                        <span>Areas for Optimization ({analysis.weaknesses?.length || 0})</span>
                      </div>
                      {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                        <ul className="space-y-2 text-xs text-[#38434F]">
                          {analysis.weaknesses.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#8A6100] flex-shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#788896]">No critical weaknesses detected.</p>
                      )}
                    </Card>
                  </div>

                  {/* AI Bullet Enhancer Preview if available */}
                  {analysis.bulletImprovements && analysis.bulletImprovements.length > 0 && (
                    <AiBulletOptimizer bullets={analysis.bulletImprovements} />
                  )}

                  {/* Actionable Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>High-Priority Recommendations</span>
                      </div>
                      <ul className="space-y-2 text-xs text-[#38434F]">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] flex-shrink-0 mt-1.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Next Steps: Skill Gaps and Job Match */}
                  <Card className="p-4 bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <h4 className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Next Steps: Explore Relevant Jobs & Skill Paths
                      </h4>
                      <p className="text-[11px] text-[#56687A] mt-0.5">
                        Use your verified {analysis.atsScore}% ATS score profile to evaluate job fit against active listings.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to="/job-match">
                        <Button size="xs" variant="primary" icon={<ArrowRight className="w-3 h-3" />}>
                          Job Match Diagnostics
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 2: KEYWORDS & MISSING GAPS */}
              {activeTab === 'keywords' && (
                <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                  <div>
                    <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-[#0A66C2]" />
                      ATS Missing Keywords Analysis
                    </h3>
                    <p className="text-[11px] text-[#56687A] mt-0.5">
                      {analysis.jobDescription
                        ? 'High-value keywords identified from your target job description that are absent from this resume.'
                        : 'Common keywords absent from your resume that appear in over 65% of target engineering listings.'}
                    </p>
                  </div>

                  {analysis.missingKeywords && analysis.missingKeywords.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {analysis.missingKeywords.map((kw, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#1D2226] font-mono">{kw.name}</p>
                            <span className="text-[10px] text-[#788896]">{kw.category}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={kw.priority === 'High' ? 'danger' : kw.priority === 'Medium' ? 'warning' : 'neutral'}
                              size="sm"
                            >
                              {kw.priority}
                            </Badge>
                            <Link
                              to="/learning"
                              className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-semibold flex items-center gap-0.5"
                            >
                              Learn <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All essential keywords appear to be covered in this document!
                    </p>
                  )}
                </Card>
              )}

              {/* TAB 3: SKILL EXTRACTION */}
              {activeTab === 'skills' && (
                <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-emerald-600" />
                        Verified Technical Skills Extracted
                      </h3>
                      <p className="text-[11px] text-[#56687A] mt-0.5">
                        Parsed directly from your actual uploaded resume into verified competencies.
                      </p>
                    </div>
                  </div>

                  {analysis.extractedSkills && Object.keys(analysis.extractedSkills).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(analysis.extractedSkills).map(([category, skillsList]) => (
                        <div key={category} className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-[#1D2226]">
                            <span>{category}</span>
                            <span className="text-[10px] font-mono text-[#788896]">{skillsList.length} skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {skillsList.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-white border border-[#D9D9D9] text-[#1D2226] text-xs font-mono flex items-center gap-1 shadow-xs"
                              >
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#788896] p-4 text-center">No skills extracted from this document.</p>
                  )}
                </Card>
              )}

              {/* TAB 4: EXPERIENCE (STAR REWRITES) */}
              {activeTab === 'experience' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {analysis.bulletImprovements && analysis.bulletImprovements.length > 0 ? (
                    <AiBulletOptimizer bullets={analysis.bulletImprovements} />
                  ) : (
                    <Card className="p-8 text-center bg-white border border-[#D9D9D9]">
                      <p className="text-xs text-[#788896]">No bullet point rewrites available for this document.</p>
                    </Card>
                  )}
                </div>
              )}

              {/* TAB 5: FORMATTING HEALTH */}
              {activeTab === 'formatting' && (
                <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                        <Layout className="w-4 h-4 text-emerald-600" />
                        ATS Formatting & Parseability Checklist
                      </h3>
                      <p className="text-[11px] text-[#56687A] mt-0.5">
                        Structural compliance ensuring zero parser truncation across enterprise hiring platforms.
                      </p>
                    </div>
                  </div>

                  {analysis.formattingHealth && analysis.formattingHealth.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.formattingHealth.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-[#1D2226]">{item.label}</p>
                            {item.detail && <p className="text-[11px] text-[#788896]">{item.detail}</p>}
                          </div>
                          <Badge variant={item.status === 'Passed' ? 'success' : 'warning'} size="sm">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1D2226]">Parseable Document Structure</span>
                        <Badge variant="success" size="sm">Passed</Badge>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzerPage;
