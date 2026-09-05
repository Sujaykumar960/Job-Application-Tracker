import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PROGRAMMING_LANGUAGES } from '../data/languagesData';
import { LanguageItem, LanguageQuestion } from '../types/languages';
import {
  Code2,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Terminal,
  Play,
  Check,
  Search,
  Filter,
  Layers,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const LanguageDetailPage: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();

  // Find language in data repository
  const langData: LanguageItem | undefined = useMemo(() => {
    return (
      PROGRAMMING_LANGUAGES.find((l) => l.slug === language) ||
      PROGRAMMING_LANGUAGES.find((l) => l.id === language) ||
      PROGRAMMING_LANGUAGES[0]
    );
  }, [language]);

  // Active topic filter
  const [selectedTopicId, setSelectedTopicId] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuestion, setSearchQuestion] = useState('');

  // Practice IDE modal state
  const [activeQuestion, setActiveQuestion] = useState<LanguageQuestion | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [codeContent, setCodeContent] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    if (!langData) return [];
    return langData.questions.filter((q) => {
      const qText = searchQuestion.toLowerCase().trim();
      const matchesSearch = !qText || q.title.toLowerCase().includes(qText);
      const matchesTopic = selectedTopicId === 'All' || q.topicId === selectedTopicId;
      const matchesDifficulty =
        selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;
      return matchesSearch && matchesTopic && matchesDifficulty;
    });
  }, [langData, searchQuestion, selectedTopicId, selectedDifficulty]);

  if (!langData) {
    return (
      <div className="p-12 text-center space-y-3">
        <h2 className="text-base font-bold text-[#1D2226]">Language Track Not Found</h2>
        <p className="text-xs text-[#56687A]">The requested language curriculum does not exist.</p>
        <Link to="/learning/languages">
          <Button size="sm" variant="primary">
            Return to Languages
          </Button>
        </Link>
      </div>
    );
  }

  const handleOpenPracticeModal = (question: LanguageQuestion) => {
    setActiveQuestion(question);
    setCodeContent(question.starterCode);
    setTestOutput(null);
  };

  const handleRunTests = () => {
    setIsTestRunning(true);
    setTimeout(() => {
      setIsTestRunning(false);
      setTestOutput(`✓ Test Suite Passed: 3/3 tests passed in 48ms.\n✓ Memory efficiency: 14.2 MB (Top 5%)\n✓ Execution throughput: 45,200 ops/sec`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={`${langData.name} Mastery Curriculum`}
        description={langData.tagline}
        badge={
          <Badge variant="brand" size="sm">
            {langData.category}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/learning/languages">
              <Button size="sm" variant="outline">
                All Languages
              </Button>
            </Link>
            <Link to="/learning">
              <Button size="sm" variant="secondary">
                Learning Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/progress"
            className="font-semibold text-emerald-800 underline text-xs flex items-center gap-1 flex-shrink-0"
          >
            View Career Progress <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LANGUAGE OVERVIEW & PROGRESS HERO CARD                                 */}
      {/* ========================================================================= */}
      <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl font-mono border shadow-xs',
                langData.iconBg,
                langData.textColor,
                langData.borderAccent
              )}
            >
              {langData.iconText}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-[#1D2226]">{langData.name}</h2>
                <Badge variant="brand" size="sm">
                  {langData.progress}% Mastered
                </Badge>
              </div>
              <p className="text-xs text-[#56687A] max-w-xl leading-relaxed">
                {langData.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:border-l sm:border-[#E8E8E8] sm:pl-4 text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#788896] uppercase">Questions Solved</span>
              <p className="font-bold text-[#1D2226]">
                {langData.solvedQuestions} / {langData.totalQuestions}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#788896] uppercase">Accuracy</span>
              <p className="font-bold text-emerald-700">{langData.accuracy}%</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#788896] uppercase">Daily Streak</span>
              <p className="font-bold text-[#8A6100] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {langData.streak}d
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-[#E8E8E8]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#788896]">Curriculum Completion</span>
            <span className="font-bold text-emerald-700">{langData.progress}% Complete</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#F3F6F8] overflow-hidden border border-[#E8E8E8]">
            <div
              className="h-full bg-[#0A66C2] rounded-full transition-all duration-700"
              style={{ width: `${langData.progress}%` }}
            />
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. RECOMMENDED NEXT TOPIC                                                 */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-[#E8F3FF] border border-[#d0e6fc] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-mono uppercase font-bold text-[#0A66C2] tracking-wider">
              Recommended Next Topic
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#1D2226]">
            {langData.recommendedNextTopic.title}
          </h3>
          <p className="text-xs text-[#38434F]">
            {langData.recommendedNextTopic.description}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-mono text-[#788896] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {langData.recommendedNextTopic.estTime}
          </span>
          <Button
            size="sm"
            variant="primary"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => {
              if (langData.questions.length > 0) {
                handleOpenPracticeModal(langData.questions[0]);
              }
            }}
          >
            Start Topic
          </Button>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. CORE TOPICS GRID                                                       */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3. CORE TOPICS GRID                                                       */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#0A66C2]" />
            Structured Topics ({langData.topics.length})
          </span>
          {selectedTopicId !== 'All' && (
            <button
              onClick={() => setSelectedTopicId('All')}
              className="text-xs text-[#0A66C2] hover:text-[#004182] font-semibold"
            >
              Show All Topics
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {langData.topics.map((t) => {
            const topicProgress = Math.round((t.completedQuestions / t.questionsCount) * 100);

            return (
              <button
                key={t.id}
                onClick={() => setSelectedTopicId(t.id === selectedTopicId ? 'All' : t.id)}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-3 group cursor-pointer select-none shadow-xs',
                  selectedTopicId === t.id
                    ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm'
                    : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40 hover:bg-[#F3F6F8]'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#788896] uppercase font-semibold">
                      {t.difficulty}
                    </span>
                    {t.isCompleted && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition line-clamp-1">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-[#56687A] line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="space-y-1 w-full pt-2 border-t border-[#E8E8E8]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#788896]">
                    <span>
                      {t.completedQuestions} / {t.questionsCount} solved
                    </span>
                    <span className="font-bold text-[#1D2226]">{topicProgress}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[#F3F6F8] overflow-hidden">
                    <div
                      className="h-full bg-[#0A66C2] rounded-full transition-all duration-500"
                      style={{ width: `${topicProgress}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PRACTICE QUESTIONS LIST                                                */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
        {/* Toolbar: Search, Topic, Difficulty */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E8E8E8]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuestion}
              onChange={(e) => setSearchQuestion(e.target.value)}
              placeholder="Search practice questions by title..."
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="All">All Topics</option>
              {langData.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Question Rows */}
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#56687A] italic">
            No practice questions match your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E8]">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-[#F3F6F8] px-2 rounded-xl transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    {q.isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D9D9D9]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4
                      onClick={() => handleOpenPracticeModal(q)}
                      className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition cursor-pointer truncate"
                    >
                      {q.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#788896] font-mono">
                      <span
                        className={cn(
                          'font-semibold',
                          q.difficulty === 'Easy'
                            ? 'text-[#137333]'
                            : q.difficulty === 'Medium'
                            ? 'text-[#8A6100]'
                            : 'text-[#B3261E]'
                        )}
                      >
                        {q.difficulty}
                      </span>
                      <span>•</span>
                      <span>{q.accuracy}% Acceptance</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {q.tags.map((tag) => (
                          <span key={tag} className="text-[#788896]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="xs"
                    variant={q.isSolved ? 'outline' : 'primary'}
                    onClick={() => handleOpenPracticeModal(q)}
                    icon={<Play className="w-3 h-3" />}
                  >
                    {q.isSolved ? 'Solve Again' : 'Solve in IDE'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE PRACTICE CODE SANDBOX MODAL                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(activeQuestion)}
        onClose={() => setActiveQuestion(null)}
        title={activeQuestion?.title || 'Practice Question'}
        subtitle={`${langData.name} • ${activeQuestion?.difficulty} Difficulty`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Question Specs */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] text-xs">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  activeQuestion?.difficulty === 'Easy'
                    ? 'success'
                    : activeQuestion?.difficulty === 'Medium'
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              >
                {activeQuestion?.difficulty}
              </Badge>
              <span className="text-[#788896] font-mono">
                Acceptance: {activeQuestion?.accuracy}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              {activeQuestion?.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded bg-white text-[#56687A] text-[10px] font-mono border border-[#D9D9D9]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Code Editor Simulator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#788896] font-mono">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#0A66C2]" />
                Solution Editor ({langData.name})
              </span>
              <span>UTF-8 • Tab Size: 4</span>
            </div>

            <textarea
              rows={8}
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              className="w-full bg-[#F3F6F8] text-[#1D2226] font-mono text-xs rounded-xl border border-[#D9D9D9] p-3.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] leading-relaxed"
            />
          </div>

          {/* Test Runner Results Area */}
          {testOutput && (
            <div className="p-3 rounded-xl bg-[#E6F4EA] border border-[#c6ecd2] text-xs font-mono text-[#137333] whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150 font-semibold">
              {testOutput}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8]">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setActiveQuestion(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setActiveQuestion(null);
                  navigate('/learning/code');
                }}
                icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" />}
              >
                Full Monaco IDE
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={isTestRunning}
                onClick={handleRunTests}
                icon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Run Tests
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  handleRunTests();
                  setTimeout(() => {
                    if (activeQuestion) {
                      setToastMessage(`🎉 Solution for "${activeQuestion.title}" Accepted! +25 XP credited to Career Progress.`);
                    }
                    setActiveQuestion(null);
                    setTimeout(() => setToastMessage(null), 5000);
                  }, 700);
                }}
                icon={<Check className="w-3.5 h-3.5" />}
              >
                Submit Solution
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LanguageDetailPage;
