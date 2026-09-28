import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FeedPost, FeedComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../utils/media';
import { formatDateTime } from '../../utils/formatters';
import { getAvatarGradientClass, getAvatarInitials } from '../chat/avatarUtils';
import { postApi } from '../../api/postApi';
import { cn } from '../../utils/cn';
import {
  Send,
  Heart,
  MessageSquare,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  CornerDownRight,
} from 'lucide-react';

export interface PostCommentsSectionProps {
  post: FeedPost;
  onAddComment: (postId: string, commentText: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
}

export const PostCommentsSection: React.FC<PostCommentsSectionProps> = ({
  post,
  onAddComment,
  onDeleteComment,
}) => {
  const { user: currentUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Record<string, { likesCount: number; isLiked: boolean }>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const comments = post.comments || [];
  const postAuthorId = post.author?.id || post.authorId;
  const postAuthorName = post.author?.name;

  // Handle adding new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddComment(post.id, newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reply shortcut: tag author in input
  const handleReply = (authorName: string) => {
    setNewComment((prev) => {
      const tag = `@${authorName.trim()} `;
      if (prev.startsWith(tag)) return prev;
      return tag + prev;
    });
    inputRef.current?.focus();
  };

  // Toggle Like on Comment
  const handleToggleLike = async (commentId: string, currentLiked: boolean, currentCount: number) => {
    // Optimistic update
    const nextLiked = !currentLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: { isLiked: nextLiked, likesCount: nextCount },
    }));

    try {
      const res = await postApi.likeComment(commentId, post.id);
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: { isLiked: res.isLiked, likesCount: res.likesCount },
      }));
    } catch (err) {
      // Revert on failure
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: { isLiked: currentLiked, likesCount: currentCount },
      }));
    }
  };

  // Handle delete comment
  const handleDelete = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDeleteComment?.(post.id, commentId);
    }
  };

  // Comments to display (truncated to 3 by default if > 3)
  const visibleComments = showAllComments || comments.length <= 3 ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3;

  // Current logged in user avatar display
  const currentUserAvatarUrl = currentUser?.avatarUrl || currentUser?.avatar;
  const currentUserName = currentUser?.name || 'You';
  const currentUserInitials = getAvatarInitials(currentUserName);

  return (
    <div className="pt-3 border-t border-[#E8E8E8] dark:border-slate-700 space-y-3.5 animate-in fade-in duration-200">
      {/* Add Comment Input Composer */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        {/* Current user profile photo / initials */}
        <Link
          to="/profile"
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200/80 shadow-xs focus:ring-2 focus:ring-[#0A66C2]/30"
          title="View your profile"
        >
          {currentUserAvatarUrl ? (
            <img
              src={resolveMediaUrl(currentUserAvatarUrl)}
              alt={currentUserName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'w-full h-full flex items-center justify-center font-bold text-[11px]',
                getAvatarGradientClass(currentUser?.id || currentUserName)
              )}
            >
              {currentUserInitials}
            </div>
          )}
        </Link>

        {/* Input box */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add your thoughts or technical feedback..."
            className="w-full bg-[#F3F6F8] dark:bg-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-xl border border-[#D9D9D9] dark:border-slate-600 focus:border-[#0A66C2] px-3.5 py-2 pr-10 transition focus:outline-none focus:ring-1 focus:ring-[#0A66C2] shadow-inner"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              'absolute right-1.5 p-1.5 rounded-lg transition-all',
              newComment.trim() && !isSubmitting
                ? 'text-white bg-[#0A66C2] hover:bg-[#004182] shadow-xs active:scale-95'
                : 'text-[#9AA8B6] bg-transparent cursor-not-allowed'
            )}
            title="Send comment"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="py-2 px-1 text-center">
          <p className="text-[11px] text-[#788896] italic">No comments yet. Be the first to share feedback.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleComments.map((comment: FeedComment) => {
            const authorId = comment.authorId;
            const profileLink = authorId ? `/profile/${authorId}` : '/profile';
            const isPostAuthor =
              (authorId && authorId === postAuthorId) ||
              (comment.authorName && comment.authorName === postAuthorName);
            const isOwnComment = currentUser && authorId === currentUser.id;
            const canDelete = isOwnComment || (currentUser && currentUser.id === postAuthorId);

            const likeState = commentLikes[comment.id] || {
              likesCount: comment.likesCount || 0,
              isLiked: !!comment.isLiked,
            };

            return (
              <div
                key={comment.id}
                className="group p-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E9EFF5] dark:border-slate-700 hover:border-slate-300/80 dark:hover:border-slate-600 transition-all space-y-2"
              >
                {/* Header: Photo, Name, Headline, Profile Link, Timestamp */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Author Avatar Photo or Gradient Initials */}
                    <Link
                      to={profileLink}
                      className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200/90 shadow-xs hover:ring-2 hover:ring-[#0A66C2]/40 transition group/avatar"
                      title={`View ${comment.authorName}'s profile`}
                    >
                      {comment.authorAvatarUrl ? (
                        <img
                          src={resolveMediaUrl(comment.authorAvatarUrl)}
                          alt={comment.authorName}
                          className="w-full h-full object-cover group-hover/avatar:scale-105 transition duration-200"
                        />
                      ) : (
                        <div
                          className={cn(
                            'w-full h-full flex items-center justify-center font-bold text-[11px] group-hover/avatar:scale-105 transition duration-200',
                            getAvatarGradientClass(authorId || comment.authorName)
                          )}
                        >
                          {getAvatarInitials(comment.authorName, comment.authorInitials)}
                        </div>
                      )}
                    </Link>

                    {/* Author Meta Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={profileLink}
                          className="font-bold text-xs text-[#1D2226] dark:text-slate-100 hover:text-[#0A66C2] dark:hover:text-blue-400 hover:underline transition truncate"
                        >
                          {comment.authorName}
                        </Link>

                        {isPostAuthor && (
                          <span className="px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/50 text-[10px] font-semibold leading-tight flex-shrink-0">
                            Author
                          </span>
                        )}

                        <span
                          className="text-[10px] text-[#8696A6]"
                          title={comment.createdAt}
                        >
                          • {formatDateTime(comment.createdAt)}
                        </span>
                      </div>

                      {/* Headline / Role & View Profile Shortcut */}
                      <div className="flex items-center gap-2 text-[11px] text-[#56687A] dark:text-slate-400">
                        <span className="truncate max-w-[200px] sm:max-w-xs">
                          {comment.authorHeadline || 'Software Engineer'}
                        </span>
                        <Link
                          to={profileLink}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#0A66C2] dark:text-blue-400 hover:underline opacity-80 hover:opacity-100 flex-shrink-0"
                          title={`View ${comment.authorName}'s full profile`}
                        >
                          <span>View profile</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button (if authorized) */}
                  {canDelete && onDeleteComment && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Text */}
                <div className="pl-10.5 text-xs text-[#28323D] dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-sans">
                  {comment.content}
                </div>

                {/* Action Bar: Like, Reply */}
                <div className="pl-10.5 pt-1 flex items-center gap-4 text-[11px] text-[#6A7887] dark:text-slate-500">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleLike(comment.id, likeState.isLiked, likeState.likesCount)}
                    className={cn(
                      'flex items-center gap-1 hover:text-rose-600 transition font-medium',
                      likeState.isLiked ? 'text-rose-600 font-semibold' : 'text-[#6A7887]'
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-3.5 h-3.5 transition-transform active:scale-125',
                        likeState.isLiked ? 'fill-rose-500 stroke-rose-500 scale-105' : ''
                      )}
                    />
                    <span>{likeState.likesCount > 0 ? likeState.likesCount : 'Like'}</span>
                  </button>

                  {/* Reply Button */}
                  <button
                    type="button"
                    onClick={() => handleReply(comment.authorName)}
                    className="flex items-center gap-1 hover:text-[#0A66C2] transition font-medium"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show More / Show Less Toggle Button */}
          {hasMoreComments && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowAllComments(!showAllComments)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A66C2] hover:text-[#004182] hover:underline transition"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show fewer comments</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View all {comments.length} comments</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCommentsSection;
