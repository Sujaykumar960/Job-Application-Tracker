import { apiClient } from './client';
import { FeedPost, FeedComment, PostType } from '../types';

export const postApi = {
  /**
   * Fetch social engineering posts with optional category or filter params
   */
  getPosts: async (
    filter?: { category?: string; tag?: string; authorId?: string; search?: string } | (PostType | 'All')
  ): Promise<FeedPost[]> => {
    let params: any = {};
    if (typeof filter === 'string') {
      params = { category: filter === 'All' ? undefined : filter };
    } else if (filter && typeof filter === 'object') {
      params = filter;
    }
    const response = await apiClient.get<FeedPost[]>('/posts', { params });
    return response.data;
  },

  /**
   * Fetch posts authored by a specific user for profile activity
   */
  getUserPosts: async (userId: string): Promise<FeedPost[]> => {
    const response = await apiClient.get<FeedPost[]>(`/posts/user/${userId}`);
    return response.data;
  },

  /**
   * Publish a new post to the technical social feed (supports JSON and multipart FormData)
   */
  createPost: async (
    postData:
      | FormData
      | {
          content?: string;
          type?: PostType;
          tags?: string[];
          codeSnippet?: string;
          media?: any[];
        }
  ): Promise<FeedPost> => {
    const headers = postData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await apiClient.post<FeedPost>('/posts', postData, { headers });
    return response.data;
  },

  /**
   * Like or unlike a post
   */
  likePost: async (postId: string): Promise<{ likesCount: number; isLiked: boolean }> => {
    const response = await apiClient.post<{ likesCount: number; isLiked: boolean }>(`/posts/${postId}/like`);
    return response.data;
  },

  /**
   * Add a comment to an engineering thread
   */
  addComment: async (postId: string, content: string): Promise<FeedComment> => {
    const response = await apiClient.post<FeedComment>(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  /**
   * Delete a comment
   */
  deleteComment: async (commentId: string, postId?: string): Promise<{ success: boolean; message: string }> => {
    const url = postId ? `/posts/${postId}/comments/${commentId}` : `/posts/comments/${commentId}`;
    const response = await apiClient.delete<{ success: boolean; message: string }>(url);
    return response.data;
  },

  /**
   * Like or unlike a comment
   */
  likeComment: async (commentId: string, postId?: string): Promise<{ likesCount: number; isLiked: boolean }> => {
    const url = postId ? `/posts/${postId}/comments/${commentId}/like` : `/posts/comments/${commentId}/like`;
    const response = await apiClient.post<{ likesCount: number; isLiked: boolean }>(url);
    return response.data;
  },

  /**
   * Save or unsave a post to bookmarks
   */
  bookmarkPost: async (postId: string): Promise<{ isSaved: boolean }> => {
    const response = await apiClient.post<{ isSaved: boolean }>(`/posts/${postId}/bookmark`);
    return response.data;
  },
};

export default postApi;
