import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CircularAtsGauge } from '../components/resume/CircularAtsGauge';
import { ResumeUploadZone, ResumeItem } from '../components/resume/ResumeUploadZone';
import { AtsPillars, PillarMetric } from '../components/resume/AtsPillars';
import { AiBulletOptimizer, BulletImprovement } from '../components/resume/AiBulletOptimizer';
import {
  FileSearch,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Target,
  Code2,
  Database,
  Server,
  Layers,
  GraduationCap,
  Layout,
  Briefcase,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResumeAnalyzerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'keywords' | 'skills' | 'experience' | 'projects' | 'education' | 'formatting'
  >('overview');

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Resume library state
  const [resumes, setResumes] = useState<ResumeItem[]>([
    {
      id: 'res-1',
      name: 'Alex_Rivera_Distributed_Systems.pdf',
      format: 'PDF',
      size: '2.4 MB',
      uploadDate: 'Sep 2, 2026',
      atsScore: 88,
      isActive: true,
    },
    {
      id: 'res-2',
      name: 'Alex_Rivera_FullStack_v2.pdf',
      format: 'PDF',
      size: '1.8 MB',
      uploadDate: 'Aug 28, 2026',
      atsScore: 82,
      isActive: false,
    },
    {
      id: 'res-3',
      name: 'Alex_Rivera_FrontendPlatform.docx',
      format: 'DOCX',
      size: '1.2 MB',
      uploadDate: 'Aug 20, 2026',
      atsScore: 85,
      isActive: false,
    },
  ]);

  const [activeResumeId, setActiveResumeId] = useState<string>('res-1');

  const activeResume = resumes.find((r) => r.id === activeResumeId) || resumes[0];

  // ATS Evaluation Pillars
  const pillars: PillarMetric[] = [
    {
      title: 'Keywords & Hard Skills',
      weight: '35% weight',
      score: 92,
      status: 'optimal',
      summary: 'High match across backend & distributed systems taxonomies.',
    },
    {
      title: 'Impact & Metrics',
      weight: '30% weight',
      score: 84,
      status: 'good',
      summary: 'Good use of percentage metrics; 2 project bullets need latency/throughput quantification.',
    },
    {
      title: 'Formatting & Readability',
      weight: '20% weight',
      score: 96,
      status: 'optimal',
      summary: '1-column clean layout with 100% parseable standard headers.',
    },
    {
      title: 'Section Completeness',
      weight: '15% weight',
      score: 90,
      status: 'optimal',
      summary: 'Contact, summary, experience, projects, and education fully populated.',
    },
  ];

  // Strengths
  const strengths = [
    'Strong action verbs leading every bullet (Architected, Engineered, Optimized, Scaled).',
    'Demonstrated proficiency in high-demand concurrency languages (Go, TypeScript, Python).',
    'Single-column structure ensures flawless parsing across Workday, Greenhouse, and Lever ATS engines.',
    'Clear graduation date and accredited university credentials.',
  ];

  // Weaknesses
  const weaknesses = [
    '2 project descriptions lack business impact metrics (e.g. throughput RPS, latency p99, or infrastructure cost savings).',
    'Missing cloud observability keywords (OpenTelemetry, Prometheus, Distributed Tracing).',
    'Summary section exceeds 3 sentences—recommend tightening to 2 concise punchy lines.',
  ];

  // Missing Keywords
  const missingKeywords = [
    { name: 'Kafka Partitioning', priority: 'High', category: 'Distributed Systems' },
    { name: 'Redis Lua Scripts', priority: 'High', category: 'Caching & Concurrency' },
    { name: 'OpenTelemetry', priority: 'Medium', category: 'Observability' },
    { name: 'Distributed Tracing', priority: 'Medium', category: 'Infra' },
    { name: 'eBPF Profiling', priority: 'Low', category: 'Performance' },
    { name: 'Chaos Engineering', priority: 'Low', category: 'Reliability' },
  ];

  // Extracted Skills
  const extractedSkills = {
    Languages: ['Go', 'TypeScript', 'Python', 'JavaScript (ES6+)', 'SQL', 'C++'],
    'Frameworks & Runtimes': ['React', 'Node.js', 'Next.js', 'FastAPI', 'Express', 'Tailwind CSS'],
    'Databases & Storage': ['PostgreSQL', 'Redis', 'MongoDB', 'DynamoDB'],
    'DevOps & Cloud': ['Docker', 'Kubernetes', 'AWS (ECS, S3, RDS)', 'Linux', 'Git', 'GitHub Actions'],
    Architecture: ['Microservices', 'Distributed Systems', 'Event-Driven Systems', 'RESTful APIs', 'gRPC'],
  };

  // AI Bullet Recommendations
  const bulletImprovements: BulletImprovement[] = [
    {
      id: 'b-1',
      section: 'Work Experience • CloudScale',
      original: 'Built a rate limiting service in Go and Redis to protect internal APIs from being overloaded.',
      optimized:
        'Architected a distributed sliding-window rate limiter in Go and atomic Redis Lua scripts, throttling 45M+ daily requests and reducing p99 latency spikes by 38%.',
      rationale:
        'Quantifies daily throughput (45M+), specifies exact algorithmic mechanism (sliding window with Lua scripts), and provides measurable latency impact.',
      scoreImpact: '+4% Impact Score',
    },
    {
      id: 'b-2',
      section: 'Project • Distributed Event Bus',
      original: 'Created a Kafka event processing project that handles message routing between services.',
      optimized:
        'Engineered an asynchronous event broker in Go with Kafka and partition key rebalancing, processing 12k msg/sec with zero message loss and transactional outbox guarantees.',
      rationale:
        'Replaces generic "created" with "engineered", establishes throughput benchmarks (12k msg/sec), and includes high-value architectural pattern (transactional outbox).',
      scoreImpact: '+3% ATS Match',
    },
  ];

  // Handler for uploading new resume file
  const handleUploadNew = (file: File) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const newResume: ResumeItem = {
        id: `res-${Date.now()}`,
        name: file.name,
        format: file.name.endsWith('.docx') ? 'DOCX' : 'PDF',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: 'Just now',
        atsScore: 89,
        isActive: true,
      };
      setResumes((prev) => [newResume, ...prev.map((r) => ({ ...r, isActive: false }))]);
      setActiveResumeId(newResume.id);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleSelectResume = (id: string) => {
    setActiveResumeId(id);
    setResumes((prev) => prev.map((r) => ({ ...r, isActive: r.id === id })));
  };

  const handleDeleteResume = (id: string) => {
    if (resumes.length <= 1) return;
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (activeResumeId === id) {
      setActiveResumeId(resumes[0].id);
    }
  };

  const handleTriggerAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <PageHeader
        title="AI Resume Analysis & ATS Optimizer"
        description="Comprehensive algorithmic screening diagnostics, STAR bullet point enhancements, and keyword extraction."
        badge={
          <Badge variant="brand" size="sm">
            AI Screening Engine v2.4
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                View Matching Jobs
              </Button>
            </Link>
            <Button
              size="sm"
              variant="primary"
              loading={isAnalyzing}
              onClick={handleTriggerAnalysis}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Analyze Resume
            </Button>
          </div>
        }
      />

      {/* Main 2-Column Responsive Layout (Laptop 1366px+) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Resume Upload, Version Switcher & Quick Actions (4 Cols)    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
                Active Document
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Upload
              </span>
            </div>

            {/* Upload Zone & Resume Library */}
            <ResumeUploadZone
              resumes={resumes}
              activeResumeId={activeResumeId}
              onSelectResume={handleSelectResume}
              onUploadNew={handleUploadNew}
              onDeleteResume={handleDeleteResume}
              isAnalyzing={isAnalyzing}
              onTriggerAnalysis={handleTriggerAnalysis}
            />
          </Card>

          {/* AI vs User Legend Card */}
          <Card className="p-3.5 bg-[#F3F6F8] border border-[#E8E8E8] space-y-2 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-[#788896] block">
              Data Integrity Standards
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-[#38434F]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-[#1D2226]">Verified User Content:</span>
                <span className="text-[#56687A]">Extracted verbatim from your uploaded document.</span>
              </div>
              <div className="flex items-center gap-2 text-[#38434F]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2] flex-shrink-0" />
                <span className="font-semibold text-[#0A66C2]">✨ AI Recommendations:</span>
                <span className="text-[#56687A]">STAR enhancements generated against FAANG ATS rubrics.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: AI Analysis Dashboard (8 Cols)                              */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* SECTION 1: ATS SCORE & PILLARS OVERVIEW */}
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-[#E8E8E8]">
              <div className="flex items-center gap-5">
                {/* Circular ATS Gauge */}
                <CircularAtsGauge score={activeResume.atsScore} size={118} strokeWidth={9} />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#1D2226] tracking-tight">
                      Algorithm Screening Evaluation
                    </h3>
                    <Badge variant="brand" size="sm">
                      88th Percentile
                    </Badge>
                  </div>
                  <p className="text-xs text-[#56687A] max-w-md leading-relaxed">
                    Evaluated against real-world parsing benchmarks from Workday, Greenhouse, and Lever.
                    Top candidate qualifications for Senior Backend and Distributed Systems roles.
                  </p>
                  <p className="text-[11px] text-[#788896] font-mono">
                    Target Profile: Full Stack / Distributed Systems Engineer
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Pillars Breakdown */}
            <AtsPillars pillars={pillars} />
          </Card>

          {/* SECTION TABS: Overview, Keywords, Skills, Experience, Projects, Education, Formatting */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#E8E8E8]">
            {[
              { id: 'overview', label: 'Overview & Strength' },
              { id: 'keywords', label: 'Keywords & Gaps' },
              { id: 'skills', label: 'Skill Extraction' },
              { id: 'experience', label: 'Experience (STAR Rewrites)' },
              { id: 'projects', label: 'Projects' },
              { id: 'education', label: 'Education' },
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

          {/* TAB CONTENT */}

          {/* TAB 1: OVERVIEW & RESUME STRENGTH */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths Card */}
                <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resume Strengths ({strengths.length})</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#38434F]">
                    {strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Weaknesses / Diagnostic Gaps Card */}
                <Card className="p-4 bg-[#F3F6F8] border border-[#E8E8E8] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
                    <AlertCircle className="w-4 h-4" />
                    <span>Areas for Optimization ({weaknesses.length})</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#38434F]">
                    {weaknesses.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#8A6100] flex-shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* AI Bullet Enhancer Section Preview */}
              <AiBulletOptimizer bullets={bulletImprovements} />

              {/* Next Steps: Connect to Skill Gap & Job Match */}
              <Card className="p-4 bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Next Steps: Close Identified Gaps & Match Opportunities
                  </h4>
                  <p className="text-[11px] text-[#56687A] mt-0.5">
                    Use your verified 88% ATS profile to diagnose competency gaps or evaluate job fit against live roles.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to="/skills">
                    <Button size="xs" variant="outline" icon={<Target className="w-3 h-3 text-[#0A66C2]" />}>
                      Skill Gap Matrix
                    </Button>
                  </Link>
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
                  Keywords absent from your resume that appear in over 65% of target backend listings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {missingKeywords.map((kw) => (
                  <div
                    key={kw.name}
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
                    Parsed directly from your uploaded resume into verified competencies.
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  25 Skills Identified
                </Badge>
              </div>

              <div className="space-y-3">
                {Object.entries(extractedSkills).map(([category, skillsList]) => (
                  <div key={category} className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1D2226]">
                      <span>{category}</span>
                      <span className="text-[10px] font-mono text-[#788896]">{skillsList.length} skills</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill) => (
                        <span
                          key={skill}
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
            </Card>
          )}

          {/* TAB 4: EXPERIENCE (STAR REWRITES) */}
          {activeTab === 'experience' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <AiBulletOptimizer bullets={bulletImprovements} />
            </div>
          )}

          {/* TAB 5: PROJECTS SECTION */}
          {activeTab === 'projects' && (
            <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 animate-in fade-in duration-150 shadow-sm">
              <div>
                <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#0A66C2]" />
                  Projects Section Audit
                </h3>
                <p className="text-[11px] text-[#56687A] mt-0.5">
                  Evaluates project descriptions for architectural clarity, live URLs, and tech stack tagging.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1D2226]">Distributed Real-Time Sync Engine</h4>
                      <p className="text-[11px] text-[#0A66C2] font-semibold">Go • WebSockets • Redis • CRDTs</p>
                    </div>
                    <Badge variant="success" size="sm">
                      Strong Impact
                    </Badge>
                  </div>
                  <p className="text-xs text-[#38434F]">
                    "Implemented state replication protocol achieving &lt;25ms sync latency across 5k concurrent connections."
                  </p>
                  <div className="p-2 rounded-lg bg-[#FFF4CC] border border-[#ffe899] text-[11px] text-[#8A6100] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>AI Tip: Add a link to GitHub repo or live system demo to increase ATS credibility score.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1D2226]">AI-Powered Job Application Tracker</h4>
                      <p className="text-[11px] text-[#0A66C2] font-semibold">React • TypeScript • Tailwind CSS • Monaco IDE</p>
                    </div>
                    <Badge variant="brand" size="sm">
                      Production SaaS
                    </Badge>
                  </div>
                  <p className="text-xs text-[#38434F]">
                    "Built full frontend career platform with Monaco coding workspace, ATS scorer, and Kanban tracking."
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 6: EDUCATION SECTION */}
          {activeTab === 'education' && (
            <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0A66C2]" />
                    Education Section Audit
                  </h3>
                  <p className="text-[11px] text-[#56687A] mt-0.5">Accreditation and degree level validation.</p>
                </div>
                <Badge variant="success" size="sm">
                  100% Parsed
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1D2226]">University of Washington</h4>
                    <p className="text-[11px] text-[#56687A]">Bachelor of Science in Computer Science</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700">GPA: 3.8 / 4.0</span>
                </div>
                <div className="text-[11px] text-[#788896] flex items-center gap-2">
                  <span>Graduated: June 2024</span>
                  <span>•</span>
                  <span>Dean's Honor List</span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 7: FORMATTING HEALTH */}
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
                <Badge variant="success" size="sm">
                  Score: 96/100
                </Badge>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Single-Column Linear Hierarchy', status: 'Passed', detail: 'No complex multi-column blocks that confuse parsers.' },
                  { label: 'Standard Section Headings', status: 'Passed', detail: '"Experience", "Projects", "Skills", "Education" properly indexed.' },
                  { label: 'Font & Typography Standards', status: 'Passed', detail: 'Uses web-safe clean system font (Inter/Helvetica compliant).' },
                  { label: 'No Tables, Graphics, or Icons in Data', status: 'Passed', detail: 'Text rendered in raw string buffers without image OCR dependencies.' },
                  { label: 'File Size & Format', status: 'Passed', detail: 'PDF version 1.7, 2.4 MB (well under 5MB enterprise threshold).' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#1D2226]">{item.label}</p>
                      <p className="text-[11px] text-[#788896]">{item.detail}</p>
                    </div>
                    <Badge variant="success" size="sm">
                      {item.status} ✓
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzerPage;
