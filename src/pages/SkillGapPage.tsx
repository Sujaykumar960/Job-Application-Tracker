import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';
import {
  Target,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Database,
  Layers,
  Server,
  Cloud,
  Clock,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

export const SkillGapPage: React.FC = () => {
  const [targetTrack, setTargetTrack] = useState<'backend' | 'fullstack' | 'distributed'>('distributed');

  // Radar Chart: Candidate vs Market Expectation
  const radarData = [
    { subject: 'Distributed Systems', candidate: 88, market: 85 },
    { subject: 'System Design', candidate: 82, market: 90 },
    { subject: 'Algorithms & DSA', candidate: 92, market: 85 },
    { subject: 'Cloud & DevOps', candidate: 70, market: 88 },
    { subject: 'Databases & Storage', candidate: 90, market: 85 },
    { subject: 'Frontend Tech', candidate: 85, market: 70 },
  ];

  // Category Proficiency Progress Data
  const categoryProficiency = [
    { name: 'Core Languages (Go, Python, TS)', score: 94, level: 'Expert', verified: true },
    { name: 'Databases & Storage (Postgres, Redis)', score: 88, level: 'Advanced', verified: true },
    { name: 'System Design & Concurrency', score: 84, level: 'Advanced', verified: true },
    { name: 'Web & UI (React, Next.js, Tailwind)', score: 92, level: 'Expert', verified: true },
    { name: 'Cloud & Kubernetes (ECS, K8s, S3)', score: 72, level: 'Intermediate', verified: false },
    { name: 'Event Streaming (Kafka, RabbitMQ)', score: 68, level: 'Intermediate', verified: false },
  ];

  // Current Skills with Detailed Levels & Progress Bars
  const currentSkills = [
    { name: 'Go (Golang)', category: 'Languages', level: 'Advanced', percent: 92, verified: true },
    { name: 'TypeScript', category: 'Languages', level: 'Expert', percent: 95, verified: true },
    { name: 'Python', category: 'Languages', level: 'Advanced', percent: 88, verified: true },
    { name: 'PostgreSQL', category: 'Databases', level: 'Advanced', percent: 89, verified: true },
    { name: 'React', category: 'Frameworks', level: 'Expert', percent: 94, verified: true },
    { name: 'Docker', category: 'DevOps', level: 'Proficient', percent: 82, verified: true },
    { name: 'Redis', category: 'Databases', level: 'Proficient', percent: 80, verified: true },
    { name: 'Node.js', category: 'Frameworks', level: 'Advanced', percent: 86, verified: true },
  ];

  // Missing Skills with Priority & Connected Learning Recommendations
  const missingSkills = [
    {
      id: 'gap-1',
      skill: 'Kafka Partitioning & Consumer Groups',
      category: 'Distributed Systems',
      priority: 'High' as const,
      requiredBy: 'Stripe, Datadog, Netflix',
      estHours: '3.5 hrs',
      moduleTitle: 'Event-Driven Microservices with Kafka',
      moduleSlug: '/learning',
      rationale:
        'Flagged in 75% of your target distributed systems backend roles. Essential for high-throughput messaging.',
    },
    {
      id: 'gap-2',
      skill: 'Distributed Rate Limiting (Redis Lua)',
      category: 'Caching & Concurrency',
      priority: 'High' as const,
      requiredBy: 'Stripe, Linear, Datadog',
      estHours: '2.5 hrs',
      moduleTitle: 'Distributed Rate Limiting Blueprint',
      moduleSlug: '/learning',
      rationale:
        'Standard onsite systems question. Involves sliding-window log algorithms and atomic Redis Lua evaluation.',
    },
    {
      id: 'gap-3',
      skill: 'Kubernetes Multi-Pod Orchestration',
      category: 'Cloud & Infrastructure',
      priority: 'Medium' as const,
      requiredBy: 'Netflix, Vercel, Datadog',
      estHours: '4.0 hrs',
      moduleTitle: 'Kubernetes Production Deployments',
      moduleSlug: '/learning',
      rationale:
        'Required for understanding zero-downtime rolling updates, ingress routing, and Helm chart manifests.',
    },
    {
      id: 'gap-4',
      skill: 'OpenTelemetry & Distributed Tracing',
      category: 'Observability',
      priority: 'Medium' as const,
      requiredBy: 'Datadog, Stripe',
      estHours: '2.0 hrs',
      moduleTitle: 'System Observability with OpenTelemetry',
      moduleSlug: '/learning',
      rationale:
        'Needed for instrumenting microservice spans, propagation headers, and debugging latency anomalies.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Skill Gap Analysis & Readiness Roadmap"
        description="Diagnose missing competencies against market expectations and follow structured remediation paths."
        badge={
          <Badge variant="brand" size="sm">
            Target: Distributed Systems
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/job-match">
              <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-brand-400" />}>
                Run Job Match
              </Button>
            </Link>
            <Link to="/learning">
              <Button size="sm" variant="primary" icon={<BookOpen className="w-3.5 h-3.5" />}>
                Open Dev Learning Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. KPI SUMMARY BANNER                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#788896]">Total Profile Skills</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#1D2226] font-mono">25</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Verified ✓</span>
          </div>
          <p className="text-[10px] text-[#788896]">Extracted from resume & tests</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-emerald-700">Market Alignment</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700 font-mono">88%</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Strong</span>
          </div>
          <p className="text-[10px] text-[#788896]">Above 80% interview cutoff</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#8A6100]">Critical Skill Gaps</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#8A6100] font-mono">4</span>
            <span className="text-[10px] text-[#B3261E] font-semibold">2 High Priority</span>
          </div>
          <p className="text-[10px] text-[#788896]">Across target company specs</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#0A66C2]">Remediation Modules</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0A66C2] font-mono">4 Ready</span>
            <span className="text-[10px] text-[#0A66C2] font-semibold">~12 hrs total</span>
          </div>
          <p className="text-[10px] text-[#788896]">Connected in Dev Hub</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CHARTS: RADAR CHART + PROFICIENCY BREAKDOWN                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar Chart: Candidate vs Market */}
        <Card className="lg:col-span-6 flex flex-col bg-white border border-[#D9D9D9] shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#0A66C2]" />
                Competency Radar: Candidate vs. Market Expectation
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Blue = Your Verified Depth • Emerald = FAANG Expectations
              </p>
            </div>
            <Badge variant="brand" size="sm">
              6 Dimensions
            </Badge>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#D9D9D9" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#56687A', fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#D9D9D9"
                    tick={{ fill: '#788896', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                    }}
                  />
                  <Radar
                    name="Your Skill Depth"
                    dataKey="candidate"
                    stroke="#0A66C2"
                    fill="#0A66C2"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Market Expectation"
                    dataKey="market"
                    stroke="#137333"
                    fill="#137333"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#56687A] pt-2 border-t border-[#E8E8E8]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2]" /> You (88% Avg)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Market Threshold (85% Avg)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Category Proficiency Progress Bars */}
        <Card className="lg:col-span-6 flex flex-col bg-white border border-[#D9D9D9] shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Category Skill Depth & Proficiency
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Evaluated from coding submissions and verified project code
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 space-y-3.5">
            {categoryProficiency.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1D2226]">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9]">
                      {cat.level}
                    </span>
                    <span className="font-mono font-bold text-[#0A66C2] text-xs">
                      {cat.score}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#F3F6F8] border border-[#E8E8E8] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      cat.score >= 90
                        ? 'bg-emerald-600'
                        : cat.score >= 80
                        ? 'bg-[#0A66C2]'
                        : 'bg-[#8A6100]'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. MISSING SKILLS WITH PRIORITY & RECOMMENDED LEARNING                      */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Prioritized Skill Gaps & Actionable Learning Roadmap
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Target competencies required by your active applications with direct learning links.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            4 Gaps to Close
          </Badge>
        </div>

        <div className="space-y-3">
          {missingSkills.map((gap) => (
            <div
              key={gap.id}
              className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] hover:border-[#0A66C2]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 min-w-0 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      gap.priority === 'High'
                        ? 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]'
                        : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]'
                    }`}
                  >
                    {gap.priority} Priority
                  </span>
                  <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                    {gap.skill}
                  </h4>
                  <span className="text-[10px] text-[#788896] font-mono">• {gap.category}</span>
                </div>

                <p className="text-[11px] text-[#38434F] leading-relaxed">{gap.rationale}</p>

                <div className="flex items-center gap-3 text-[10px] text-[#788896] pt-0.5">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-[#788896]" />
                    Required by: <strong className="text-[#1D2226] font-semibold">{gap.requiredBy}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#788896]" />
                    Est. Time: {gap.estHours}
                  </span>
                </div>
              </div>

              {/* Recommended Learning Action */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E8E8]">
                <Link to={gap.moduleSlug}>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs"
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                  >
                    Start in Dev Hub
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. CURRENT VERIFIED SKILLS GRID WITH PROGRESS BARS                        */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Current Profile Technical Skills
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Verified competencies from your profile and ATS assessment.
            </p>
          </div>
          <Badge variant="success" size="sm">
            {currentSkills.length} Verified
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {currentSkills.map((sk) => (
            <div
              key={sk.name}
              className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1D2226]">{sk.name}</span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  {sk.percent}%
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-white border border-[#D9D9D9] overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${sk.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#788896]">
                <span>{sk.category}</span>
                <span className="font-semibold text-[#38434F]">{sk.level}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SkillGapPage;
