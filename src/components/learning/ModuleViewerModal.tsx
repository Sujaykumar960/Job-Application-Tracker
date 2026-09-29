import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LearningModule } from './LearningModuleCard';
import { learningApi, CourseDetail, LessonSummary } from '../../api/learningApi';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Loader2,
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
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Fetch complete course syllabus and user progress
  useEffect(() => {
    if (!isOpen || !module) return;

    let isMounted = true;
    setIsLoading(true);
    setActiveLessonIdx(0);

    learningApi
      .getCourse(module.id)
      .then((detail) => {
        if (isMounted) {
          setCourseDetail(detail);
        }
      })
      .catch((err) => {
        console.error('Failed to load course details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, module?.id]);

  const lessons: LessonSummary[] = courseDetail?.lessons || [];
  const currentProgress = courseDetail ? courseDetail.progress : module.progress;
  const activeLesson = lessons[activeLessonIdx] || null;

  // Handle toggling lesson completion
  const handleToggleLesson = async (lesson: LessonSummary) => {
    if (!module || isMutating) return;

    try {
      setIsMutating(true);
      const isCompleted = lesson.completed;
      const res = isCompleted
        ? await learningApi.uncompleteLesson(module.id, lesson.id)
        : await learningApi.completeLesson(module.id, lesson.id);

      // Update local state
      setCourseDetail((prev) => {
        if (!prev) return null;
        const updatedLessons = prev.lessons.map((l) =>
          l.id === lesson.id ? { ...l, completed: !isCompleted } : l
        );
        return {
          ...prev,
          progress: res.progressPercent,
          completedLessons: res.completedLessons,
          lessons: updatedLessons,
        };
      });

      // Notify parent page
      onUpdateProgress(module.id, res.progressPercent);
    } catch (err) {
      console.error('Failed to toggle lesson completion:', err);
    } finally {
      setIsMutating(false);
    }
  };

  // Reset entire course progress
  const handleReset = async () => {
    if (!module || isMutating) return;

    try {
      setIsMutating(true);
      const res = await learningApi.resetCourseProgress(module.id);
      setCourseDetail((prev) => {
        if (!prev) return null;
        const updatedLessons = prev.lessons.map((l) => ({ ...l, completed: false }));
        return {
          ...prev,
          progress: 0.0,
          completedLessons: [],
          lessons: updatedLessons,
        };
      });
      onUpdateProgress(module.id, 0);
    } catch (err) {
      console.error('Failed to reset course progress:', err);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={courseDetail?.title || module.title}
      subtitle={`${courseDetail?.category || module.category} • ${courseDetail?.difficulty || module.difficulty} Level • ${courseDetail?.duration || module.duration}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Module Header Overview */}
        <div className="p-3.5 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/60 border border-[#E8E8E8] dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#0A66C2] dark:text-blue-400 font-bold">
              Progress: {currentProgress}%
            </span>
            <div className="w-32 h-1.5 rounded-full bg-white dark:bg-slate-900 overflow-hidden border border-[#D9D9D9] dark:border-slate-700">
              <div
                className="h-full bg-[#0A66C2] dark:bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {currentProgress === 100 && (
              <Badge variant="success" size="sm">
                Completed
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentProgress > 0 && (
              <Button
                size="xs"
                variant="ghost"
                disabled={isMutating}
                onClick={handleReset}
                icon={<RotateCcw className="w-3 h-3 text-[#788896] dark:text-slate-400" />}
              >
                Reset Progress
              </Button>
            )}
            {activeLesson && (
              <Button
                size="xs"
                variant={activeLesson.completed ? 'outline' : 'primary'}
                disabled={isMutating}
                onClick={() => handleToggleLesson(activeLesson)}
                icon={
                  isMutating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : activeLesson.completed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )
                }
              >
                {activeLesson.completed ? 'Mark Incomplete' : 'Complete Lesson'}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-xs text-[#56687A] dark:text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#0A66C2] dark:text-blue-400" />
            Loading course syllabus and verification status...
          </div>
        ) : (
          /* 2-Column Layout: Lessons Syllabus on Left, Lesson Content on Right */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
            {/* Syllabus (4 Cols) */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-[#788896] dark:text-slate-400 block">
                  Course Syllabus ({lessons.length} Lessons)
                </span>
                <span className="text-[10px] text-[#0A66C2] dark:text-blue-400 font-mono font-semibold">
                  {lessons.filter((l) => l.completed).length} / {lessons.length} Done
                </span>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {lessons.map((lesson, idx) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLessonIdx(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-start justify-between gap-2 shadow-xs ${
                      activeLessonIdx === idx
                        ? 'bg-[#E8F3FF] dark:bg-blue-950/40 border-[#0A66C2] dark:border-blue-500 text-[#1D2226] dark:text-slate-100'
                        : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 text-[#56687A] dark:text-slate-300 hover:border-[#0A66C2]/40 dark:hover:border-blue-500/40'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-semibold text-[11px] leading-tight truncate text-[#1D2226] dark:text-slate-100">
                        {idx + 1}. {lesson.title}
                      </p>
                      <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">{lesson.duration}</span>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLesson(lesson);
                      }}
                      className="p-1 hover:bg-[#F3F6F8] dark:hover:bg-slate-800 rounded transition"
                      title={lesson.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#D9D9D9] dark:text-slate-600 hover:text-[#0A66C2] dark:hover:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Sandbox / Lesson View (7 Cols) */}
            <div className="md:col-span-7 space-y-2.5">
              {activeLesson ? (
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/60 border border-[#E8E8E8] dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E8E8E8] dark:border-slate-700/60">
                    <span className="font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5 truncate">
                      <Code2 className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400 flex-shrink-0" />
                      {activeLesson.title}
                    </span>
                    <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono flex-shrink-0">
                      {activeLesson.duration}
                    </span>
                  </div>

                  {activeLesson.description && (
                    <p className="text-[11px] text-[#38434F] dark:text-slate-200 leading-relaxed">
                      {activeLesson.description}
                    </p>
                  )}

                  {activeLesson.snippet ? (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[#788896] dark:text-slate-400 font-semibold uppercase">
                        Technical Architecture Blueprint:
                      </span>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 font-mono text-[11px] text-[#0A66C2] dark:text-blue-400 overflow-x-auto leading-relaxed shadow-xs max-h-[220px]">
                        <pre>{activeLesson.snippet}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 text-center space-y-2">
                      <BookOpen className="w-6 h-6 text-[#0A66C2] dark:text-blue-400 mx-auto" />
                      <p className="text-xs font-semibold text-[#1D2226] dark:text-slate-100">Interactive Lesson Content</p>
                      <p className="text-[11px] text-[#56687A] dark:text-slate-400 max-w-sm mx-auto">
                        Study the core principles above and mark this lesson complete to track your mastery.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#788896] dark:text-slate-400 font-mono">
                      Status: {activeLesson.completed ? '✓ Completed' : 'Pending'}
                    </span>
                    <Button
                      size="xs"
                      variant={activeLesson.completed ? 'outline' : 'primary'}
                      disabled={isMutating}
                      onClick={() => handleToggleLesson(activeLesson)}
                    >
                      {activeLesson.completed ? 'Unmark Lesson' : 'Mark Lesson Complete'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-[#56687A] dark:text-slate-400">
                  Select a lesson from the syllabus to view architecture blueprints and exercises.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] dark:border-slate-800">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />}
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
