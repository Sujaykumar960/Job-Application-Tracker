import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';
import { skillGapApi } from '../api/skillGapApi';
import { SkillGapAnalysisResponse } from '../types';
import {
  Target,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Loader2,
  AlertCircle,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

export const SkillGapPage: React.FC = () => {
  const [targetTrack, setTargetTrack] = useState<'backend' | 'fullstack' | 'distributed'>('distributed');
  const [data, setData] = useState<SkillGapAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSkillGap = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await skillGapApi.getSkillGapAnalysis({ track: targetTrack });
        if (!isMounted) return;
        setData(res);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load skill gap matrix:', err);
        setError(err?.response?.data?.detail || 'Unable to calculate skill gap analysis. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSkillGap();

    return () => {
      isMounted = false;
    };
  }, [targetTrack]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Analyzing real candidate skills against market demand...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Skill Gap Matrix Unavailable</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry Analysis
          </Button>
        </div>
      </div>
    );
  }

  // Empty state: No profile skills and no active resume
  if (!data || (!data.hasActiveResume && !data.hasProfileSkills && data.currentSkills.length === 0)) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Skill Gap Analysis & Readiness Roadmap"
          description="Diagnose missing competencies against live market expectations and follow structured remediation paths."
          badge={
            <Badge variant="brand" size="sm">
              Target: {targetTrack.toUpperCase()}
            </Badge>
          }
        />

        <div className="p-8 rounded-2xl bg-white border border-[#D9D9D9] text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E8F3FF] text-[#0A66C2] flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1D2226]">No Skills or Active Resume Detected</h3>
          <p className="text-xs text-[#56687A] leading-relaxed">
            To generate a realistic skill gap matrix, CareerX needs your technical competencies.
            Upload your resume or add verified skills to your profile.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/resume">
              <Button size="sm" variant="primary" icon={<UploadCloud className="w-3.5 h-3.5" />}>
                Upload Resume
              </Button>
            </Link>
            <Link to="/profile">
              <Button size="sm" variant="outline" icon={<UserCheck className="w-3.5 h-3.5" />}>
                Edit Profile Skills
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { summary, radarData, categoryProficiency, currentSkills, missingSkills } = data;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Skill Gap Analysis & Readiness Roadmap"
        description="Diagnose missing competencies against live market expectations and follow structured remediation paths."
        badge={
          <Badge variant="brand" size="sm">
            Target: {targetTrack.toUpperCase()}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-[#D9D9D9] rounded-lg p-0.5 text-xs">
              {(['distributed', 'backend', 'fullstack'] as const).map((track) => (
                <button
                  key={track}
                  onClick={() => setTargetTrack(track)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition ${
                    targetTrack === track
                      ? 'bg-[#0A66C2] text-white'
                      : 'text-[#56687A] hover:text-[#1D2226]'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
            <Link to="/job-match">
              <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-[#0A66C2]" />}>
                Run Job Match
              </Button>
            </Link>
            <Link to="/learning">
              <Button size="sm" variant="primary" icon={<BookOpen className="w-3.5 h-3.5" />}>
                Dev Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* Info notice if message exists */}
      {data.message && (
        <div className="p-3.5 rounded-xl bg-[#E8F3FF] border border-[#d0e6fc] text-xs text-[#0A66C2] flex items-center justify-between gap-3 shadow-xs">
          <span>{data.message}</span>
          <Link to="/resume" className="font-semibold underline flex-shrink-0">
            Go to Resume Analyzer →
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. KPI SUMMARY BANNER                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#788896]">Total Profile Skills</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#1D2226] font-mono">{summary.totalProfileSkills}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Verified ✓</span>
          </div>
          <p className="text-[10px] text-[#788896]">From resume & profile</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-emerald-700">Market Alignment</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700 font-mono">{summary.marketAlignment}%</span>
            <span className="text-[10px] text-emerald-700 font-semibold">
              {summary.marketAlignment >= 80 ? 'Strong' : 'Moderate'}
            </span>
          </div>
          <p className="text-[10px] text-[#788896]">Across live job postings</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#8A6100]">Critical Skill Gaps</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#8A6100] font-mono">{summary.criticalGaps}</span>
            <span className="text-[10px] text-[#B3261E] font-semibold">Prioritized</span>
          </div>
          <p className="text-[10px] text-[#788896]">Across target requirements</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#0A66C2]">Remediation Modules</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0A66C2] font-mono">{summary.remediationModules} Ready</span>
            <span className="text-[10px] text-[#0A66C2] font-semibold">In Dev Hub</span>
          </div>
          <p className="text-[10px] text-[#788896]">Connected learning</p>
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
                Competency Radar: Candidate vs. Market Demand
              </CardTitle>
              <p className="text-[11px] text-[#56687A] mt-0.5">
                Blue = Your Verified Depth • Emerald = Live Market Baseline
              </p>
            </div>
            <Badge variant="brand" size="sm">
              {radarData.length} Dimensions
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2]" /> You ({summary.marketAlignment}% Avg)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Market Baseline (80% Cutoff)
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
                Evaluated from candidate resume and profile technical inventory
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
              Live market competencies identified from job postings with direct remediation links.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            {missingSkills.length} Gaps to Close
          </Badge>
        </div>

        <div className="space-y-3">
          {missingSkills.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-700">
              ✓ Excellent! No critical skill gaps identified against market expectations.
            </div>
          ) : (
            missingSkills.map((gap) => (
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
            ))
          )}
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
          {currentSkills.length === 0 ? (
            <p className="col-span-full py-4 text-center text-xs text-[#788896] italic">
              No technical competencies registered yet.
            </p>
          ) : (
            currentSkills.map((sk) => (
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default SkillGapPage;
