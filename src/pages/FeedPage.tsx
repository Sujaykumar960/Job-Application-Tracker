import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LeftProfileSummary } from '../components/feed/LeftProfileSummary';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { RightTrendingSidebar } from '../components/feed/RightTrendingSidebar';
import { INITIAL_FEED_POSTS, FeedPost, PostType } from '../../src/data/mockFeed';
import {
  MessageSquare,
  Sparkles,
  Users,
  Search,
  Filter,
  Bookmark,
  Share2,
} from 'lucide-react';

const FEED_STORAGE_KEY = 'careerx_feed_posts_v2';

export const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem(FEED_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_FEED_POSTS;
      }
    }
    return INITIAL_FEED_POSTS;
  });

  const [selectedType, setSelectedType] = useState<string>('All');
  const [feedSearch, setFeedSearch] = useState('');

  // Persist feed updates to localStorage
  const syncPosts = (newPosts: FeedPost[]) => {
    setPosts(newPosts);
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(newPosts));
  };

  // Publish New Post
  const handlePublishPost = (newPost: FeedPost) => {
    const updated = [newPost, ...posts];
    syncPosts(updated);
  };

  // Like Toggle
  const handleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
        };
      }
      return p;
    });
    syncPosts(updated);
  };

  // Save / Bookmark Toggle
  const handleSave = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          isSaved: !p.isSaved,
        };
      }
      return p;
    });
    syncPosts(updated);
  };

  // Share Increment
  const handleShare = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          sharesCount: p.sharesCount + 1,
        };
      }
      return p;
    });
    syncPosts(updated);
  };

  // Add Comment
  const handleAddComment = (postId: string, commentText: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const newC = {
          id: `c-${Date.now()}`,
          authorName: 'Alex Rivera',
          authorHeadline: 'Distributed Systems & Backend Engineer',
          content: commentText,
          createdAt: 'Just now',
        };
        return {
          ...p,
          comments: [newC, ...p.comments],
          commentsCount: p.commentsCount + 1,
        };
      }
      return p;
    });
    syncPosts(updated);
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
          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8] space-y-2">
              <p className="text-sm font-semibold text-[#1D2226]">No posts found in this category</p>
              <p className="text-xs text-[#56687A]">
                {selectedType === 'Saved'
                  ? 'You have not saved any posts yet.'
                  : 'Be the first to publish a discussion or learning update.'}
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
