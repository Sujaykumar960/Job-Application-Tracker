import { apiClient, withFallback } from './client';
import { FeedPost, FeedComment, PostType, INITIAL_FEED_POSTS } from '../data/mockFeed';

const FEED_STORAGE_KEY = 'careerx_feed_posts_v2';

function getLocalPosts(): FeedPost[] {
  const saved = localStorage.getItem(FEED_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_FEED_POSTS;
    }
  }
  return INITIAL_FEED_POSTS;
}

export const postApi = {
  /**
   * Fetch social engineering posts with optional category filter
   */
  getPosts: async (category?: PostType | 'All'): Promise<FeedPost[]> => {
    let posts = getLocalPosts();
    if (category && category !== 'All') {
      posts = posts.filter((p) => p.type === category);
    }

    return withFallback(
      apiClient.get<FeedPost[]>('/posts', { params: { category } }),
      posts
    );
  },

  /**
   * Publish a new post to the technical social feed
   */
  createPost: async (postData: {
    content: string;
    type: PostType;
    tags: string[];
    codeSnippet?: string;
  }): Promise<FeedPost> => {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      author: {
        name: 'Alex Rivera',
        headline: 'Distributed Systems & Backend Platform Engineer',
        avatarInitials: 'AR',
        isVerified: true,
      },
      type: postData.type,
      createdAt: 'Just now',
      content: postData.content,
      tags: postData.tags,
      codeSnippet: postData.codeSnippet,
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      isSaved: false,
      sharesCount: 0,
      comments: [],
    };

    const existing = getLocalPosts();
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify([newPost, ...existing]));

    return withFallback(
      apiClient.post<FeedPost>('/posts', postData),
      newPost
    );
  },

  /**
   * Like or unlike a post
   */
  likePost: async (postId: string): Promise<{ likesCount: number; isLiked: boolean }> => {
    const existing = getLocalPosts();
    let res = { likesCount: 0, isLiked: false };

    const updated = existing.map((p) => {
      if (p.id === postId) {
        const nextLiked = !p.isLiked;
        const count = nextLiked ? p.likesCount + 1 : p.likesCount - 1;
        res = { likesCount: count, isLiked: nextLiked };
        return { ...p, isLiked: nextLiked, likesCount: count };
      }
      return p;
    });

    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ likesCount: number; isLiked: boolean }>(`/posts/${postId}/like`),
      res
    );
  },

  /**
   * Add a comment to an engineering thread
   */
  addComment: async (postId: string, content: string): Promise<FeedComment> => {
    const newComment: FeedComment = {
      id: `c-${Date.now()}`,
      authorName: 'Alex Rivera',
      authorHeadline: 'Distributed Systems & Backend Platform Engineer',
      content,
      createdAt: 'Just now',
    };

    const existing = getLocalPosts();
    const updated = existing.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, newComment],
        };
      }
      return p;
    });

    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<FeedComment>(`/posts/${postId}/comments`, { content }),
      newComment
    );
  },

  /**
   * Save or unsave a post to bookmarks
   */
  bookmarkPost: async (postId: string): Promise<{ isSaved: boolean }> => {
    const existing = getLocalPosts();
    let isSaved = false;

    const updated = existing.map((p) => {
      if (p.id === postId) {
        isSaved = !p.isSaved;
        return { ...p, isSaved };
      }
      return p;
    });

    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ isSaved: boolean }>(`/posts/${postId}/bookmark`),
      { isSaved }
    );
  },
};

export default postApi;
