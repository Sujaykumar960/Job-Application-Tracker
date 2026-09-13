import React, { useState, useRef } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PostType, FeedPost } from '../../types';
import { useAuth } from '../../context/AuthContext';
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
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface CreatePostCardProps {
  onPublish: (newPost: FeedPost | FormData) => Promise<void> | void;
}

interface SelectedMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  sizeLabel: string;
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

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_MEDIA_COUNT = 5;

export const CreatePostCard: React.FC<CreatePostCardProps> = ({ onPublish }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>('Technical Discussion');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    setValidationError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedMedia.length + files.length > MAX_MEDIA_COUNT) {
      setValidationError(`Maximum of ${MAX_MEDIA_COUNT} media items allowed per post.`);
      return;
    }

    const newMediaItems: SelectedMediaItem[] = [];

    for (const file of files) {
      if (mediaType === 'image') {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setValidationError(`Image "${file.name}" exceeds maximum allowed size of 10 MB.`);
          continue;
        }
      } else {
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          setValidationError(`Video "${file.name}" exceeds maximum allowed size of 50 MB.`);
          continue;
        }
      }

      const previewUrl = URL.createObjectURL(file);
      newMediaItems.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
        file,
        previewUrl,
        type: mediaType,
        sizeLabel: formatFileSize(file.size),
      });
    }

    setSelectedMedia((prev) => [...prev, ...newMediaItems]);

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleRemoveMedia = (idToRemove: string) => {
    setSelectedMedia((prev) => {
      const item = prev.find((m) => m.id === idToRemove);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((m) => m.id !== idToRemove);
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedMedia.length === 0) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('type', selectedType);
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }
      if (showCodeInput && codeSnippet.trim()) {
        formData.append('codeSnippet', codeSnippet.trim());
      }

      for (const media of selectedMedia) {
        formData.append('media', media.file);
      }

      await onPublish(formData);

      // Reset on success
      setContent('');
      setCodeSnippet('');
      setShowCodeInput(false);
      setTagsInput('');
      selectedMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl));
      setSelectedMedia([]);
    } catch (err: any) {
      console.error('Failed to publish post:', err);
      setValidationError(err?.response?.data?.detail || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'CX';

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
      <form onSubmit={handlePublish} className="space-y-3">
        {/* Author Avatar + Textarea */}
        <div className="flex items-start gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              className="w-9 h-9 rounded-xl object-cover border border-[#0A66C2]/30 flex-shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#0A66C2] border border-[#004182] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
              {authorInitials}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share an achievement, architectural finding, photo, video, or technical question..."
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] p-3 focus:outline-none focus:ring-2 focus:ring-[#E8F3FF] focus:border-[#0A66C2] leading-relaxed resize-none transition"
            />
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Media Previews before publishing */}
        {selectedMedia.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono text-[#56687A] uppercase font-semibold">
              Attached Media ({selectedMedia.length}/{MAX_MEDIA_COUNT})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-xl border border-[#D9D9D9] overflow-hidden bg-slate-900 group aspect-video flex items-center justify-center shadow-xs"
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-between p-2">
                    <span className="text-[10px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                      {item.sizeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition shadow"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Footer: Tags, Media buttons, Code toggle & Publish */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E8E8E8] flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Tag className="w-3.5 h-3.5 text-[#788896] flex-shrink-0" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags: #Kafka, #Go, #SystemDesign"
              className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-[11px] rounded-lg border border-[#D9D9D9] px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
            />
          </div>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            type="file"
            ref={videoInputRef}
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'video')}
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Add Photo Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-[#F3F6F8] text-[#56687A] hover:text-[#0A66C2] hover:bg-[#E8F3FF] border border-[#D9D9D9] text-[11px] font-medium flex items-center gap-1 transition"
              title="Add photos (PNG, JPEG, WebP up to 10MB)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Photo</span>
            </button>

            {/* Add Video Button */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-[#F3F6F8] text-[#56687A] hover:text-[#0A66C2] hover:bg-[#E8F3FF] border border-[#D9D9D9] text-[11px] font-medium flex items-center gap-1 transition"
              title="Add videos (MP4, WebM, MOV up to 50MB)"
            >
              <VideoIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Video</span>
            </button>

            {/* Code Snippet Toggle */}
            {!showCodeInput && (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="px-2 py-1 rounded-lg bg-[#F3F6F8] text-[#56687A] hover:text-[#1D2226] hover:bg-[#E8E8E8] border border-[#D9D9D9] text-[11px] font-mono flex items-center gap-1 transition"
                title="Attach code snippet"
              >
                <Code2 className="w-3 h-3 text-[#0A66C2]" />
                <span>Code</span>
              </button>
            )}

            <Button
              type="submit"
              size="xs"
              variant="primary"
              disabled={(!content.trim() && selectedMedia.length === 0) || isSubmitting}
              icon={
                isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )
              }
            >
              {isSubmitting ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CreatePostCard;
