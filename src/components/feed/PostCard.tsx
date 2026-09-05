import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FeedPost, FeedComment, PostType } from '../../data/mockFeed';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ShieldCheck,
  Code2,
  Trophy,
  Award,
  Layers,
  Sparkles,
  Briefcase,
  BookOpen,
  Send,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onShare: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onSave,
  onShare,
  onAddComment,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  const postTypeBadges: Record<
    PostType,
    { variant: 'brand' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'; icon: any }
  > = {
    Achievement: { variant: 'success', icon: Trophy },
    Project: { variant: 'brand', icon: Layers },
    Certification: { variant: 'success', icon: Award },
    'Learning Update': { variant: 'info', icon: BookOpen },
    'Career Advice': { variant: 'warning', icon: Sparkles },
    'Technical Discussion': { variant: 'brand', icon: Code2 },
    'Job Announcement': { variant: 'brand', icon: Briefcase },
  };

  const badgeConfig = postTypeBadges[post.type] || { variant: 'neutral', icon: Sparkles };
  const TypeIcon = badgeConfig.icon;

  const handleShareClick = () => {
    onShare(post.id);
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(post.id, newComment.trim());
    setNewComment('');
  };

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm hover:border-[#0A66C2]/40 transition">
      {/* Header: Author + Post Type Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] font-bold text-xs flex-shrink-0">
            {post.author.avatarInitials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-[#1D2226] truncate">{post.author.name}</h4>
              {post.author.isVerified && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              )}
              {post.author.company && (
                <span className="text-[10px] text-[#56687A] font-mono">
                  • {post.author.company}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#56687A] truncate">{post.author.headline}</p>
            <span className="text-[10px] text-[#788896] font-mono">{post.createdAt}</span>
          </div>
        </div>

        {/* Post Type Badge */}
        <Badge variant={badgeConfig.variant} size="sm" className="flex items-center gap-1 flex-shrink-0">
          <TypeIcon className="w-3 h-3" />
          <span>{post.type}</span>
        </Badge>
      </div>

      {/* Main Post Content */}
      <div className="text-xs text-[#38434F] leading-relaxed whitespace-pre-wrap font-sans">
        {post.content}
      </div>

      {/* Code Snippet if present */}
      {post.codeSnippet && (
        <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#D9E2EC] font-mono text-[11px] text-[#1D6F42] overflow-x-auto leading-relaxed shadow-inner">
          <pre>{post.codeSnippet}</pre>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono text-[#0A66C2] hover:text-[#004182] cursor-pointer transition"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar: Like, Comment, Share, Save */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] text-xs text-[#56687A]">
        <div className="flex items-center gap-3">
          {/* Like Button */}
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg transition font-mono text-[11px]',
              post.isLiked
                ? 'text-rose-600 bg-rose-50'
                : 'text-[#56687A] hover:text-rose-600 hover:bg-[#F3F6F8]'
            )}
          >
            <Heart
              className={cn(
                'w-3.5 h-3.5 transition-transform',
                post.isLiked ? 'fill-rose-400 stroke-rose-400 scale-110' : ''
              )}
            />
            <span>{post.likesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition font-mono text-[11px]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments.length || post.commentsCount}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition font-mono text-[11px]"
            title="Copy link to post"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>{post.sharesCount}</span>
              </>
            )}
          </button>
        </div>

        {/* Save / Bookmark Button */}
        <button
          onClick={() => onSave(post.id)}
          className={cn(
            'p-1.5 rounded-lg transition',
            post.isSaved
              ? 'text-amber-600 bg-amber-50'
              : 'text-[#56687A] hover:text-amber-600 hover:bg-[#F3F6F8]'
          )}
          title={post.isSaved ? 'Remove Bookmark' : 'Save Post'}
        >
          <Bookmark className={cn('w-3.5 h-3.5', post.isSaved ? 'fill-amber-500 text-amber-500' : '')} />
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-[#E8E8E8] space-y-3 animate-in fade-in duration-150">
          {/* Add Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your thoughts or technical feedback..."
              className="flex-1 bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            />
            <Button type="submit" size="xs" variant="primary" disabled={!newComment.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </form>

          {/* Comments List */}
          {post.comments.length === 0 ? (
            <p className="text-[11px] text-[#788896] italic">No comments yet. Be the first to share feedback.</p>
          ) : (
            <div className="space-y-2">
              {post.comments.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#1D2226]">{c.authorName}</span>
                    <span className="text-[10px] text-[#788896] font-mono">{c.createdAt}</span>
                  </div>
                  <p className="text-[11px] text-[#38434F]">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PostCard;
