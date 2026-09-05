import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LearningModule } from './LearningModuleCard';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Play,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react';

export interface ModuleViewerModalProps {
  module: LearningModule | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress: (moduleId: string, newProgress: number) => void;
}

export const ModuleViewerModal: React.FC<ModuleViewerModalProps> = ({
  module,
  isOpen,
  onClose,
  onUpdateProgress,
}) => {
  if (!module) return null;

  const navigate = useNavigate();
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);

  // Mock Lesson Syllabus
  const lessons = [
    {
      title: 'Architectural Blueprint & Core Mechanics',
      duration: '20 min',
      completed: module.progress >= 33,
      snippet: `// Go distributed sliding-window rate limiter\nfunc (rl *RateLimiter) Allow(ctx context.Context, key string) (bool, error) {\n    now := time.Now().UnixNano()\n    windowStart := now - rl.windowSize.Nanoseconds()\n    \n    // Atomic Redis Lua Script Execution\n    res, err := rl.client.Eval(ctx, slidingWindowLua, []string{key}, now, windowStart, rl.limit).Result()\n    return res == int64(1), err\n}`,
    },
    {
      title: 'Concurrency Benchmarking & Failure Modes',
      duration: '35 min',
      completed: module.progress >= 66,
      snippet: `// Handling Redis cluster partition & failover semantics\nfunc (rl *RateLimiter) FallbackAllow() bool {\n    // Circuit breaker open -> degrade gracefully to local token bucket\n    return rl.localBucket.TakeAvailable(1) > 0\n}`,
    },
    {
      title: 'Live Coding Implementation & Verification Tests',
      duration: '45 min',
      completed: module.progress >= 100,
      snippet: `// High throughput parallel benchmark\nfunc BenchmarkRateLimiter_Parallel(b *testing.B) {\n    rl := NewRateLimiter(redisClient, 10000, time.Second)\n    b.RunParallel(func(pb *testing.PB) {\n        for pb.Next() {\n            rl.Allow(context.Background(), "user_1024")\n        }\n    })\n}`,
    },
  ];

  const handleToggleComplete = () => {
    const nextProg = module.progress >= 100 ? 0 : Math.min(module.progress + 34, 100);
    onUpdateProgress(module.id, nextProg);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={module.title}
      subtitle={`${module.category} • ${module.difficulty} Level • ${module.duration}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Module Header Overview */}
        <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#0A66C2] font-bold">
              Progress: {module.progress}%
            </span>
            <div className="w-32 h-1.5 rounded-full bg-white overflow-hidden border border-[#D9D9D9]">
              <div
                className="h-full bg-[#0A66C2] rounded-full transition-all duration-500"
                style={{ width: `${module.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="xs" variant="primary" onClick={handleToggleComplete}>
              {module.progress >= 100 ? 'Reset Lesson Progress' : 'Mark Lesson Complete (+34%)'}
            </Button>
          </div>
        </div>

        {/* 2-Column Layout: Lessons Syllabus on Left, Lesson Content on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
          {/* Syllabus (4 Cols) */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-[#788896] block">
              Module Curriculum ({lessons.length})
            </span>
            <div className="space-y-1.5">
              {lessons.map((lesson, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLessonIdx(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-start justify-between gap-2 shadow-xs ${
                    activeLessonIdx === idx
                      ? 'bg-[#E8F3FF] border-[#0A66C2] text-[#1D2226]'
                      : 'bg-white border-[#D9D9D9] text-[#56687A] hover:border-[#0A66C2]/40'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[11px] leading-tight truncate text-[#1D2226]">
                      {idx + 1}. {lesson.title}
                    </p>
                    <span className="text-[10px] text-[#788896] font-mono">{lesson.duration}</span>
                  </div>
                  {lesson.completed && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Code Sandbox / Lesson View (8 Cols) */}
          <div className="md:col-span-8 space-y-2.5">
            <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E8E8E8]">
                <span className="font-bold text-[#1D2226] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                  {lessons[activeLessonIdx].title}
                </span>
                <span className="text-[10px] text-[#788896] font-mono">Go 1.22 Runtime</span>
              </div>

              {/* Code display */}
              <div className="p-3 rounded-lg bg-white border border-[#D9D9D9] font-mono text-[11px] text-[#0A66C2] overflow-x-auto leading-relaxed shadow-xs">
                <pre>{lessons[activeLessonIdx].snippet}</pre>
              </div>

              <p className="text-[11px] text-[#38434F] leading-relaxed pt-1">
                {module.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8]">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" />}
            onClick={() => {
              onClose();
              navigate('/learning/code');
            }}
          >
            Launch in Monaco IDE Sandbox
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModuleViewerModal;
