import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FeedPost, FeedComment, PostType } from '../../types';
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
import { resolveMediaUrl } from '../../utils/media';
import { formatDateTime } from '../../utils/formatters';
import { PostMediaSlider } from './PostMediaSlider';
import { PostCommentsSection } from './PostCommentsSection';

export interface PostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onShare: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onSave,
  onShare,
  onAddComment,
  onDeleteComment,
}) => {
  const [showComments, setShowComments] = useState(false);
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

  const authorProfileId = post.author?.id || post.authorId;
  const authorProfileLink = authorProfileId ? `/profile/${authorProfileId}` : '/profile';

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm hover:border-[#0A66C2]/40 transition">
      {/* Header: Author + Post Type Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={authorProfileLink}
            className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/30"
          >
            {post.author.avatarUrl ? (
              <img
                src={resolveMediaUrl(post.author.avatarUrl)}
                alt={post.author.name}
                className="w-full h-full object-cover border border-[#d0e6fc]"
              />
            ) : (
              <div className="w-full h-full bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] font-bold text-xs hover:border-[#0A66C2] transition">
                {post.author.avatarInitials}
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={authorProfileLink}
                className="text-xs font-bold text-[#1D2226] hover:text-[#0A66C2] hover:underline transition truncate"
              >
                {post.author.name}
              </Link>
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
            <span className="text-[10px] text-[#788896]" title={post.createdAt}>{formatDateTime(post.createdAt)}</span>
          </div>
        </div>

        {/* Post Type Badge */}
        <Badge variant={badgeConfig.variant} size="sm" className="flex items-center gap-1 flex-shrink-0">
          <TypeIcon className="w-3 h-3" />
          <span>{post.type}</span>
        </Badge>
      </div>

      {/* Main Post Content */}
      {post.content && (
        <div className="text-xs text-[#38434F] leading-relaxed whitespace-pre-wrap font-sans">
          {post.content}
        </div>
      )}

      {/* Media Attachments: Interactive Slider / Carousel for Photos & Videos */}
      {post.media && post.media.length > 0 && (
        <PostMediaSlider media={post.media} />
      )}

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
        <PostCommentsSection
          post={post}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </Card>
  );
};

export default PostCard;
