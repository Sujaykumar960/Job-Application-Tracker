import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Application, ApplicationStatus, PriorityLevel } from '../../types';
import {
  Building2,
  Briefcase,
  MapPin,
  Globe,
  Calendar,
  User,
  FileText,
  Clock,
  Sparkles,
  Paperclip,
} from 'lucide-react';

import { resumeApi, ResumeItem } from '../../api/resumeApi';

const applicationSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role title is required'),
  location: z.string().min(1, 'Location is required'),
  jobUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  appliedDate: z.string().min(1, 'Application date is required'),
  deadline: z.string().optional(),
  interviewDate: z.string().optional(),
  recruiter: z.string().optional(),
  status: z.enum(['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Rejected']),
  priority: z.enum(['Low', 'Medium', 'High']),
  notes: z.string().optional(),
  resume: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Application) => void;
  initialData?: Application | null;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);
  const [userResumes, setUserResumes] = React.useState<ResumeItem[]>([]);
  const [loadingResumes, setLoadingResumes] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      company: '',
      role: '',
      location: '',
      jobUrl: '',
      appliedDate: new Date().toISOString().slice(0, 10),
      deadline: '',
      interviewDate: '',
      recruiter: '',
      status: 'Applied',
      priority: 'High',
      notes: '',
      resume: '',
    },
  });

  useEffect(() => {
    let mounted = true;
    const fetchResumes = async () => {
      try {
        setLoadingResumes(true);
        const list = await resumeApi.getResumes();
        if (mounted) {
          setUserResumes(list);
          if (!initialData && list.length > 0) {
            const active = list.find((r) => r.isActive) || list[0];
            setValue('resume', active.name);
          }
        }
      } catch (e) {
        console.error('Failed to fetch resumes:', e);
      } finally {
        if (mounted) setLoadingResumes(false);
      }
    };

    if (isOpen) {
      fetchResumes();
    }
    return () => {
      mounted = false;
    };
  }, [isOpen, initialData, setValue]);

  useEffect(() => {
    if (initialData) {
      reset({
        company: initialData.company || initialData.companyName || '',
        role: initialData.role || initialData.roleTitle || '',
        location: initialData.location || '',
        jobUrl: initialData.jobUrl || '',
        appliedDate: initialData.appliedDate || '',
        deadline: initialData.deadline || initialData.deadlineDate || '',
        interviewDate: initialData.interviewDate || '',
        recruiter: initialData.recruiter || '',
        status: (initialData.status as any) || 'Applied',
        priority: initialData.priority || 'Medium',
        notes: initialData.notes || '',
        resume: initialData.resume || '',
      });
    } else {
      reset({
        company: '',
        role: '',
        location: '',
        jobUrl: '',
        appliedDate: new Date().toISOString().slice(0, 10),
        deadline: '',
        interviewDate: '',
        recruiter: '',
        status: 'Applied',
        priority: 'High',
        notes: '',
        resume: userResumes.find((r) => r.isActive)?.name || userResumes[0]?.name || '',
      });
    }
  }, [initialData, reset, isOpen, userResumes]);

  const handleFormSubmit = (data: ApplicationFormData) => {
    const formatted: Application = {
      id: initialData?.id || `app-${Date.now()}`,
      company: data.company,
      role: data.role,
      companyName: data.company,
      roleTitle: data.role,
      location: data.location,
      jobUrl: data.jobUrl || undefined,
      appliedDate: data.appliedDate,
      deadline: data.deadline || undefined,
      deadlineDate: data.deadline || undefined,
      interviewDate: data.interviewDate || undefined,
      recruiter: data.recruiter || undefined,
      status: data.status,
      priority: data.priority,
      notes: data.notes || undefined,
      resume: data.resume,
      matchScore: initialData?.matchScore || 85, // Default match score
      tags: initialData?.tags || ['TypeScript', 'Full Stack'],
    };

    onSubmit(formatted);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Application' : 'Add New Application'}
      subtitle={
        isEditing
          ? 'Update pipeline progress, interviews, and contact details'
          : 'Track a new engineering opportunity across rounds and deadlines'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Row 1: Company & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Company *"
            placeholder="e.g. Stripe, Linear, Netflix"
            icon={<Building2 className="w-3.5 h-3.5" />}
            error={errors.company?.message}
            {...register('company')}
          />
          <Input
            label="Role Title *"
            placeholder="e.g. Software Engineer - Infrastructure"
            icon={<Briefcase className="w-3.5 h-3.5" />}
            error={errors.role?.message}
            {...register('role')}
          />
        </div>

        {/* Row 2: Location & Job URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Location *"
            placeholder="e.g. San Francisco, CA (Hybrid) or Remote"
            icon={<MapPin className="w-3.5 h-3.5" />}
            error={errors.location?.message}
            {...register('location')}
          />
          <Input
            label="Job Posting URL"
            type="url"
            placeholder="https://company.com/jobs/123"
            icon={<Globe className="w-3.5 h-3.5" />}
            error={errors.jobUrl?.message}
            {...register('jobUrl')}
          />
        </div>

        {/* Row 3: Status & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Status *</label>
            <select
              className="w-full bg-surface-950 text-slate-100 text-xs rounded-lg border border-surface-700/80 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('status')}
            >
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Priority Level *</label>
            <select
              className="w-full bg-surface-950 text-slate-100 text-xs rounded-lg border border-surface-700/80 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('priority')}
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Row 4: Dates (Applied, Deadline, Interview) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Application Date *"
            type="date"
            icon={<Calendar className="w-3.5 h-3.5" />}
            error={errors.appliedDate?.message}
            {...register('appliedDate')}
          />
          <Input
            label="Deadline Date"
            type="date"
            icon={<Clock className="w-3.5 h-3.5" />}
            error={errors.deadline?.message}
            {...register('deadline')}
          />
          <Input
            label="Interview Date / Time"
            placeholder="e.g. 2026-09-08 10:00"
            icon={<Calendar className="w-3.5 h-3.5 text-brand-400" />}
            error={errors.interviewDate?.message}
            {...register('interviewDate')}
          />
        </div>

        {/* Row 5: Recruiter & Resume Version */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Recruiter / Point of Contact"
            placeholder="e.g. Sarah Lin (sarah@stripe.com)"
            icon={<User className="w-3.5 h-3.5" />}
            error={errors.recruiter?.message}
            {...register('recruiter')}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Resume Attached</label>
            <div className="relative">
              <select
                className="w-full bg-surface-950 text-slate-100 text-xs rounded-lg border border-surface-700/80 pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
                {...register('resume')}
              >
                {loadingResumes ? (
                  <option value="">Loading resumes...</option>
                ) : userResumes.length > 0 ? (
                  userResumes.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} {r.atsScore ? `(ATS ${r.atsScore}%)` : ''} {r.isActive ? '• Active' : ''}
                    </option>
                  ))
                ) : (
                  <option value="">No resume uploaded (upload in Resume AI)</option>
                )}
              </select>
              <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            {errors.resume && (
              <p className="text-xs text-rose-400 font-medium">{errors.resume.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Interview Notes & Preparation Strategy
          </label>
          <textarea
            rows={3}
            placeholder="Key discussion topics, referral names, architectural talking points..."
            className="w-full bg-surface-950 text-slate-100 placeholder-slate-500 text-xs rounded-lg border border-surface-700/80 p-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-800">
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
            {isEditing ? 'Update Application' : 'Save Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplicationModal;
