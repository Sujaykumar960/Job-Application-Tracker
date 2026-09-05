import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Flame,
  Target,
  Trophy,
  Award,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  ExternalLink,
  Code2,
  BookOpen,
  Briefcase,
  Share2,
  Download,
  Eye,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const ProgressPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'student' | 'recruiter'>('student');
  const [activityTimeframe, setActivityTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Daily Activity Data (Hours & Questions over 7 days)
  const dailyActivityData = [
    { day: 'Mon', questions: 6, hours: 2.5, commits: 8 },
    { day: 'Tue', questions: 8, hours: 3.2, commits: 12 },
    { day: 'Wed', questions: 5, hours: 2.0, commits: 5 },
    { day: 'Thu', questions: 11, hours: 4.5, commits: 15 },
    { day: 'Fri', questions: 9, hours: 3.8, commits: 10 },
    { day: 'Sat', questions: 14, hours: 5.2, commits: 18 },
    { day: 'Sun', questions: 7, hours: 2.8, commits: 6 },
  ];

  // Weekly Activity Data (Past 6 Weeks)
  const weeklyActivityData = [
    { week: 'W1 (Jul 25)', questions: 18, hours: 14.5, points: 720 },
    { week: 'W2 (Aug 01)', questions: 22, hours: 16.0, points: 880 },
    { week: 'W3 (Aug 08)', questions: 26, hours: 18.5, points: 1040 },
    { week: 'W4 (Aug 15)', questions: 24, hours: 17.0, points: 960 },
    { week: 'W5 (Aug 22)', questions: 31, hours: 21.0, points: 1240 },
    { week: 'W6 (Aug 29)', questions: 34, hours: 23.5, points: 1360 },
  ];

  // Monthly Activity Data (Past 6 Months)
  const monthlyActivityData = [
    { month: 'Apr', questions: 45, hours: 38, score: 72 },
    { month: 'May', questions: 62, hours: 46, score: 76 },
    { month: 'Jun', questions: 78, hours: 54, score: 80 },
    { month: 'Jul', questions: 95, hours: 62, score: 84 },
    { month: 'Aug', questions: 122, hours: 78, score: 87 },
    { month: 'Sep', questions: 142, hours: 85, score: 91 },
  ];

  // Skill Growth Progression (April to September)
  const skillGrowthData = [
    { month: 'Apr', go: 40, distributed: 30, sql: 55, dsa: 60 },
    { month: 'May', go: 55, distributed: 45, sql: 65, dsa: 72 },
    { month: 'Jun', go: 68, distributed: 58, sql: 75, dsa: 80 },
    { month: 'Jul', go: 78, distributed: 68, sql: 82, dsa: 85 },
    { month: 'Aug', go: 88, distributed: 78, sql: 86, dsa: 90 },
    { month: 'Sep', go: 92, distributed: 88, sql: 90, dsa: 92 },
  ];

  // Resume ATS Growth Over Versions
  const resumeGrowthData = [
    { version: 'v1.0 (Jun)', atsScore: 68, keywordMatch: 62, impactScore: 58 },
    { version: 'v1.2 (Jul)', atsScore: 74, keywordMatch: 70, impactScore: 68 },
    { version: 'v2.0 (Aug)', atsScore: 82, keywordMatch: 82, impactScore: 76 },
    { version: 'v2.4 (Sep)', atsScore: 88, keywordMatch: 92, impactScore: 84 },
  ];

  // Achievements
  const achievements = [
    {
      id: 'ach-1',
      title: '100 Questions Solved',
      desc: 'Solved over 100 algorithmic problems across arrays, trees, graphs, and dynamic programming.',
      date: 'Aug 14, 2026',
      icon: Target,
      color: 'text-[#137333] bg-[#E6F4EA] border-[#c6ecd2]',
      isUnlocked: true,
    },
    {
      id: 'ach-2',
      title: '7 Day Streak',
      desc: 'Maintained 7 consecutive days of code submissions and architectural study.',
      date: 'Aug 20, 2026',
      icon: Flame,
      color: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
      isUnlocked: true,
    },
    {
      id: 'ach-3',
      title: 'Backend Assessment Completed',
      desc: 'Scored 94% on Senior Backend Skills Verification exam (Top 6% nationwide).',
      date: 'Aug 28, 2026',
      icon: Trophy,
      color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      isUnlocked: true,
    },
    {
      id: 'ach-4',
      title: 'ATS Score Improved',
      desc: 'Optimized resume content with quantified STAR metrics, raising ATS compatibility from 68% to 88%.',
      date: 'Sep 01, 2026',
      icon: TrendingUp,
      color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      isUnlocked: true,
    },
  ];

  // Projects Added
  const projects = [
    {
      title: 'Distributed Event Streaming Broker',
      tech: ['Go', 'Kafka', 'Redis', 'Docker'],
      impact: '12k msg/sec throughput with zero message loss and transactional outbox pattern.',
      link: 'https://github.com/alexrivera/distributed-broker',
      date: 'Aug 2026',
    },
    {
      title: 'Sliding-Window Rate Limiter Service',
      tech: ['Go', 'Redis Lua', 'gRPC', 'Protobuf'],
      impact: 'Throttles 45M+ daily requests with atomic Redis scripts and <10ms latency.',
      link: 'https://github.com/alexrivera/go-rate-limiter',
      date: 'Jul 2026',
    },
    {
      title: 'Local-First Issue Tracker UI',
      tech: ['React', 'TypeScript', 'WebSockets', 'Tailwind CSS'],
      impact: 'Sub-200ms initial load, CRDT collaborative sync, and 60fps micro-interactions.',
      link: 'https://github.com/alexrivera/linear-clone',
      date: 'Jun 2026',
    },
    {
      title: 'High-Throughput Telemetry Aggregator',
      tech: ['Python', 'PostgreSQL', 'Docker', 'Grafana'],
      impact: 'Ingests and aggregates microservice latency spans with sharded PostgreSQL partitions.',
      link: 'https://github.com/alexrivera/telemetry-engine',
      date: 'May 2026',
    },
  ];

  // Certifications Added
  const certifications = [
    {
      name: 'AWS Certified Solutions Architect - Associate',
      issuer: 'Amazon Web Services',
      issueDate: 'Jul 2026',
      credentialId: 'AWS-PSA-849204',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation (CNCF)',
      issueDate: 'Aug 2026',
      credentialId: 'CKA-992015-LF',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      name: 'Meta Advanced React & Architecture Certification',
      issuer: 'Meta / Coursera',
      issueDate: 'May 2026',
      credentialId: 'META-REACT-34821',
      badgeColor: 'text-brand-300 bg-brand-500/10 border-brand-500/30',
    },
  ];

  // Career Growth Timeline Milestones
  const timelineMilestones = [
    {
      date: 'Sep 02, 2026',
      title: 'Interview Stage Offer Pipeline Activated',
      category: 'Career Milestone',
      desc: 'Advanced to interview stage with Stripe and Linear. Overall ATS score reached 88% (Top 8%).',
      badge: 'Current Stage',
      badgeVariant: 'brand' as const,
    },
    {
      date: 'Aug 28, 2026',
      title: 'Scored 94% in Senior Backend Skills Assessment',
      category: 'Assessment',
      desc: 'Validated deep competency in Go concurrency patterns, memory models, and PostgreSQL indexing.',
      badge: 'Verified Score',
      badgeVariant: 'success' as const,
    },
    {
      date: 'Aug 20, 2026',
      title: 'Published Distributed Event Streaming Broker',
      category: 'Engineering Portfolio',
      desc: 'Released open-source Kafka message broker implementing transactional outbox semantics.',
      badge: 'Project Launch',
      badgeVariant: 'info' as const,
    },
    {
      date: 'Aug 14, 2026',
      title: 'Passed 100 Solved Algorithmic Problems',
      category: 'DSA Practice',
      desc: 'Completed dynamic programming, graph traversal (BFS/DFS), and monotonic queue tracks with 93.4% accuracy.',
      badge: '100 Club',
      badgeVariant: 'warning' as const,
    },
    {
      date: 'Jul 22, 2026',
      title: 'Earned AWS Solutions Architect Associate Certification',
      category: 'Certification',
      desc: 'Demonstrated proficiency in multi-AZ VPC networks, ECS Fargate containerization, and RDS Aurora.',
      badge: 'AWS Certified',
      badgeVariant: 'brand' as const,
    },
    {
      date: 'Jun 15, 2026',
      title: 'Graduated B.S. in Computer Science (GPA: 3.8/4.0)',
      category: 'Academic',
      desc: 'University of Washington. Dean’s Honor List. Specialization in Distributed Systems & Databases.',
      badge: 'Degree Conferred',
      badgeVariant: 'success' as const,
    },
  ];

  const currentActivityData =
    activityTimeframe === 'daily'
      ? dailyActivityData
      : activityTimeframe === 'weekly'
      ? weeklyActivityData
      : monthlyActivityData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Career Growth & Verified Portfolio"
        description="Chronological engineering milestones, daily practice consistency, ATS resume evolution, and technical competency trajectories."
        badge={
          <Badge variant="brand" size="sm">
            Verified Profile: Alex Rivera
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Student Analytics vs Recruiter Showcase */}
            <div className="flex items-center bg-[#F3F6F8] p-1 rounded-lg border border-[#D9D9D9]">
              <button
                onClick={() => setViewMode('student')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === 'student'
                    ? 'bg-[#0A66C2] text-white shadow-sm'
                    : 'text-[#56687A] hover:text-[#1D2226]'
                }`}
              >
                Student Analytics
              </button>
              <button
                onClick={() => setViewMode('recruiter')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  viewMode === 'recruiter'
                    ? 'bg-[#0A66C2] text-white shadow-sm'
                    : 'text-[#56687A] hover:text-[#1D2226]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Recruiter View</span>
              </button>
            </div>

            <Link to="/learning/code">
              <Button size="sm" variant="primary" icon={<Code2 className="w-3.5 h-3.5" />}>
                Practice Coding
              </Button>
            </Link>

            <Link to="/profile">
              <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" />}
              >
                Public Profile
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. TOP STATS: QUESTIONS, ACCURACY, STREAK, ATS SCORE, PROJECTS, CERTS      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Questions Solved</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] font-mono">142</span>
            <span className="text-[10px] text-[#788896] font-mono">/ 150</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold font-mono">Top 5%</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Coding Streak</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#8A6100] font-mono">14 Days</span>
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          <span className="text-[10px] text-[#8A6100] font-semibold font-mono">Active</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">First-Submit Acc</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-700 font-mono">93.4%</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold font-mono">Verified Tests</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">ATS Score</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#0A66C2] font-mono">88%</span>
            <span className="text-[10px] text-emerald-700 font-mono">+20 pts</span>
          </div>
          <span className="text-[10px] text-[#0A66C2] font-semibold font-mono">FAANG Ready</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Projects Added</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] font-mono">4</span>
            <span className="text-[10px] text-[#788896] font-mono">Live</span>
          </div>
          <span className="text-[10px] text-[#0A66C2] font-semibold font-mono">Distributed</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Certifications</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] font-mono">3</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold font-mono">AWS & CKA</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECHARTS SECTION: ACTIVITY (DAILY/WEEKLY/MONTHLY) & SKILL GROWTH        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Practice Activity Chart (7 Cols) */}
        <Card className="lg:col-span-7 flex flex-col bg-white border border-[#D9D9D9] shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0A66C2]" />
                Engineering Activity & Study Volume
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Practice questions solved & deep study hours
              </p>
            </div>

            {/* Timeframe Toggle: Daily, Weekly, Monthly */}
            <div className="flex items-center bg-[#F3F6F8] p-0.5 rounded-lg border border-[#D9D9D9]">
              {(['daily', 'weekly', 'monthly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActivityTimeframe(tf)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold capitalize transition ${
                    activityTimeframe === tf
                      ? 'bg-[#0A66C2] text-white shadow-sm'
                      : 'text-[#56687A] hover:text-[#1D2226]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                  <XAxis
                    dataKey={activityTimeframe === 'daily' ? 'day' : activityTimeframe === 'weekly' ? 'week' : 'month'}
                    stroke="#788896"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#788896" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="questions"
                    name="Questions Solved"
                    fill="#0A66C2"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="hours"
                    name="Study Hours"
                    fill="#137333"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skill Growth Multi-Line Area Chart (5 Cols) */}
        <Card className="lg:col-span-5 flex flex-col bg-white border border-[#D9D9D9] shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Technical Skill Trajectory (6 Months)
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Competency depth over time (0 - 100%)
              </p>
            </div>
            <Badge variant="brand" size="sm">
              +42% Growth
            </Badge>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={skillGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGo" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0A66C2" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0A66C2" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDist" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#137333" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#137333" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
                  <XAxis dataKey="month" stroke="#788896" fontSize={11} tickLine={false} />
                  <YAxis stroke="#788896" fontSize={11} tickLine={false} domain={[20, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="go"
                    name="Go Concurrency"
                    stroke="#0A66C2"
                    fill="url(#colorGo)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="distributed"
                    name="Distributed Systems"
                    stroke="#137333"
                    fill="url(#colorDist)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="dsa"
                    name="Algorithms (DSA)"
                    stroke="#8A6100"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. RESUME ATS SCORE GROWTH CHART & AUDIT                                   */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Resume ATS Score Evolution (v1.0 to v2.4)
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Impact of STAR bullet point quantification and high-value keyword injection across versions.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#788896]">
              Initial: <strong className="text-[#1D2226]">68%</strong>
            </span>
            <span className="text-[#788896]">→</span>
            <span className="text-emerald-700">
              Current: <strong>88% (+20 pts)</strong>
            </span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={resumeGrowthData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
              <XAxis dataKey="version" stroke="#788896" fontSize={11} tickLine={false} />
              <YAxis stroke="#788896" fontSize={11} tickLine={false} domain={[50, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D9D9D9',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#1D2226',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <Line
                type="monotone"
                dataKey="atsScore"
                name="Overall ATS Score"
                stroke="#0A66C2"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0A66C2' }}
              />
              <Line
                type="monotone"
                dataKey="keywordMatch"
                name="Keyword Density"
                stroke="#137333"
                strokeWidth={2}
                dot={{ r: 3, fill: '#137333' }}
              />
              <Line
                type="monotone"
                dataKey="impactScore"
                name="STAR Metrics Score"
                stroke="#8A6100"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. ACHIEVEMENT CARDS (4 Requested Achievements)                           */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Unlocked Career Milestones & Badges ({achievements.length})
          </span>
          <span className="text-[11px] text-[#788896] font-mono">Next: 250 Questions Solved (142/250)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] hover:border-[#0A66C2]/40 transition flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${ach.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-[#788896]">{ach.date}</span>
                  </div>

                  <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                    {ach.title}
                  </h4>
                  <p className="text-[11px] text-[#56687A] leading-relaxed">{ach.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] text-[10px] font-mono">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Unlocked
                  </span>
                  <span className="text-[#788896]">Verified ✓</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PROJECTS & CERTIFICATIONS PORTFOLIO                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Projects (7 Cols) */}
        <Card className="lg:col-span-7 space-y-3 p-4 bg-white border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div>
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                Featured Production Projects ({projects.length})
              </h3>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Architectural proofs-of-concept attached to recruiter profile
              </p>
            </div>
            <Badge variant="brand" size="sm">
              4 Live Repos
            </Badge>
          </div>

          <div className="space-y-2.5">
            {projects.map((proj) => (
              <div
                key={proj.title}
                className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-2 hover:border-[#D9D9D9] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#1D2226]">{proj.title}</h4>
                    <p className="text-[11px] text-[#38434F] mt-0.5 leading-relaxed">
                      {proj.impact}
                    </p>
                  </div>
                  <a
                    href={proj.link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[#788896] hover:text-[#0A66C2] transition"
                    title="View GitHub Repository"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {proj.tech.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 rounded bg-white text-[#56687A] border border-[#D9D9D9] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="text-[#788896] font-mono">{proj.date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Certifications (5 Cols) */}
        <Card className="lg:col-span-5 space-y-3 p-4 bg-white border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
            <div>
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Certifications ({certifications.length})
              </h3>
              <p className="text-[11px] text-[#56687A] mt-0.5">Third-party accredited credentials</p>
            </div>
            <Badge variant="success" size="sm">
              Verified
            </Badge>
          </div>

          <div className="space-y-2.5">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#1D2226] leading-tight">{cert.name}</h4>
                  <Badge variant="neutral" size="sm">
                    {cert.issueDate}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#56687A]">{cert.issuer}</p>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-[#788896]">
                  <span>ID: {cert.credentialId}</span>
                  <span className="text-emerald-700 flex items-center gap-0.5 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 6. PROFESSIONAL CAREER-GROWTH TIMELINE (Chronological Journey)             */}
      {/* ========================================================================= */}
      <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#0A66C2]" />
              Professional Career-Growth Timeline
            </h3>
            <p className="text-[11px] text-[#56687A] mt-0.5">
              Verified chronological trajectory from computer science degree to FAANG interview pipelines.
            </p>
          </div>
          <Badge variant="brand" size="sm">
            Recruiter Verified
          </Badge>
        </div>

        {/* Vertical Timeline Tree */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E8E8]">
          {timelineMilestones.map((m, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Bullet Dot */}
              <div
                className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white transition ${
                  idx === 0
                    ? 'bg-[#0A66C2] ring-4 ring-[#0A66C2]/20'
                    : 'bg-[#D9D9D9] group-hover:bg-[#0A66C2]'
                }`}
              />

              <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] group-hover:border-[#0A66C2]/40 transition space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1D2226]">{m.title}</span>
                    <Badge variant={m.badgeVariant} size="sm">
                      {m.badge}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-[#788896]">{m.date}</span>
                </div>

                <p className="text-xs text-[#38434F] leading-relaxed">{m.desc}</p>
                <span className="text-[10px] font-mono text-[#788896] block pt-0.5">
                  Category: {m.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProgressPage;
