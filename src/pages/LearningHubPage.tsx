import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  LearningCategoryCard,
  LEARNING_CATEGORIES,
} from '../components/learning/LearningCategoryCard';
import {
  LearningModuleCard,
  LearningModule,
} from '../components/learning/LearningModuleCard';
import { ModuleViewerModal } from '../components/learning/ModuleViewerModal';
import { learningApi, CourseSummary, MyLearningSummary } from '../api/learningApi';
import {
  Search,
  X,
  Sparkles,
  Flame,
  BookOpen,
  Filter,
  CheckCircle2,
  TrendingUp,
  Target,
  SlidersHorizontal,
  Code2,
  Loader2,
} from 'lucide-react';

export const LearningHubPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetCourseId = searchParams.get('courseId');

  // Learning modules state fetched from backend
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [mySummary, setMySummary] = useState<MyLearningSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedProgress, setSelectedProgress] = useState<string>('All');
  const [activeModalModule, setActiveModalModule] = useState<LearningModule | null>(null);

  // Fetch live courses and real user progress
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      learningApi.getCourses().catch(() => []),
      learningApi.getMyProgress().catch(() => null),
    ])
      .then(([courses, summary]) => {
        if (!isMounted) return;
        const formatted: LearningModule[] = courses.map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          difficulty: c.difficulty,
          duration: c.duration,
          lessonsCount: c.lessonsCount,
          progress: c.progress,
          isRecommended: c.isRecommended,
          recommendationReason: c.recommendationReason,
          description: c.description,
          skillsCovered: c.skillsCovered,
        }));
        setModules(formatted);
        setMySummary(summary);

        // If a courseId was passed in the URL (e.g. from Skill Gap page), open it immediately
        if (targetCourseId) {
          const match = formatted.find((m) => m.id === targetCourseId);
          if (match) {
            setActiveModalModule(match);
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetCourseId]);

  // Handle Lesson Progress Update
  const handleUpdateProgress = (moduleId: string, newProgress: number) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, progress: newProgress } : m))
    );
    if (activeModalModule && activeModalModule.id === moduleId) {
      setActiveModalModule((prev) => (prev ? { ...prev, progress: newProgress } : null));
    }
  };

  // Dynamically calculate category stats from real modules
  const dynamicCategories = useMemo(() => {
    return LEARNING_CATEGORIES.map((cat) => {
      const catModules =
        cat.id === 'Recommended'
          ? modules.filter((m) => m.isRecommended)
          : modules.filter((m) => m.category === cat.id);

      const count = catModules.length;
      const avg =
        count > 0
          ? Math.round(
              catModules.reduce((acc, curr) => acc + curr.progress, 0) / count
            )
          : 0;

      return {
        ...cat,
        modulesCount: count,
        avgCompletion: avg,
      };
    });
  }, [modules]);

  // Filtered Modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.skillsCovered.some((s) => s.toLowerCase().includes(q));

      // Category
      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Recommended' ? m.isRecommended : m.category === selectedCategory);

      // Difficulty
      const matchesDifficulty =
        selectedDifficulty === 'All' || m.difficulty === selectedDifficulty;

      // Progress
      let matchesProgress = true;
      if (selectedProgress === 'Completed') matchesProgress = m.progress === 100;
      if (selectedProgress === 'In Progress') matchesProgress = m.progress > 0 && m.progress < 100;
      if (selectedProgress === 'Not Started') matchesProgress = m.progress === 0;

      return matchesSearch && matchesCategory && matchesDifficulty && matchesProgress;
    });
  }, [modules, searchQuery, selectedCategory, selectedDifficulty, selectedProgress]);

  // Recommended Modules List
  const recommendedModules = useMemo(() => {
    return modules.filter((m) => m.isRecommended);
  }, [modules]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setSelectedDifficulty('All');
    setSelectedProgress('All');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Developer Learning & Engineering Hub"
        description="Comprehensive technical mastery tracks, system design blueprints, DSA exercises, and personalized skill gap remediation."
        badge={
          <Badge variant="warning" size="sm">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            {mySummary && mySummary.streakDays > 0
              ? `${mySummary.streakDays}-Day Study Streak`
              : 'Active Study Track'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/skills">
              <Button size="sm" variant="outline" icon={<Target className="w-3.5 h-3.5 text-brand-400" />}>
                Inspect Skill Gaps
              </Button>
            </Link>
            <Link to="/job-match">
              <Button size="sm" variant="secondary" icon={<TrendingUp className="w-3.5 h-3.5" />}>
                Job Match Diagnostics
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. CATEGORY CARDS (Dynamic from live modules)                             */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
            Explore Learning Tracks
          </span>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-semibold"
            >
              View All Tracks
            </button>
          )}
        </div>

        {/* 5-col grid for laptop viewports */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {dynamicCategories.map((cat) => (
            <LearningCategoryCard
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.id}
              onSelect={(id) => setSelectedCategory(id === selectedCategory ? 'All' : id)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PERSONALIZED SECTION: RECOMMENDED FOR YOU                              */}
      {/* ========================================================================= */}
      {recommendedModules.length > 0 && (
        <Card className="p-4 bg-[#E8F3FF] border border-[#d0e6fc] space-y-4 shadow-sm">
          {/* Recommendation Context Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#d0e6fc]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-[#1D2226] tracking-tight">Recommended For You</h3>
                <Badge variant="brand" size="sm">
                  AI Customized
                </Badge>
              </div>
              <p className="text-xs text-[#38434F]">
                Personalized based on your active resume competencies, target market expectations, and identified skill gaps.
              </p>
            </div>

            <Link to="/skills" className="text-xs text-[#0A66C2] hover:text-[#004182] font-semibold whitespace-nowrap flex items-center gap-1">
              View Skill Gap Matrix →
            </Link>
          </div>

          {/* Recommended Cards Grid (4 Columns on Desktop/Laptop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {recommendedModules.map((mod) => (
              <LearningModuleCard
                key={mod.id}
                module={mod}
                onOpen={(m) => setActiveModalModule(m)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. TOOLBAR: SEARCH, CATEGORY, DIFFICULTY, PROGRESS FILTERS                */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#D9D9D9] shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, skills, system design blueprints..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#788896] hover:text-[#1D2226]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Categories</option>
            {LEARNING_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Progress Dropdown */}
          <select
            value={selectedProgress}
            onChange={(e) => setSelectedProgress(e.target.value)}
            className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Progress</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Not Started">Not Started</option>
          </select>

          {/* Reset Filters button */}
          {(selectedCategory !== 'All' ||
            searchQuery !== '' ||
            selectedDifficulty !== 'All' ||
            selectedProgress !== 'All') && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#0A66C2] hover:text-[#004182] font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN MODULES GRID (Responsive 3-Column on Laptop 1366px+)               */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-xs text-[#56687A] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0A66C2]" />
          Loading technical courses and progress...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
          <p className="text-sm font-semibold text-[#1D2226]">No modules match your current filter</p>
          <p className="text-xs text-[#56687A]">Try broadening your category, difficulty, or search terms.</p>
          <Button size="xs" variant="outline" onClick={resetFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((mod) => (
            <LearningModuleCard
              key={mod.id}
              module={mod}
              onOpen={(m) => setActiveModalModule(m)}
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE MODULE VIEWER & LESSON SYLLABUS MODAL                       */}
      {/* ========================================================================= */}
      <ModuleViewerModal
        module={activeModalModule}
        isOpen={Boolean(activeModalModule)}
        onClose={() => setActiveModalModule(null)}
        onUpdateProgress={handleUpdateProgress}
      />
    </div>
  );
};

export default LearningHubPage;
