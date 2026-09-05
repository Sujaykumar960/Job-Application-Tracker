import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { PostType, FeedPost } from '../../data/mockFeed';
import {
  Send,
  Code2,
  Tag,
  Sparkles,
  Trophy,
  Award,
  Layers,
  Briefcase,
  BookOpen,
  MessageSquare,
  X,
} from 'lucide-react';

export interface CreatePostCardProps {
  onPublish: (newPost: FeedPost) => void;
}

const POST_TYPES: Array<{ type: PostType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'Technical Discussion', label: 'Tech Discussion', icon: Code2 },
  { type: 'Achievement', label: 'Achievement', icon: Trophy },
  { type: 'Project', label: 'Project', icon: Layers },
  { type: 'Certification', label: 'Certification', icon: Award },
  { type: 'Learning Update', label: 'Learning Update', icon: BookOpen },
  { type: 'Career Advice', label: 'Career Advice', icon: Sparkles },
  { type: 'Job Announcement', label: 'Job Opening', icon: Briefcase },
];

export const CreatePostCard: React.FC<CreatePostCardProps> = ({ onPublish }) => {
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>('Technical Discussion');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const post: FeedPost = {
      id: `post-${Date.now()}`,
      author: {
        name: 'Alex Rivera',
        headline: 'Distributed Systems & Backend Engineer',
        avatarInitials: 'AR',
        company: 'CloudScale',
        isVerified: true,
      },
      type: selectedType,
      createdAt: 'Just now',
      content: content.trim(),
      codeSnippet: showCodeInput && codeSnippet.trim() ? codeSnippet.trim() : undefined,
      tags: tags.length > 0 ? tags : ['Engineering', 'CareerX'],
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      isSaved: false,
      sharesCount: 0,
      comments: [],
    };

    onPublish(post);

    // Reset
    setContent('');
    setCodeSnippet('');
    setShowCodeInput(false);
    setTagsInput('');
  };

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
      <form onSubmit={handlePublish} className="space-y-3">
        {/* Author Avatar + Textarea */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0A66C2] border border-[#004182] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            AR
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share an achievement, architectural finding, or technical question..."
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] p-3 focus:outline-none focus:ring-2 focus:ring-[#E8F3FF] focus:border-[#0A66C2] leading-relaxed resize-none transition"
            />
          </div>
        </div>

        {/* Optional Code Snippet Input */}
        {showCodeInput && (
          <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#D9E2EC] space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-[#56687A] font-mono">
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" /> Code Snippet / Architecture Schema
              </span>
              <button
                type="button"
                onClick={() => setShowCodeInput(false)}
                className="text-[#788896] hover:text-[#1D2226]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="// Paste benchmark, Go concurrency routine, or Redis Lua script..."
              className="w-full bg-white text-[#1D6F42] font-mono text-[11px] rounded-lg border border-[#D9E2EC] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] leading-relaxed"
            />
          </div>
        )}

        {/* Post Type Selector Pills */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#56687A] font-semibold block">
            Post Category
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {POST_TYPES.map((pt) => {
              const Icon = pt.icon;
              return (
                <button
                  key={pt.type}
                  type="button"
                  onClick={() => setSelectedType(pt.type)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 border ${
                    selectedType === pt.type
                      ? 'bg-[#0A66C2] text-white border-[#0A66C2] shadow-sm'
                      : 'bg-[#F3F6F8] text-[#56687A] hover:text-[#1D2226] hover:bg-[#E8E8E8] border-[#D9D9D9]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{pt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer: Tags, Code toggle & Publish */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E8E8E8] flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Tag className="w-3.5 h-3.5 text-[#788896] flex-shrink-0" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags: #Kafka, #Go, #SystemDesign (comma separated)"
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-[11px] rounded-lg border border-[#D9D9D9] px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            {!showCodeInput && (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="px-2.5 py-1 rounded-lg bg-[#F3F6F8] text-[#56687A] hover:text-[#1D2226] hover:bg-[#E8E8E8] border border-[#D9D9D9] text-[11px] font-mono flex items-center gap-1 transition"
                title="Attach code snippet"
              >
                <Code2 className="w-3 h-3 text-[#0A66C2]" />
                <span>+ Code</span>
              </button>
            )}

            <Button
              type="submit"
              size="xs"
              variant="primary"
              disabled={!content.trim()}
              icon={<Send className="w-3 h-3" />}
            >
              Publish Post
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CreatePostCard;
