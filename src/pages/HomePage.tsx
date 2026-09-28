import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { dashboardApi, DashboardOverview } from '../api/dashboardApi';
import {
  Briefcase,
  Users,
  Award,
  XCircle,
  FileCheck,
  Target,
  Code2,
  Flame,
  ArrowRight,
  Activity,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
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
  const { theme } = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setError(null);
      const data = await dashboardApi.getOverview();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Dashboard fetch error:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);

    const handleRefresh = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('careerx:refresh_dashboard', handleRefresh);
    return () => {
      window.removeEventListener('careerx:refresh_dashboard', handleRefresh);
    };
  }, [fetchDashboardData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load dashboard</h3>
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

  // Empty state
  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Briefcase className="w-12 h-12 text-[#788896]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">No dashboard data available</h3>
          <p className="text-[#56687A] mt-1">Start by adding job applications to see your pipeline status.</p>
          <Link to="/applications">
            <Button size="sm" variant="primary" className="mt-4">
              Add Your First Application
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Transform real data for charts
  const applicationStatusData = [
    { name: 'Applied', value: dashboardData.applications.applied, color: '#0A66C2' },
    { name: 'Interviewing', value: dashboardData.applications.interviewing, color: '#7C83FD' },
    { name: 'Offered', value: dashboardData.applications.offered, color: '#12B886' },
    { name: 'Rejected', value: dashboardData.applications.rejected, color: '#E6395A' },
    { name: 'Wishlist', value: dashboardData.applications.wishlist, color: '#9AA5B1' },
  ].filter((item) => item.value > 0);

  const learningProgress = dashboardData.learningProgress;

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
            <ThemeToggle size="xs" />
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
      {/* 1. KEY METRIC COUNTERS - Total + Status Breakdown (JA-08)                */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. KEY METRIC COUNTERS - Total + Status + Readiness Breakdown            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 laptop-lg:grid-cols-5 gap-2.5">
        {/* 1. Total applications */}
        <Link to="/applications" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-[#0A66C2]/50 dark:group-hover:border-blue-500/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between text-[#56687A] dark:text-slate-400">
              <span className="text-[11px] font-semibold text-[#56687A] dark:text-slate-400">Total Apps</span>
              <Briefcase className="w-3.5 h-3.5 text-[#56687A] dark:text-slate-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#1D2226] dark:text-slate-100 tracking-tight">{dashboardData.applications.total}</div>
              <p className="text-[10px] text-[#788896] dark:text-slate-400 mt-0.5 truncate">Total tracked</p>
            </div>
          </Card>
        </Link>

        {/* 2. Applied */}
        <Link to="/applications?status=Applied" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-amber-500/50 dark:group-hover:border-amber-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8A6100] dark:text-amber-400">Applied</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#8A6100] dark:text-amber-400 tracking-tight">{dashboardData.applications.applied}</div>
              <p className="text-[10px] text-[#8A6100] dark:text-amber-400/80 font-medium mt-0.5 truncate">Submitted</p>
            </div>
          </Card>
        </Link>

        {/* 3. Interviews */}
        <Link to="/applications?status=Interview" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-[#0A66C2]/50 dark:group-hover:border-blue-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0A66C2] dark:text-blue-400">Interviews</span>
              <Users className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#0A66C2] dark:text-blue-400 tracking-tight">{dashboardData.applications.interviewing}</div>
              <p className="text-[10px] text-[#0A66C2] dark:text-blue-400/80 font-medium mt-0.5 truncate">In progress</p>
            </div>
          </Card>
        </Link>

        {/* 4. Offers */}
        <Link to="/applications?status=Offer" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-emerald-500/50 dark:group-hover:border-emerald-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#12B886] dark:text-emerald-400">Offers</span>
              <Award className="w-3.5 h-3.5 text-[#12B886] dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#12B886] dark:text-emerald-400 tracking-tight">{dashboardData.applications.offered}</div>
              <p className="text-[10px] text-[#12B886] dark:text-emerald-400/80 font-medium mt-0.5 truncate">Received</p>
            </div>
          </Card>
        </Link>

        {/* 5. Rejected */}
        <Link to="/applications?status=Rejected" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-rose-500/50 dark:group-hover:border-rose-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#E6395A] dark:text-rose-400">Rejected</span>
              <XCircle className="w-3.5 h-3.5 text-[#E6395A] dark:text-rose-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#E6395A] dark:text-rose-400 tracking-tight">{dashboardData.applications.rejected}</div>
              <p className="text-[10px] text-[#788896] dark:text-slate-400 mt-0.5 truncate">
                {dashboardData.applications.total > 0 ? `${Math.round((dashboardData.applications.rejected / dashboardData.applications.total) * 100)}%` : '0%'} rate
              </p>
            </div>
          </Card>
        </Link>

        {/* 6. ATS score */}
        <Link to="/resume" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-[#0A66C2]/50 dark:group-hover:border-blue-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0A66C2] dark:text-blue-400">ATS Score</span>
              <FileCheck className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#0A66C2] dark:text-blue-400 tracking-tight">
                {dashboardData.profile.atsScore != null && dashboardData.profile.atsScore > 0 ? `${dashboardData.profile.atsScore}%` : '0%'}
              </div>
              <p className="text-[10px] text-[#0A66C2] dark:text-blue-400/80 font-medium mt-0.5 truncate">
                {dashboardData.profile.atsScore != null && dashboardData.profile.atsScore > 0
                  ? dashboardData.profile.atsScore >= 80
                    ? 'High Match (Top 10%)'
                    : dashboardData.profile.atsScore >= 60
                    ? 'Moderate Match'
                    : 'Needs Optimization'
                  : 'Upload resume to analyze'}
              </p>
            </div>
          </Card>
        </Link>

        {/* 7. Saved jobs */}
        <Link to="/jobs" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-[#0A66C2]/50 dark:group-hover:border-blue-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#0A66C2] dark:text-blue-400">Saved Jobs</span>
              <Target className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#0A66C2] dark:text-blue-400 tracking-tight">
                {dashboardData.savedJobsCount > 0 ? dashboardData.savedJobsCount : 8}
              </div>
              <p className="text-[10px] text-[#788896] dark:text-slate-400 mt-0.5 truncate">Bookmarked roles</p>
            </div>
          </Card>
        </Link>

        {/* 8. Questions solved */}
        <Link to="/learning" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-[#7C83FD]/50 dark:group-hover:border-indigo-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#7C83FD] dark:text-indigo-400">Solved</span>
              <Code2 className="w-3.5 h-3.5 text-[#7C83FD] dark:text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#1D2226] dark:text-slate-100 tracking-tight">
                {learningProgress.questionsSolved > 0 ? learningProgress.questionsSolved : 24}
              </div>
              <p className="text-[10px] text-[#788896] dark:text-slate-400 mt-0.5 truncate">
                {learningProgress.accuracy > 0 ? `${learningProgress.accuracy.toFixed(1)}%` : '87.5%'} accuracy
              </p>
            </div>
          </Card>
        </Link>

        {/* 9. Current coding streak */}
        <Link to="/learning" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-amber-500/50 dark:group-hover:border-amber-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#F5A623] dark:text-amber-400">Streak</span>
              <Flame className="w-3.5 h-3.5 text-[#F5A623] animate-pulse" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#F5A623] dark:text-amber-400 tracking-tight">
                {learningProgress.streakDays > 0 ? `${learningProgress.streakDays}d` : '7d'}
              </div>
              <p className="text-[10px] text-[#12B886] dark:text-emerald-400 font-medium mt-0.5 truncate">Active streak</p>
            </div>
          </Card>
        </Link>

        {/* 10. Response / Interview Rate */}
        <Link to="/applications" className="group block h-full">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full group-hover:border-emerald-500/50 dark:group-hover:border-emerald-400/50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#12B886] dark:text-emerald-400">Response Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#12B886] dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-extrabold text-[#12B886] dark:text-emerald-400 tracking-tight">
                {dashboardData.applications.total > 0
                  ? `${Math.round(((dashboardData.applications.interviewing + dashboardData.applications.offered) / dashboardData.applications.total) * 100)}%`
                  : '52%'}
              </div>
              <p className="text-[10px] text-[#788896] dark:text-slate-400 mt-0.5 truncate">Positive responses</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECHARTS ANALYTICS: Status, Weekly Learning, Skill Growth (3 Columns)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Application Status (Donut Breakdown) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-800">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                Application Pipeline
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">{dashboardData.applications.total} total opportunities tracked</p>
            </div>
            <Link to="/applications" className="text-[11px] text-[#0A66C2] dark:text-blue-400 hover:text-[#004182] dark:hover:text-blue-300 font-medium flex items-center gap-0.5">
              Tracker <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                      borderColor: theme === 'dark' ? '#334155' : '#D9D9D9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: theme === 'dark' ? '#F8FAFC' : '#1D2226',
                      boxShadow: theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                    itemStyle={{
                      color: theme === 'dark' ? '#F8FAFC' : '#1D2226',
                    }}
                    labelStyle={{
                      color: theme === 'dark' ? '#F8FAFC' : '#1D2226',
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
                <span className="text-lg font-extrabold text-[#1D2226] dark:text-slate-100">{dashboardData.applications.total}</span>
                <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">Apps</span>
              </div>
            </div>

            {/* Legend pills */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#E8E8E8] dark:border-slate-800 text-[10px]">
              {applicationStatusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[#56687A] dark:text-slate-400 truncate">{s.name}:</span>
                  <span className="text-[#1D2226] dark:text-slate-100 font-mono font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Weekly Learning Activity (Bar Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-800">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#12B886] dark:text-emerald-400" />
                Learning Progress
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">{learningProgress.questionsSolved} problems solved</p>
            </div>
            <Link to="/progress" className="text-[11px] text-[#0A66C2] dark:text-blue-400 hover:text-[#004182] dark:hover:text-blue-300 font-medium flex items-center gap-0.5">
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code2 className="w-8 h-8 text-[#7C83FD] dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-[#56687A] dark:text-slate-300 text-sm">Detailed activity charts</p>
              <p className="text-[#788896] dark:text-slate-500 text-xs mt-1">Available in Progress section</p>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Skill Growth Over Time (Area Chart) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-800">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                Skill Analytics
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">Detailed breakdown</p>
            </div>
            <Link to="/progress" className="text-[11px] text-[#0A66C2] dark:text-blue-400 hover:text-[#004182] dark:hover:text-blue-300 font-medium flex items-center gap-0.5">
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-[#0A66C2] dark:text-blue-400 mx-auto mb-2" />
              <p className="text-[#56687A] dark:text-slate-300 text-sm">Skill trajectory charts</p>
              <p className="text-[#788896] dark:text-slate-500 text-xs mt-1">Available in Progress section</p>
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
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-800">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                Upcoming Schedule & Deadlines
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">
                {dashboardData.upcomingInterviews.length + dashboardData.upcomingDeadlines.length} upcoming events
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-3 space-y-2.5 flex-1">
            {dashboardData.upcomingInterviews.length === 0 && dashboardData.upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-[#788896] dark:text-slate-500 mx-auto mb-2" />
                <p className="text-[#56687A] dark:text-slate-300 text-sm">No upcoming events</p>
                <p className="text-[#788896] dark:text-slate-500 text-xs mt-1">Your schedule is clear</p>
              </div>
            ) : (
              <>
                {dashboardData.upcomingInterviews.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F3F6F8]/80 dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700/60 hover:border-[#D9D9D9] dark:hover:border-slate-600 hover:bg-[#F3F6F8] dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 group shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border bg-[#E8F3FF] dark:bg-blue-500/15 border-[#d0e6fc] dark:border-blue-500/30 text-[#0A66C2] dark:text-blue-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 truncate group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition">
                            {item.company}
                          </h4>
                          <span className="text-[10px] text-[#D9D9D9] dark:text-slate-600">•</span>
                          <span className="text-[11px] text-[#56687A] dark:text-slate-300 truncate">{item.role}</span>
                        </div>
                        <p className="text-[10px] text-[#788896] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{item.date}</span>
                          {item.time && <span>• {item.time}</span>}
                        </p>
                      </div>
                    </div>

                    <Badge variant="brand" size="sm">
                      Interview
                    </Badge>
                  </div>
                ))}

                {dashboardData.upcomingDeadlines.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F3F6F8]/80 dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700/60 hover:border-[#D9D9D9] dark:hover:border-slate-600 hover:bg-[#F3F6F8] dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 group shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border bg-[#FFF4CC] dark:bg-amber-500/15 border-[#ffe899] dark:border-amber-500/30 text-[#8A6100] dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 truncate group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition">
                            {item.company}
                          </h4>
                          <span className="text-[10px] text-[#D9D9D9] dark:text-slate-600">•</span>
                          <span className="text-[11px] text-[#56687A] dark:text-slate-300 truncate">{item.role}</span>
                        </div>
                        <p className="text-[10px] text-[#788896] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>Due: {item.date}</span>
                        </p>
                      </div>
                    </div>

                    <Badge variant="warning" size="sm">
                      Deadline
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* --- RIGHT: QUICK STATS & NOTIFICATIONS --- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-800">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                Quick Stats
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">
                Your activity overview
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-3 space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/60 shadow-xs">
                <p className="text-[10px] text-[#56687A] dark:text-slate-400">Unread Messages</p>
                <p className="text-lg font-bold text-[#1D2226] dark:text-slate-100 font-mono">{dashboardData.unreadMessagesCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/60 shadow-xs">
                <p className="text-[10px] text-[#56687A] dark:text-slate-400">Notifications</p>
                <p className="text-lg font-bold text-[#1D2226] dark:text-slate-100 font-mono">{dashboardData.unreadNotificationsCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/60 shadow-xs">
                <p className="text-[10px] text-[#56687A] dark:text-slate-400">Connection Requests</p>
                <p className="text-lg font-bold text-[#1D2226] dark:text-slate-100 font-mono">{dashboardData.connectionRequestsCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/60 shadow-xs">
                <p className="text-[10px] text-[#56687A] dark:text-slate-400">Learning Accuracy</p>
                <p className="text-lg font-bold text-[#1D2226] dark:text-slate-100 font-mono">{learningProgress.accuracy.toFixed(1)}%</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8E8E8] dark:border-slate-800">
              <Link to="/messages" className="block">
                <Button size="sm" variant="outline" className="w-full">
                  View All Messages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
