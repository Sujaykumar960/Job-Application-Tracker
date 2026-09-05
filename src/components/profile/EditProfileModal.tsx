import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { User, MapPin, Briefcase, Globe, Github, Linkedin, Sparkles } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  headline: z.string().min(5, 'Headline is required'),
  location: z.string().min(2, 'Location is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  github: z.string().url('Must be a valid URL').or(z.literal('')),
  linkedin: z.string().url('Must be a valid URL').or(z.literal('')),
  website: z.string().url('Must be a valid URL').or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormData) => void;
  initialData: ProfileFormData;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Professional Profile"
      subtitle="Update your public engineering profile, verified contact links, and bio"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        {/* Name & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Full Name *"
            icon={<User className="w-3.5 h-3.5" />}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Location *"
            placeholder="e.g. Seattle, WA (Open to Remote)"
            icon={<MapPin className="w-3.5 h-3.5" />}
            error={errors.location?.message}
            {...register('location')}
          />
        </div>

        {/* Headline */}
        <Input
          label="Professional Headline *"
          placeholder="e.g. Distributed Systems & Backend Platform Engineer | Go, TypeScript, PostgreSQL"
          icon={<Briefcase className="w-3.5 h-3.5" />}
          error={errors.headline?.message}
          {...register('headline')}
        />

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#38434F]">
            About & Engineering Philosophy *
          </label>
          <textarea
            rows={4}
            placeholder="Tell recruiters about your background, the problems you solve, and what you're passionate about building..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-3 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] leading-relaxed"
            {...register('bio')}
          />
          {errors.bio && (
            <p className="text-xs text-[#B3261E] font-medium">{errors.bio.message}</p>
          )}
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="GitHub Profile"
            placeholder="https://github.com/alexrivera"
            icon={<Github className="w-3.5 h-3.5" />}
            error={errors.github?.message}
            {...register('github')}
          />
          <Input
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/alexrivera"
            icon={<Linkedin className="w-3.5 h-3.5" />}
            error={errors.linkedin?.message}
            {...register('linkedin')}
          />
          <Input
            label="Portfolio / Blog"
            placeholder="https://alexrivera.dev"
            icon={<Globe className="w-3.5 h-3.5" />}
            error={errors.website?.message}
            {...register('website')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E8]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProfileModal;
