import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Briefcase,
  Users,
  Award,
  XCircle,
  FileCheck,
  Target,
  Code2,
  Flame,
  Calendar,
  Clock,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  BookOpen,
  ChevronRight,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [upcomingTab, setUpcomingTab] = useState<'all' | 'interviews' | 'deadlines' | 'followups'>('all');

  // --- 1. APPLICATION STATUS DATA ---
  const applicationStatusData = [
    { name: 'Applied', value: 7, color: '#0A66C2' },
    { name: 'Interviewing', value: 5, color: '#7C83FD' },
    { name: 'Offered', value: 2, color: '#12B886' },
    { name: 'Rejected', value: 6, color: '#E6395A' },
    { name: 'Wishlist', value: 4, color: '#9AA5B1' },
  ];

  // --- 2. WEEKLY LEARNING ACTIVITY ---
  const weeklyLearningData = [
    { day: 'Mon', problems: 3, hours: 2.5 },
    { day: 'Tue', problems: 5, hours: 3.8 },
    { day: 'Wed', problems: 2, hours: 1.5 },
    { day: 'Thu', problems: 4, hours: 3.2 },
    { day: 'Fri', problems: 6, hours: 4.2 },
    { day: 'Sat', problems: 8, hours: 5.5 },
    { day: 'Sun', problems: 4, hours: 2.0 },
  ];

  // --- 3. SKILL GROWTH DATA ---
  const skillGrowthData = [
    { month: 'Apr', dsa: 42, systemDesign: 35, backendInfra: 48 },
    { month: 'May', dsa: 55, systemDesign: 44, backendInfra: 58 },
    { month: 'Jun', dsa: 68, systemDesign: 59, backendInfra: 67 },
    { month: 'Jul', dsa: 76, systemDesign: 70, backendInfra: 80 },
    { month: 'Aug', dsa: 84, systemDesign: 78, backendInfra: 88 },
    { month: 'Sep', dsa: 92, systemDesign: 86, backendInfra: 94 },
  ];

  // --- 4. UPCOMING PIPELINE ITEMS ---
  const upcomingItems = [
    {
      id: 'up-1',
      type: 'interviews',
      title: 'Distributed Systems Architecture Loop',
      company: 'Stripe',
      date: 'Tomorrow, Sep 4 • 10:00 AM PST',
      badge: 'Google Meet',
      badgeVariant: 'brand' as const,
      urgency: 'high',
      linkText: 'Prep Notes',
      path: '/applications',
    },
    {
      id: 'up-2',
      type: 'interviews',
      title: 'Full Stack Technical Deep Dive',
      company: 'Linear',
      date: 'Mon, Sep 7 • 2:00 PM PST',
      badge: 'Zoom',
      badgeVariant: 'brand' as const,
      urgency: 'medium',
      linkText: 'Prep Notes',
      path: '/applications',
    },
    {
      id: 'up-3',
      type: 'deadlines',
      title: 'Systems Take-Home Challenge Due',
      company: 'Vercel',
      date: 'Due in 2 days (Sep 5, 11:59 PM)',
      badge: 'Assessment',
      badgeVariant: 'warning' as const,
      urgency: 'high',
      linkText: 'Submit Link',
      path: '/applications',
    },
    {
      id: 'up-4',
      type: 'deadlines',
      title: 'Offer Letter Formal Acceptance',
      company: 'Datadog',
      date: 'Due in 8 days (Sep 12)',
      badge: '$175k Base',
      badgeVariant: 'success' as const,
      urgency: 'medium',
      linkText: 'Review Comp',
      path: '/applications',
    },
    {
      id: 'up-5',
      type: 'followups',
      title: 'Send Thank-You Note to Director of Eng',
      company: 'Figma',
      date: 'Scheduled for today',
      badge: 'Action Required',
      badgeVariant: 'info' as const,
      urgency: 'high',
      linkText: 'Send Note',
      path: '/messages',
    },
    {
      id: 'up-6',
      type: 'followups',
      title: 'Follow Up with Recruiter on Onsite Outcome',
      company: 'Airbnb',
      date: 'Scheduled for Sep 6',
      badge: 'Awaiting Feedback',
      badgeVariant: 'neutral' as const,
      urgency: 'low',
      linkText: 'Follow Up',
      path: '/messages',
    },
  ];

  const filteredUpcoming =
    upcomingTab === 'all'
      ? upcomingItems
      : upcomingItems.filter((item) => item.type === upcomingTab);

  // --- 5. RECOMMENDED ACTIONS ---
  const recommendedActions = [
    {
      id: 'rec-1',
      title: 'Improve ATS Resume Score',
      category: 'ATS Engine',
      categoryColor: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      description:
        'Add quantified throughput and latency metrics to 3 project bullets to elevate your score from 88% to 95%.',
      impact: '+7% ATS boost',
      actionLabel: 'Optimize Bullets',
      actionPath: '/resume',
      icon: FileCheck,
    },
    {
      id: 'rec-2',
      title: 'Learn Missing Skill: Distributed Rate Limiting',
      category: 'System Design',
      categoryColor: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
      description:
        'Sliding window Redis Lua script patterns are flagged in 4 of your target applications (Stripe, Linear, Datadog).',
      impact: 'Closes 4 gaps',
      actionLabel: 'Launch Module',
      actionPath: '/learning',
      icon: BookOpen,
    },
    {
      id: 'rec-3',
      title: 'Solve High-Frequency DSA: LRU Cache',
      category: 'Monaco IDE',
      categoryColor: 'text-[#137333] bg-[#E6F4EA] border-[#c6ecd2]',
      description:
        'Asked in 62% of Stripe and Datadog backend loops. Implement with Doubly Linked List and Hash Map.',
      impact: 'Medium • Top Pick',
      actionLabel: 'Solve in IDE',
      actionPath: '/learning',
      icon: Code2,
    },
    {
      id: 'rec-4',
      title: 'Apply to Senior Infrastructure Engineer @ Stripe',
      category: 'Job Match',
      categoryColor: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
      description:
        'Your profile has a 94% verified match score for Go, distributed systems, and PostgreSQL requirements.',
      impact: '94% Match Score',
      actionLabel: '1-Click Track',
      actionPath: '/jobs',
      icon: Briefcase,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="CareerX Command Center"
        description={`Welcome back, ${user?.name || 'Engineer'}. Here is your live pipeline status, learning progress, and prioritized career actions.`}
        badge={
          <Badge variant="brand" size="sm">
            Live Workspace
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/applications">
              <Button size="xs" variant="primary" icon={<Briefcase className="w-3.5 h-3.5" />}>
                Add Application
              </Button>
            </Link>
            <Link to="/resume">
              <Button size="xs" variant="outline" icon={<FileCheck className="w-3.5 h-3.5" />}>
                ATS Scorer
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. KEY METRIC COUNTERS (8 items) - 4-Col Laptop, 8-Col Desktop Grid       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 laptop-lg:grid-cols-8 gap-2.5">
        {/* 1. Total applications */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#56687A]">
            <span className="text-[11px] font-semibold text-[#56687A]">Total Apps</span>
            <Briefcase className="w-3.5 h-3.5 text-[#56687A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#1D2226] tracking-tight">24</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">Active pipeline</p>
          </div>
        </Card>

        {/* 2. Interviews */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">Interviews</span>
            <Users className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">5</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">2 this week</p>
          </div>
        </Card>

        {/* 3. Offers */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#12B886]">Offers</span>
            <Award className="w-3.5 h-3.5 text-[#12B886]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#12B886] tracking-tight">2</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">$175k-$210k</p>
          </div>
        </Card>

        {/* 4. Rejected applications */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#E6395A]">Rejected</span>
            <XCircle className="w-3.5 h-3.5 text-[#E6395A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#E6395A] tracking-tight">6</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">25% exit rate</p>
          </div>
        </Card>

        {/* 5. ATS score */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">ATS Score</span>
            <FileCheck className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">
              {user?.atsScore || 88}%
            </div>
            <p className="text-[10px] text-[#0A66C2] font-medium mt-0.5 truncate">Top 10% tier</p>
          </div>
        </Card>

        {/* 6. Average job match */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#0A66C2]">Avg Match</span>
            <Target className="w-3.5 h-3.5 text-[#0A66C2]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#0A66C2] tracking-tight">91%</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">Across saved roles</p>
          </div>
        </Card>

        {/* 7. Questions solved */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#7C83FD]">Solved</span>
            <Code2 className="w-3.5 h-3.5 text-[#7C83FD]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#1D2226] tracking-tight">54</div>
            <p className="text-[10px] text-[#788896] mt-0.5 truncate">32 Med • 12 Hard</p>
          </div>
        </Card>

        {/* 8. Current coding streak */}
        <Card className="p-3 bg-white border border-[#D9D9D9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#F5A623]">Streak</span>
            <Flame className="w-3.5 h-3.5 text-[#F5A623] animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-[#F5A623] tracking-tight">14d 🔥</div>
            <p className="text-[10px] text-[#12B886] font-medium mt-0.5 truncate">Active today</p>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECHARTS ANALYTICS: Status, Weekly Learning, Skill Growth (3 Columns)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Application Status (Donut Breakdown) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#0A66C2]" />
                Application Pipeline
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">24 total opportunities tracked</p>
            </div>
            <Link to="/applications" className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5">
              Tracker <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Pie
                    data={applicationStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {applicationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-lg font-extrabold text-[#1D2226]">24</span>
                <span className="text-[10px] text-[#788896] font-mono">Apps</span>
              </div>
            </div>

            {/* Legend pills */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#E8E8E8] text-[10px]">
              {applicationStatusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[#56687A] truncate">{s.name}:</span>
                  <span className="text-[#1D2226] font-mono font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Weekly Learning Activity (Bar Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#12B886]" />
                Weekly Learning Activity
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">32 problems • 23.7 hrs logged</p>
            </div>
            <Badge variant="success" size="sm">
              +18% vs LW
            </Badge>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyLearningData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                    formatter={(val: number) => [`${val} solved`, 'Problems']}
                  />
                  <Bar dataKey="problems" fill="#0A66C2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#56687A] pt-2 border-t border-[#E8E8E8]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0A66C2]" /> Problems Solved
              </span>
              <span className="font-mono text-[#12B886] font-semibold">Peak: Saturday (8)</span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Skill Growth Over Time (Area Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#0A66C2]" />
                Engineering Skill Growth
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">Evaluated across 6 months</p>
            </div>
            <Link to="/progress" className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5">
              Radars <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={skillGrowthData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDsa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C83FD" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7C83FD" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBackend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12B886" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#12B886" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[30, 100]}
                    tick={{ fill: '#56687A', fontSize: 10 }}
                    axisLine={{ stroke: '#E8E8E8' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#1D2226',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="backendInfra"
                    stroke="#12B886"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBackend)"
                    name="Backend Infra"
                  />
                  <Area
                    type="monotone"
                    dataKey="dsa"
                    stroke="#7C83FD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDsa)"
                    name="DSA Mastery"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#56687A] pt-2 border-t border-[#E8E8E8]">
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#12B886]" /> Backend: 94%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#7C83FD]" /> DSA: 92%
                </span>
              </span>
              <span className="text-[#12B886] font-semibold font-mono">FAANG Ready</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. DUAL SECTION: Upcoming Pipeline & AI Recommended Actions               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* --- LEFT: UPCOMING (Interviews, Application Deadlines, Follow-ups) --- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0A66C2]" />
                Upcoming Schedule & Deadlines
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Upcoming rounds, take-homes, and follow-ups
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F3F6F8] p-0.5 rounded-lg border border-[#D9D9D9]">
              {(['all', 'interviews', 'deadlines', 'followups'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUpcomingTab(tab)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize transition ${
                    upcomingTab === tab
                      ? 'bg-[#0A66C2] text-white shadow-sm'
                      : 'text-[#56687A] hover:text-[#1D2226]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-3 space-y-2.5 flex-1">
            {filteredUpcoming.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#F3F6F8]/60 border border-[#E8E8E8] hover:border-[#D9D9D9] hover:bg-[#F3F6F8] transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      item.type === 'interviews'
                        ? 'bg-[#E8F3FF] border-[#d0e6fc] text-[#0A66C2]'
                        : item.type === 'deadlines'
                        ? 'bg-[#FFF4CC] border-[#ffe899] text-[#8A6100]'
                        : 'bg-[#E8F3FF] border-[#d0e6fc] text-[#0A66C2]'
                    }`}
                  >
                    {item.type === 'interviews' ? (
                      <Users className="w-3.5 h-3.5" />
                    ) : item.type === 'deadlines' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-[#1D2226] truncate group-hover:text-[#0A66C2] transition">
                        {item.company}
                      </h4>
                      <span className="text-[10px] text-[#D9D9D9]">•</span>
                      <span className="text-[11px] text-[#56687A] truncate">{item.title}</span>
                    </div>
                    <p className="text-[10px] text-[#788896] flex items-center gap-1 mt-0.5">
                      <span>{item.date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={item.badgeVariant} size="sm">
                    {item.badge}
                  </Badge>
                  <Link to={item.path}>
                    <Button size="xs" variant="ghost" className="h-6 px-1.5 text-[10px]">
                      {item.linkText}
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* --- RIGHT: RECOMMENDED ACTIONS (ATS, Skills, Questions, Jobs) --- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                AI Recommended Actions
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                High-leverage interventions to maximize placement probability
              </p>
            </div>
            <Badge variant="warning" size="sm">
              4 Pending
            </Badge>
          </CardHeader>

          <CardContent className="p-3 space-y-2.5 flex-1">
            {recommendedActions.map((rec) => {
              const Icon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-[#F3F6F8]/60 border border-[#E8E8E8] hover:border-[#0A66C2]/40 hover:bg-[#F3F6F8] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#D9D9D9] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#56687A] group-hover:text-[#0A66C2] group-hover:border-[#0A66C2]/40 transition">
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${rec.categoryColor}`}>
                          {rec.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#1D2226]">{rec.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#56687A] leading-snug">{rec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E8E8E8]">
                    <span className="text-[10px] font-mono font-semibold text-[#12B886]">
                      {rec.impact}
                    </span>
                    <Link to={rec.actionPath}>
                      <Button size="xs" variant="primary" className="h-6 text-[10px] px-2">
                        {rec.actionLabel}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
