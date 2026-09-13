import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LeftProfileSummary } from '../components/feed/LeftProfileSummary';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { RightTrendingSidebar } from '../components/feed/RightTrendingSidebar';
import { FeedPost, PostType } from '../types';
import { postApi } from '../api/postApi';
import {
  MessageSquare,
  Sparkles,
  Users,
  Search,
  Filter,
  Bookmark,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>('All');
  const [feedSearch, setFeedSearch] = useState('');

  // Fetch posts from backend
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await postApi.getPosts();
        setPosts(data);
      } catch (err) {
        setError('Failed to load feed. Please try again.');
        console.error('Feed fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Publish New Post
  const handlePublishPost = async (newPost: FeedPost | FormData) => {
    try {
      let created: FeedPost;
      if (newPost instanceof FormData) {
        created = await postApi.createPost(newPost);
      } else {
        created = await postApi.createPost({
          content: newPost.content,
          type: newPost.type,
          tags: newPost.tags,
          codeSnippet: newPost.codeSnippet,
        });
      }
      setPosts((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to publish post:', err);
      alert('Failed to publish post. Please try again.');
    }
  };

  // Like Toggle
  const handleLike = async (postId: string) => {
    try {
      const result = await postApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: result.isLiked, likesCount: result.likesCount }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  // Save / Bookmark Toggle
  const handleSave = async (postId: string) => {
    try {
      const result = await postApi.bookmarkPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: result.isSaved } : p))
      );
    } catch (err) {
      console.error('Failed to bookmark post:', err);
    }
  };

  // Share Increment
  const handleShare = (postId: string) => {
    // For now, just increment locally (backend share endpoint not implemented)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, sharesCount: p.sharesCount + 1 }
          : p
      )
    );
  };

  // Add Comment
  const handleAddComment = async (postId: string, commentText: string) => {
    try {
      const newComment = await postApi.addComment(postId, commentText);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [newComment, ...p.comments],
                commentsCount: p.commentsCount + 1,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Please try again.');
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Search
      const q = feedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.content.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));

      // Type or Saved
      let matchesType = true;
      if (selectedType === 'Saved') {
        matchesType = p.isSaved;
      } else if (selectedType !== 'All') {
        matchesType = p.type === selectedType;
      }

      return matchesSearch && matchesType;
    });
  }, [posts, feedSearch, selectedType]);

  const savedCount = useMemo(() => posts.filter((p) => p.isSaved).length, [posts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading feed...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load feed</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <MessageSquare className="w-12 h-12 text-[#788896]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">No posts yet</h3>
          <p className="text-[#56687A] mt-1">Be the first to share something with the community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Professional Engineering Feed"
        description="Share architectural debriefs, benchmark findings, project milestones, and connect with engineers."
        badge={
          <Badge variant="brand" size="sm">
            Live Discussions
          </Badge>
        }
      />

      {/* ========================================================================= */}
      {/* 3-COLUMN RESPONSIVE LAYOUT (Prioritized for 1366px Laptop & Desktop)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ==================== LEFT: PROFILE SUMMARY (4 COLS ON LAPTOP, 3 ON LARGE) ==================== */}
        <div className="lg:col-span-4 laptop-lg:col-span-3 space-y-4">
          <LeftProfileSummary
            selectedType={selectedType}
            onSelectType={setSelectedType}
            savedCount={savedCount}
          />
          <div className="block laptop-lg:hidden">
            <RightTrendingSidebar />
          </div>
        </div>

        {/* ==================== CENTER: FEED (8 COLS ON LAPTOP, 6 ON LARGE) ==================== */}
        <div className="lg:col-span-8 laptop-lg:col-span-6 space-y-4">
          {/* Create Post Composer */}
          <CreatePostCard onPublish={handlePublishPost} />

          {/* Active Filter Indicator if not All */}
          {selectedType !== 'All' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D9D9D9] text-xs shadow-sm">
              <span className="text-[#56687A]">
                Filtered by: <strong className="text-[#0A66C2]">{selectedType}</strong> ({filteredPosts.length} posts)
              </span>
              <button
                onClick={() => setSelectedType('All')}
                className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-semibold"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Feed Posts List */}
          {posts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No posts yet.</p>
              <p className="text-xs text-[#56687A]">
                Be the first to publish a discussion or learning update.
              </p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No posts found in this category</p>
              <p className="text-xs text-[#56687A]">
                {selectedType === 'Saved'
                  ? 'You have not saved any posts yet.'
                  : 'Try selecting a different topic filter.'}
              </p>
              <Button size="xs" variant="outline" onClick={() => setSelectedType('All')}>
                View All Posts
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onSave={handleSave}
                  onShare={handleShare}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          )}
        </div>

        {/* ==================== RIGHT: RECOMMENDATIONS / TRENDING (3 COLS ON 1440PX+) ==================== */}
        <div className="hidden laptop-lg:block laptop-lg:col-span-3 space-y-4">
          <RightTrendingSidebar />
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
