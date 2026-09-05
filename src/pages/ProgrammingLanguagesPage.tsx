import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';
import { PROGRAMMING_LANGUAGES } from '../data/languagesData';
import { LanguageItem, LanguageCategory } from '../types/languages';
import {
  Code2,
  Flame,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const ProgrammingLanguagesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories: Array<string> = [
    'All',
    'Systems',
    'Backend',
    'Frontend',
    'Mobile',
    'Data / Query',
    'Markup / Styling',
  ];

  const filteredLanguages = useMemo(() => {
    return PROGRAMMING_LANGUAGES.filter((lang) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lang.name.toLowerCase().includes(q) ||
        lang.tagline.toLowerCase().includes(q) ||
        lang.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'All' || lang.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // High-level aggregate metrics
  const totalSolved = useMemo(
    () => PROGRAMMING_LANGUAGES.reduce((acc, curr) => acc + curr.solvedQuestions, 0),
    []
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Programming Language Tracks"
        description="Comprehensive syntax drills, concurrency models, memory architectures, and 1,600+ questions across 15 production languages."
        badge={
          <Badge variant="brand" size="sm">
            15 Languages Supported
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/learning">
              <Button size="sm" variant="outline" icon={<BookOpen className="w-3.5 h-3.5 text-brand-400" />}>
                Learning Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#788896]">Total Languages</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1D2226] font-mono">15</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Active</span>
          </div>
          <p className="text-[10px] text-[#788896]">Systems, Backend, Web & Mobile</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-emerald-700">Questions Solved</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">{totalSolved}</span>
            <span className="text-[10px] text-[#788896] font-mono">/ 1,695</span>
          </div>
          <p className="text-[10px] text-[#788896]">Across all 15 language tracks</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#0A66C2]">Average Accuracy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0A66C2] font-mono">92.4%</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Top 8%</span>
          </div>
          <p className="text-[10px] text-[#788896]">Test pass rate on first submit</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
          <span className="text-[11px] text-[#8A6100]">Longest Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#8A6100] font-mono">14 Days</span>
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-[10px] text-[#788896]">Continuous daily practice</p>
        </div>
      </div>

      {/* Toolbar: Category Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#D9D9D9] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language name, category, paradigm..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition',
                selectedCategory === cat
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'bg-white text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] border border-[#D9D9D9]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 15 Language Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLanguages.map((lang) => (
          <Link
            key={lang.id}
            to={`/learning/languages/${lang.slug}`}
            className="block group"
          >
            <Card className="p-4 flex flex-col justify-between h-full hover:border-[#0A66C2]/50 hover:shadow-md transition-all duration-150 space-y-3.5 bg-white border border-[#D9D9D9] shadow-xs">
              <div className="space-y-3">
                {/* Header: Logo, Name, Category */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Logo/Icon text */}
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm font-mono border shadow-xs group-hover:scale-105 transition',
                        lang.iconBg,
                        lang.textColor,
                        lang.borderAccent
                      )}
                    >
                      {lang.iconText}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition">
                        {lang.name}
                      </h3>
                      <span className="text-[10px] font-mono text-[#788896] font-semibold uppercase">
                        {lang.category}
                      </span>
                    </div>
                  </div>

                  {/* Accuracy Badge */}
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333] border border-[#c6ecd2]">
                    {lang.accuracy}% Acc
                  </span>
                </div>

                {/* Tagline */}
                <p className="text-xs text-[#56687A] line-clamp-2 leading-relaxed">
                  {lang.tagline}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#788896]">Track Mastery</span>
                    <span className="font-bold text-[#1D2226]">{lang.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F3F6F8] overflow-hidden border border-[#E8E8E8]">
                    <div
                      className="h-full bg-[#0A66C2] rounded-full transition-all duration-500"
                      style={{ width: `${lang.progress}%` }}
                    />
                  </div>
                </div>

                {/* 4 Metric Badges: Questions Solved, Accuracy, Streak, Last Practiced */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E8E8E8] text-[11px]">
                  <div className="p-2 rounded-lg bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-[#788896] block">
                      Questions
                    </span>
                    <span className="font-mono font-bold text-[#1D2226]">
                      {lang.solvedQuestions} / {lang.totalQuestions}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
                    <span className="text-[9px] uppercase font-mono text-[#788896] block">
                      Daily Streak
                    </span>
                    <span className="font-mono font-bold text-[#8A6100] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" />
                      {lang.streak} days
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5 col-span-2 flex items-center justify-between">
                    <span className="text-[10px] text-[#788896] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#788896]" />
                      Last practiced: <strong className="text-[#1D2226]">{lang.lastPracticed}</strong>
                    </span>
                    <span className="text-[10px] text-[#0A66C2] group-hover:text-[#004182] font-semibold flex items-center gap-0.5">
                      Open Track <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProgrammingLanguagesPage;
