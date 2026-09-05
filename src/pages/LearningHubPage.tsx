import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'careerx_learning_modules_v2';

const INITIAL_MODULES: LearningModule[] = [
  // 1. Recommended / High-Priority Gap Modules
  {
    id: 'mod-1',
    title: 'Event-Driven Architecture & Partitioning with Apache Kafka',
    category: 'Backend Development',
    difficulty: 'Advanced',
    duration: '3.5 hrs',
    lessonsCount: 6,
    progress: 20,
    isRecommended: true,
    recommendationReason: '⚠ Closes Identified Skill Gap (Stripe & Datadog)',
    description:
      'Master producer idempotence, consumer rebalancing protocols, dead-letter queues, and high-throughput partition strategies.',
    skillsCovered: ['Kafka', 'Distributed Systems', 'Event-Driven', 'Go'],
  },
  {
    id: 'mod-2',
    title: 'Atomic Rate Limiting with Redis & Lua Scripts',
    category: 'System Design',
    difficulty: 'Advanced',
    duration: '2.0 hrs',
    lessonsCount: 4,
    progress: 0,
    isRecommended: true,
    recommendationReason: '🎯 Target Role Match (Stripe Senior Backend)',
    description:
      'Build production sliding-window rate limiters with atomic Redis evaluation scripts to handle 50k+ requests/sec with p99 <10ms.',
    skillsCovered: ['Redis', 'System Design', 'Concurrency', 'Lua'],
  },
  {
    id: 'mod-3',
    title: 'Production AWS Cloud Architecture (ECS, S3, RDS)',
    category: 'Backend Development',
    difficulty: 'Intermediate',
    duration: '4.0 hrs',
    lessonsCount: 8,
    progress: 45,
    isRecommended: true,
    recommendationReason: '⚠ Closes Identified Cloud Gap (Cloud & DevOps)',
    description:
      'Configure auto-scaling containerized services on AWS ECS Fargate with private VPC subnets and Aurora PostgreSQL clusters.',
    skillsCovered: ['AWS', 'Docker', 'ECS', 'PostgreSQL'],
  },
  {
    id: 'mod-4',
    title: 'Distributed Systems Technical Mock Round (AI Recruiter)',
    category: 'Mock Interview',
    difficulty: 'Advanced',
    duration: '45 mins',
    lessonsCount: 3,
    progress: 0,
    isRecommended: true,
    recommendationReason: '⚡ Based on 88% ATS Score & 92% DSA Diagnostic',
    description:
      'Simulated 45-minute live technical interview covering replication lag, CAP theorem tradeoffs, and consensus protocols.',
    skillsCovered: ['System Design', 'Mock Interview', 'Communication'],
  },

  // 2. Programming Languages
  {
    id: 'mod-5',
    title: 'Go Concurrency Patterns: Channels, Mutexes & Worker Pools',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    duration: '3.0 hrs',
    lessonsCount: 5,
    progress: 75,
    description:
      'Deep dive into Go routines, channel synchronization, context propagation, and race condition prevention.',
    skillsCovered: ['Go', 'Concurrency', 'Memory Model'],
  },
  {
    id: 'mod-6',
    title: 'Advanced TypeScript: Conditional Types & Type Gymnastics',
    category: 'Programming Languages',
    difficulty: 'Advanced',
    duration: '2.5 hrs',
    lessonsCount: 4,
    progress: 100,
    description:
      'Master mapped types, recursive generics, template literal types, and type-safe API schemas.',
    skillsCovered: ['TypeScript', 'Generics', 'Type Safety'],
  },
  {
    id: 'mod-7',
    title: 'Python AsyncIO & High-Performance Event Loops',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    duration: '2.8 hrs',
    lessonsCount: 5,
    progress: 0,
    description:
      'Build non-blocking I/O microservices utilizing Python 3.12 asyncio event loops, tasks, and uvloop.',
    skillsCovered: ['Python', 'AsyncIO', 'Performance'],
  },

  // 3. DSA
  {
    id: 'mod-8',
    title: 'Dynamic Programming: 2D Grids, Knapsack & Memoization Patterns',
    category: 'DSA',
    difficulty: 'Advanced',
    duration: '5.0 hrs',
    lessonsCount: 10,
    progress: 90,
    description:
      'Comprehensive pattern-based approach to state transition equations, bottom-up tabulations, and space optimization.',
    skillsCovered: ['DSA', 'Dynamic Programming', 'Algorithms'],
  },
  {
    id: 'mod-9',
    title: 'Graph Traversal: Dijkstra, Topological Sort & Disjoint Sets',
    category: 'DSA',
    difficulty: 'Intermediate',
    duration: '4.2 hrs',
    lessonsCount: 8,
    progress: 60,
    description:
      'Solve complex shortest-path, cycle detection, and dependency resolution algorithmic problems.',
    skillsCovered: ['DSA', 'Graphs', 'Algorithms'],
  },

  // 4. Frontend Development
  {
    id: 'mod-10',
    title: 'React 19 Server Components & Concurrent Mode Rendering',
    category: 'Frontend Development',
    difficulty: 'Advanced',
    duration: '3.2 hrs',
    lessonsCount: 6,
    progress: 85,
    description:
      'Explore React Server Components (RSC), Suspense streaming boundaries, useActionState, and server actions.',
    skillsCovered: ['React', 'Next.js', 'Web Performance'],
  },
  {
    id: 'mod-11',
    title: 'Core Web Vitals & Browser Paint/Layout Optimization',
    category: 'Frontend Development',
    difficulty: 'Intermediate',
    duration: '2.0 hrs',
    lessonsCount: 4,
    progress: 100,
    description:
      'Diagnose and optimize Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).',
    skillsCovered: ['Performance', 'Web Vitals', 'JavaScript'],
  },

  // 5. Database / SQL
  {
    id: 'mod-12',
    title: 'PostgreSQL Index Tuning, B-Trees & Query Optimization',
    category: 'Database / SQL',
    difficulty: 'Advanced',
    duration: '3.8 hrs',
    lessonsCount: 7,
    progress: 70,
    description:
      'Analyze EXPLAIN ANALYZE execution plans, optimize composite B-Tree indexes, and eliminate sequential table scans.',
    skillsCovered: ['PostgreSQL', 'SQL', 'Database Tuning'],
  },
  {
    id: 'mod-13',
    title: 'Database Sharding & High-Availability Read-Replicas',
    category: 'Database / SQL',
    difficulty: 'Advanced',
    duration: '3.0 hrs',
    lessonsCount: 5,
    progress: 0,
    description:
      'Design horizontal partitioning schemes, consistent hashing rings, and failover topologies for multi-terabyte datasets.',
    skillsCovered: ['PostgreSQL', 'Sharding', 'High Availability'],
  },

  // 6. System Design
  {
    id: 'mod-14',
    title: 'Design a Global Distributed Cache (Memcached/Redis)',
    category: 'System Design',
    difficulty: 'Advanced',
    duration: '3.5 hrs',
    lessonsCount: 6,
    progress: 50,
    description:
      'Architect consistent hashing distribution, LRU cache eviction algorithms, write-through vs write-back, and dogpiling prevention.',
    skillsCovered: ['System Design', 'Caching', 'Redis'],
  },

  // 7. Interview Preparation
  {
    id: 'mod-15',
    title: 'FAANG Behavioral Masterclass: The STAR Framework',
    category: 'Interview Preparation',
    difficulty: 'Beginner',
    duration: '1.5 hrs',
    lessonsCount: 3,
    progress: 100,
    description:
      'Structure leadership stories, conflict resolution anecdotes, and technical failures using Amazon Leadership Principles.',
    skillsCovered: ['Behavioral', 'STAR Method', 'Interview Prep'],
  },

  // 8. Assessments
  {
    id: 'mod-16',
    title: 'Senior Backend Engineer Skill Verification Exam',
    category: 'Assessments',
    difficulty: 'Advanced',
    duration: '60 mins',
    lessonsCount: 1,
    progress: 0,
    description:
      'Comprehensive benchmark testing concurrency, SQL query profiling, API design, and distributed systems fundamentals.',
    skillsCovered: ['Assessment', 'Go', 'SQL', 'System Design'],
  },
];

export const LearningHubPage: React.FC = () => {
  // State with LocalStorage persistence
  const [modules, setModules] = useState<LearningModule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MODULES;
      }
    }
    return INITIAL_MODULES;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedProgress, setSelectedProgress] = useState<string>('All');
  const [activeModalModule, setActiveModalModule] = useState<LearningModule | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  }, [modules]);

  // Handle Lesson Progress Update
  const handleUpdateProgress = (moduleId: string, newProgress: number) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, progress: newProgress } : m))
    );
    if (activeModalModule && activeModalModule.id === moduleId) {
      setActiveModalModule((prev) => (prev ? { ...prev, progress: newProgress } : null));
    }
  };

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

  // Recommended Modules List (Always based on mock user profile)
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
            14-Day Study Streak
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
      {/* 1. CATEGORY CARDS (10 Requested Categories)                                */}
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
          {LEARNING_CATEGORIES.map((cat) => (
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
              Personalized based on your active resume (<span className="text-[#0A66C2] font-medium">Go & TypeScript</span>), target role (<span className="text-[#1D2226] font-medium">Stripe Senior Backend</span>), identified skill gaps (<span className="text-[#8A6100] font-medium">Kafka & Redis Lua</span>), and diagnostic score (<span className="text-emerald-700 font-medium">92% DSA</span>).
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
      {filteredModules.length === 0 ? (
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
