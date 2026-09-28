import React, { useState, useEffect } from 'react';
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
  Lock,
  Plus,
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { progressApi, ProgressOverview, ActivityDataPoint, SkillTrajectory } from '../api/progressApi';

export const ProgressPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'student' | 'recruiter'>('student');
  const [activityTimeframe, setActivityTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [overview, setOverview] = useState<ProgressOverview>({
    questionsSolved: 0,
    totalQuestions: 0,
    accuracy: 0,
    codingStreakDays: 0,
    currentAtsScore: 0,
    projectsCompleted: 0,
    certificationsCount: 0,
    coursesEnrolled: 0,
    coursesCompleted: 0,
    lessonsCompleted: 0,
    totalStudyHours: 0,
  });
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [skillTrajectories, setSkillTrajectories] = useState<SkillTrajectory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const [ovData, actData, skillData] = await Promise.all([
          progressApi.getProgressOverview().catch(() => ({
            questionsSolved: 0,
            totalQuestions: 0,
            accuracy: 0,
            codingStreakDays: 0,
            currentAtsScore: 0,
            projectsCompleted: 0,
            certificationsCount: 0,
            coursesEnrolled: 0,
            coursesCompleted: 0,
            lessonsCompleted: 0,
            totalStudyHours: 0,
          })),
          progressApi.getActivityHistory(activityTimeframe).catch(() => []),
          progressApi.getSkillTrajectories().catch(() => []),
        ]);
        setOverview(ovData);
        setActivityData(actData);
        setSkillTrajectories(skillData);
      } catch (err) {
        console.error('Failed to load progress data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [activityTimeframe]);

  // Dynamic Achievements computed from real metrics
  const achievements = [
    {
      id: 'ach-1',
      title: 'First Lesson Mastery',
      desc: 'Completed your first interactive technical lesson in the Learning Hub.',
      icon: BookOpen,
      isUnlocked: (overview.lessonsCompleted || 0) >= 1,
      metric: `${overview.lessonsCompleted || 0}/1 Lessons`,
      color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
    },
    {
      id: 'ach-2',
      title: 'Course Completion',
      desc: 'Finished 100% of the lessons in a full technical curriculum track.',
      icon: Trophy,
      isUnlocked: (overview.coursesCompleted || 0) >= 1,
      metric: `${overview.coursesCompleted || 0}/1 Courses`,
      color: 'text-emerald-700 bg-[#E6F4EA] border-[#c6ecd2]',
    },
    {
      id: 'ach-3',
      title: 'Active Study Consistency',
      desc: 'Maintained 3 or more consecutive days of learning and problem-solving.',
      icon: Flame,
      isUnlocked: (overview.codingStreakDays || 0) >= 3,
      metric: `${overview.codingStreakDays || 0}/3 Days`,
      color: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
    },
    {
      id: 'ach-4',
      title: 'ATS High-Readiness',
      desc: 'Optimized resume content with quantified STAR metrics achieving 75%+ ATS score.',
      icon: TrendingUp,
      isUnlocked: (overview.currentAtsScore || 0) >= 75,
      metric: `${overview.currentAtsScore || 0}/75 ATS`,
      color: 'text-[#0A66C2] bg-[#E8F3FF] border-[#d0e6fc]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Career Growth & Verified Portfolio"
        description="Chronological engineering milestones, daily practice consistency, ATS resume evolution, and technical competency trajectories."
        badge={
          <Badge variant="brand" size="sm">
            Verified Profile: {user?.name || 'Engineer'}
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

            <Link to="/learning">
              <Button size="sm" variant="primary" icon={<BookOpen className="w-3.5 h-3.5" />}>
                Learning Hub
              </Button>
            </Link>

            <Link to="/profile">
              <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" />}>
                Public Profile
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. TOP STATS: COURSES, LESSONS, STUDY HOURS, STREAK, ATS SCORE            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">Courses Enrolled</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] dark:text-slate-100 font-mono">{overview.coursesEnrolled || 0}</span>
            <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">Tracks</span>
          </div>
          <span className="text-[10px] text-[#0A66C2] dark:text-blue-400 font-semibold font-mono">
            {overview.coursesCompleted || 0} Completed
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">Lessons Completed</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">{overview.lessonsCompleted || 0}</span>
            <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">Verified</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
            {overview.lessonsCompleted ? 'Active Learning' : 'Start learning'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">Study Volume</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] dark:text-slate-100 font-mono">{overview.totalStudyHours || 0}</span>
            <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">Hours</span>
          </div>
          <span className="text-[10px] text-[#56687A] dark:text-slate-400 font-semibold font-mono">Deep Work</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">Learning Streak</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#8A6100] dark:text-amber-400 font-mono">{overview.codingStreakDays || 0} Days</span>
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          <span className="text-[10px] text-[#8A6100] dark:text-amber-400 font-semibold font-mono">
            {overview.codingStreakDays ? 'Streak Active' : 'No streak yet'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">ATS Readiness</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#0A66C2] dark:text-blue-400 font-mono">{overview.currentAtsScore || 0}%</span>
          </div>
          <span className="text-[10px] text-[#0A66C2] dark:text-blue-400 font-semibold font-mono">
            {overview.currentAtsScore ? 'Resume Analysis' : 'Upload Resume'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] dark:text-slate-400">Problems Solved</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#1D2226] dark:text-slate-100 font-mono">{overview.questionsSolved || 0}</span>
            <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">Questions</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
            {overview.questionsSolved ? 'Verified DSA' : 'Practice Code'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RECHARTS SECTION: ACTIVITY (DAILY/WEEKLY/MONTHLY) & SKILL GROWTH        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Practice Activity Chart (7 Cols) */}
        <Card className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-700 flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0A66C2]" />
                Engineering Activity & Study Volume
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">
                Practice volume and deep study hours persisted in real time
              </p>
            </div>

            {/* Timeframe Toggle: Daily, Weekly, Monthly */}
            <div className="flex items-center bg-[#F3F6F8] dark:bg-slate-800 p-0.5 rounded-lg border border-[#D9D9D9] dark:border-slate-600">
              {(['daily', 'weekly', 'monthly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActivityTimeframe(tf)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold capitalize transition ${
                    activityTimeframe === tf
                      ? 'bg-[#0A66C2] text-white shadow-sm'
                      : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="h-64 w-full">
              {activityData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#788896] dark:text-slate-400 space-y-2 p-6 text-center">
                  <BookOpen className="w-8 h-8 text-[#0A66C2]" />
                  <p className="font-semibold text-[#1D2226] dark:text-slate-100">No learning activity recorded yet</p>
                  <p className="text-[11px] max-w-sm">
                    Complete lessons in the Learning Hub to start generating your verified study consistency graph.
                  </p>
                  <Link to="/learning">
                    <Button size="xs" variant="primary" className="mt-2">
                      Start Learning
                    </Button>
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#E8E8E8'} vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke={theme === 'dark' ? '#64748B' : '#788896'}
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke={theme === 'dark' ? '#64748B' : '#788896'} fontSize={11} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                        borderColor: theme === 'dark' ? '#334155' : '#D9D9D9',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: theme === 'dark' ? '#F8FAFC' : '#1D2226',
                        boxShadow: theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                      }}
                      itemStyle={{
                        color: theme === 'dark' ? '#CBD5E1' : '#1D2226',
                      }}
                      labelStyle={{
                        color: theme === 'dark' ? '#F8FAFC' : '#1D2226',
                        fontWeight: 'bold',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="questionsSolved"
                      name="Lessons / Questions"
                      fill="#0A66C2"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="studyHours"
                      name="Study Hours"
                      fill="#137333"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skill Growth (5 Cols) */}
        <Card className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E8] dark:border-slate-700 flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Technical Skill Trajectory
              </CardTitle>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">
                Competency growth across active curriculum tracks
              </p>
            </div>
            <Badge variant="brand" size="sm">
              Competency Depth
            </Badge>
          </CardHeader>
          <CardContent className="p-4 flex-1">
            <div className="h-64 w-full">
              {skillTrajectories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#788896] dark:text-slate-400 space-y-2 p-6 text-center">
                  <Target className="w-8 h-8 text-brand-500" />
                  <p className="font-semibold text-[#1D2226] dark:text-slate-100">No skill trajectories recorded yet</p>
                  <p className="text-[11px] max-w-xs">
                    Enroll in courses and complete syllabus modules to record your verified technical growth.
                  </p>
                  <Link to="/skills">
                    <Button size="xs" variant="outline" className="mt-2">
                      Diagnose Skill Gaps
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="h-full overflow-y-auto space-y-3 pr-1">
                  {skillTrajectories.map((s) => (
                    <div key={s.name} className="p-2.5 rounded-xl bg-[#F3F6F8] dark:bg-slate-800 border border-[#E8E8E8] dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1D2226] dark:text-slate-100 truncate">{s.name}</span>
                        <span className="font-mono text-[#0A66C2] dark:text-blue-400 font-bold shrink-0">
                          {s.currentScore}% (+{s.growthPercentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#D9D9D9] dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0A66C2] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, s.currentScore))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#788896] dark:text-slate-500 font-mono">
                        <span>Baseline: {s.initialScore}%</span>
                        <span>Target: 100%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. RESUME ATS SCORE READINESS AUDIT                                        */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E8E8] dark:border-slate-700">
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Resume ATS Analysis & Job Readiness
            </h3>
            <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-0.5">
              Live score generated by Groq AI from candidate resume and market job requirements.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#788896] dark:text-slate-400">Active ATS Score:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {overview.currentAtsScore > 0 ? `${overview.currentAtsScore}%` : 'Not evaluated'}
            </span>
          </div>
        </div>

        {overview.currentAtsScore > 0 ? (
          <div className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800 border border-[#E8E8E8] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#1D2226] dark:text-slate-100">Verified ATS Compatibility</span>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400">
                Your active resume has been evaluated with production-grade Groq analysis against industry benchmarks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/resume">
                <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                  Open Resume Studio
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-2 border border-dashed border-[#D9D9D9] dark:border-slate-600 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-[#1D2226] dark:text-slate-100">No Resume ATS Score Recorded</p>
            <p className="text-[11px] text-[#56687A] dark:text-slate-400">
              Upload your PDF/DOCX resume in the Resume Studio to generate an ATS compatibility diagnostic.
            </p>
            <Link to="/resume">
              <Button size="xs" variant="primary" className="mt-1">
                Upload Resume
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 4. ACHIEVEMENT MILESTONES (Real Verified Unlocks)                          */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Verified Career Milestones & Badges
          </span>
          <span className="text-[11px] text-[#788896] dark:text-slate-400 font-mono">
            {achievements.filter((a) => a.isUnlocked).length} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 hover:border-[#0A66C2]/40 dark:hover:border-blue-500/40 transition flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${ach.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-[#788896] dark:text-slate-400">{ach.metric}</span>
                  </div>

                  <h4 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition">
                    {ach.title}
                  </h4>
                  <p className="text-[11px] text-[#56687A] dark:text-slate-400 leading-relaxed">{ach.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] dark:border-slate-700 text-[10px] font-mono">
                  {ach.isUnlocked ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[#788896] dark:text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> In Progress
                    </span>
                  )}
                  <span className="text-[#788896] dark:text-slate-500">{ach.isUnlocked ? 'Verified ✓' : 'Pending'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
