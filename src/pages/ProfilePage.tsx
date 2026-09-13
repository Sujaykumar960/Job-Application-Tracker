import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/userApi';
import { postApi } from '../api/postApi';
import { PublicUserProfile, FeedPost } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PostCard } from '../components/feed/PostCard';
import { EditProfileModal, ProfileFormData } from '../components/profile/EditProfileModal';
import { RecruiterPrivacyCard } from '../components/profile/RecruiterPrivacyCard';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import { connectionApi } from '../api/connectionApi';
import {
  MapPin,
  Briefcase,
  Github,
  Linkedin,
  Globe,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Code2,
  Calendar,
  ExternalLink,
  MessageSquare,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  Check,
  X,
  Camera,
  Layers,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const isOwnProfile = !userId || (currentUser && currentUser.id === userId);
  const targetUserId = isOwnProfile ? currentUser?.id : userId;

  // Profile data & UI states
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authored posts
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);

  // Edit & Avatar upload states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSubmittingConnection, setIsSubmittingConnection] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile and posts whenever targetUserId changes
  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (isOwnProfile) {
          // Fetch authenticated user's own profile
          const ownProf = await userApi.getProfile();
          if (isMounted) {
            setProfile({
              id: ownProf.id,
              name: ownProf.name,
              role: ownProf.role,
              headline: ownProf.headline || '',
              bio: ownProf.bio || '',
              location: ownProf.location || 'Remote',
              company: (ownProf as any).company || (ownProf as any).currentCompany || '',
              avatarUrl: ownProf.avatar || '',
              avatarInitials: ownProf.name ? ownProf.name.slice(0, 2).toUpperCase() : 'CX',
              skills: ownProf.skills || [],
              experiences: (ownProf as any).experiences || [],
              education: (ownProf as any).education || [],
              projects: (ownProf as any).projects || [],
              certifications: (ownProf as any).certifications || [],
              websiteUrl: (ownProf as any).website || '',
              githubUrl: (ownProf as any).github || '',
              linkedinUrl: (ownProf as any).linkedin || '',
              connectionStatus: 'self',
            });
            setConnectionStatus('self');
            setRequestId(null);
          }
        } else {
          // Fetch target user's public profile
          const publicProf = await userApi.getPublicProfile(targetUserId);
          if (isMounted) {
            setProfile(publicProf);
            setConnectionStatus(publicProf.connectionStatus || 'none');
            setRequestId(publicProf.requestId || null);
          }
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        if (isMounted) {
          setError(
            err?.response?.status === 404
              ? 'User profile not found.'
              : 'Failed to load user profile. Please try again.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchUserPosts = async () => {
      if (!targetUserId) return;
      setPostsLoading(true);
      try {
        const userPosts = await postApi.getUserPosts(targetUserId);
        if (isMounted) setPosts(userPosts);
      } catch (err) {
        console.error('Failed to load user posts:', err);
      } finally {
        if (isMounted) setPostsLoading(false);
      }
    };

    fetchProfileData();
    fetchUserPosts();

    return () => {
      isMounted = false;
    };
  }, [targetUserId, isOwnProfile]);

  // Connection Action Handlers
  const handleConnect = async () => {
    if (!targetUserId || isSubmittingConnection) return;
    setIsSubmittingConnection(true);
    try {
      const res = await connectionApi.sendConnectionRequest(targetUserId);
      setConnectionStatus('pending_sent');
      if (res.id) setRequestId(res.id);
    } catch (err) {
      console.error('Failed to send connection request:', err);
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!targetUserId || isSubmittingConnection) return;
    setIsSubmittingConnection(true);
    try {
      await connectionApi.cancelConnectionRequest(requestId || targetUserId);
      setConnectionStatus('none');
      setRequestId(null);
    } catch (err) {
      console.error('Failed to cancel connection request:', err);
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!targetUserId || isSubmittingConnection) return;
    setIsSubmittingConnection(true);
    try {
      await connectionApi.acceptConnectionRequest(requestId || targetUserId);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to accept connection request:', err);
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!targetUserId || isSubmittingConnection) return;
    setIsSubmittingConnection(true);
    try {
      await connectionApi.rejectConnectionRequest(requestId || targetUserId);
      setConnectionStatus('none');
      setRequestId(null);
    } catch (err) {
      console.error('Failed to decline connection request:', err);
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (!targetUserId || isSubmittingConnection) return;
    setIsSubmittingConnection(true);
    try {
      await connectionApi.removeConnection(targetUserId);
      setConnectionStatus('none');
      setRequestId(null);
    } catch (err) {
      console.error('Failed to remove connection:', err);
    } finally {
      setIsSubmittingConnection(false);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (updated: ProfileFormData) => {
    try {
      const saved = await userApi.updateProfile({
        name: updated.name,
        headline: updated.headline,
        location: updated.location,
        bio: updated.bio,
      });

      // Update local and context
      if (profile) {
        setProfile({
          ...profile,
          name: saved.name,
          headline: saved.headline || '',
          location: saved.location || '',
          bio: saved.bio || '',
          websiteUrl: updated.website,
          githubUrl: updated.github,
          linkedinUrl: updated.linkedin,
        });
      }
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile changes. Please try again.');
    }
  };

  // Handle Avatar Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Avatar file exceeds maximum size of 10 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar_file', file);
      const res = await userApi.uploadAvatar(formData);

      if (profile) {
        setProfile({ ...profile, avatarUrl: res.avatarUrl });
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert('Failed to upload avatar photo. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Handle Post Interactions
  const handleLike = async (postId: string) => {
    try {
      const res = await postApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleSave = async (postId: string) => {
    try {
      const res = await postApi.bookmarkPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isSaved: res.isSaved } : p))
      );
    } catch (err) {
      console.error('Failed to bookmark post:', err);
    }
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/feed`);
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      const comment = await postApi.addComment(postId, content);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [comment, ...p.comments],
                commentsCount: p.commentsCount + 1,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 text-[#0A66C2] animate-spin" />
        <p className="text-xs font-mono text-[#788896]">Loading professional profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1D2226]">Profile Not Available</h2>
          <p className="text-xs text-[#56687A]">{error || 'Unable to display this profile.'}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/feed')}>
          Return to Feed
        </Button>
      </div>
    );
  }

  const avatarInitials =
    profile.avatarInitials ||
    (profile.name ? profile.name.slice(0, 2).toUpperCase() : 'CX');

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Avatar Upload */}
      {isOwnProfile && (
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. HERO PROFILE CARD                                                      */}
      {/* ========================================================================= */}
      <Card className="p-6 bg-white border border-[#D9D9D9] space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left: Avatar + Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Upload Trigger */}
            <div className="relative flex-shrink-0 group">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0A66C2]/40 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-700 to-[#1D2226] border-2 border-[#0A66C2]/50 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
                  {avatarInitials}
                </div>
              )}

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-mono shadow"
                  title="Upload profile photo"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Update</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-[#1D2226] tracking-tight">
                  {profile.name}
                </h1>
                <Badge variant="brand" size="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Member
                </Badge>
                {profile.role && (
                  <Badge variant="neutral" size="sm" className="capitalize">
                    {profile.role}
                  </Badge>
                )}
              </div>

              {profile.headline ? (
                <p className="text-xs text-[#56687A] font-medium max-w-2xl leading-relaxed">
                  {profile.headline}
                </p>
              ) : (
                <p className="text-xs text-[#788896] italic">No headline specified</p>
              )}

              <div className="flex items-center gap-4 text-xs text-[#788896] flex-wrap pt-0.5 font-mono text-[11px]">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#788896]" />
                    {profile.location}
                  </span>
                )}
                {profile.company && (
                  <span className="flex items-center gap-1 text-[#56687A]">
                    <Briefcase className="w-3 h-3 text-[#788896]" />
                    {profile.company}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
            {isOwnProfile ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => avatarInputRef.current?.click()}
                  icon={<Camera className="w-3.5 h-3.5" />}
                >
                  Change Photo
                </Button>
              </>
            ) : (
              <>
                {connectionStatus === 'connected' && (
                  <>
                    <Badge variant="success" className="py-1 px-2.5 text-xs flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      1st-Degree Connection
                    </Badge>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/messages?user=${targetUserId}`)}
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                    >
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmittingConnection}
                      onClick={handleDisconnect}
                      icon={<UserMinus className="w-3.5 h-3.5 text-gray-500" />}
                    >
                      Disconnect
                    </Button>
                  </>
                )}

                {connectionStatus === 'pending_sent' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
                    >
                      Pending Request
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isSubmittingConnection}
                      onClick={handleCancelRequest}
                    >
                      Withdraw
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/messages?user=${targetUserId}`)}
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                    >
                      Message
                    </Button>
                  </>
                )}

                {connectionStatus === 'pending_received' && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isSubmittingConnection}
                      onClick={handleAcceptRequest}
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmittingConnection}
                      onClick={handleRejectRequest}
                      icon={<X className="w-3.5 h-3.5" />}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/messages?user=${targetUserId}`)}
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                    >
                      Message
                    </Button>
                  </>
                )}

                {(connectionStatus === 'none' || connectionStatus === 'not_connected') && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isSubmittingConnection}
                      onClick={handleConnect}
                      icon={<UserPlus className="w-3.5 h-3.5" />}
                    >
                      Connect
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/messages?user=${targetUserId}`)}
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                    >
                      Message
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Links Bar */}
        {(profile.githubUrl || profile.linkedinUrl || profile.websiteUrl) && (
          <div className="pt-4 border-t border-[#E8E8E8] flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#56687A] hover:text-[#1D2226] transition font-mono text-[11px]"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#788896]" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#0A66C2] hover:text-[#004182] transition font-mono text-[11px]"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#788896]" />
                </a>
              )}
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#56687A] hover:text-[#1D2226] transition font-mono text-[11px]"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Portfolio</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#788896]" />
                </a>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN LAYOUT: CONTENT ON LEFT, WIDGETS ON RIGHT                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================== LEFT COLUMN (8 COLS) ==================== */}
        <div className="lg:col-span-8 space-y-5">
          {/* ABOUT SECTION */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0A66C2]" />
              About
            </h3>
            {profile.bio ? (
              <p className="text-xs text-[#38434F] leading-relaxed whitespace-pre-wrap font-sans">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs text-[#788896] italic font-mono">
                {isOwnProfile
                  ? 'No bio added yet. Click "Edit Profile" to share your background and engineering focus.'
                  : 'This member has not written an about section yet.'}
              </p>
            )}
          </Card>

          {/* ACTIVITY / AUTHORED POSTS (LINKEDIN-STYLE) */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#0A66C2]" />
                Activity & Posts ({posts.length})
              </h3>
              <Badge variant="neutral" size="sm">
                Real-time
              </Badge>
            </div>

            {postsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#0A66C2] animate-spin" />
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3.5">
                {posts.map((post) => (
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
            ) : (
              <div className="p-6 text-center space-y-2 bg-[#F3F6F8] rounded-xl border border-[#E8E8E8]">
                <Layers className="w-7 h-7 text-[#788896] mx-auto opacity-70" />
                <p className="text-xs font-bold text-[#1D2226]">No activity published yet</p>
                <p className="text-[11px] text-[#56687A] max-w-sm mx-auto">
                  {isOwnProfile
                    ? 'Share technical discussions, photos, videos, and project updates in the feed.'
                    : 'When this member publishes a post, it will appear here.'}
                </p>
                {isOwnProfile && (
                  <Button size="xs" variant="primary" onClick={() => navigate('/feed')}>
                    Create a Post
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* SKILLS SECTION */}
          {profile.skills && profile.skills.length > 0 && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                Skills & Technologies ({profile.skills.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] text-xs font-mono text-[#1D2226] hover:border-[#0A66C2]/40 transition"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* EXPERIENCE SECTION */}
          {profile.experiences && profile.experiences.length > 0 && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#0A66C2]" />
                  Work Experience ({profile.experiences.length})
                </h3>
              </div>

              <div className="space-y-4">
                {profile.experiences.map((exp, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h4 className="text-sm font-bold text-[#1D2226]">{exp.role || exp.title}</h4>
                        <p className="text-xs text-[#0A66C2] font-semibold">{exp.company}</p>
                      </div>
                      <div className="text-left sm:text-right font-mono text-[11px] text-[#788896]">
                        {exp.period && <p>{exp.period}</p>}
                        {exp.location && <p className="text-[#788896]">{exp.location}</p>}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-[#38434F] leading-relaxed">{exp.description}</p>
                    )}
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="space-y-1 list-disc list-inside text-xs text-[#38434F] leading-relaxed">
                        {exp.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* PROJECTS SECTION */}
          {profile.projects && profile.projects.length > 0 && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                  Projects ({profile.projects.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {profile.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#1D2226]">{proj.title}</h4>
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#788896] hover:text-[#1D2226]"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-[#38434F] leading-relaxed mt-1">
                        {proj.impact || proj.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* EDUCATION SECTION */}
          {profile.education && profile.education.length > 0 && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                Education ({profile.education.length})
              </h3>
              <div className="space-y-3">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
                    <h4 className="text-xs font-bold text-[#1D2226]">{edu.school}</h4>
                    <p className="text-xs text-[#0A66C2]">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</p>
                    {edu.period && <p className="text-[10px] font-mono text-[#788896] mt-0.5">{edu.period}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ==================== RIGHT COLUMN (4 COLS) ==================== */}
        <div className="lg:col-span-4 space-y-5">
          {isOwnProfile ? (
            <>
              {/* PROFILE COMPLETION WIDGET */}
              <ProfileCompletionCard />

              {/* RECRUITER PRIVACY CONTROLS */}
              <RecruiterPrivacyCard />
            </>
          ) : (
            /* PUBLIC SIDEBAR SUMMARY */
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0A66C2]" />
                Professional Summary
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                  <span className="text-[#788896]">Profile Status</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                {profile.company && (
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                    <span className="text-[#788896]">Organization</span>
                    <span className="font-semibold text-[#1D2226]">{profile.company}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
                    <span className="text-[#788896]">Location</span>
                    <span className="font-mono text-[#1D2226] text-[11px]">{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#788896]">Community Posts</span>
                  <span className="font-mono font-bold text-[#0A66C2]">{posts.length}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/network')}
                >
                  Explore More Peers
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
          initialData={{
            name: profile.name,
            headline: profile.headline || '',
            location: profile.location || '',
            bio: profile.bio || '',
            github: profile.githubUrl || '',
            linkedin: profile.linkedinUrl || '',
            website: profile.websiteUrl || '',
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
