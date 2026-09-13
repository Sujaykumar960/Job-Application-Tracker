import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { JobItem } from '../../types';
import { recruiterApi } from '../../api/recruiterApi';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Layers,
  Sparkles,
  Code2,
  AlertCircle,
} from 'lucide-react';

export interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (newJob: JobItem) => void;
  defaultCompany?: string;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  defaultCompany = '',
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(defaultCompany);
  const [location, setLocation] = useState('Remote (US/EU)');
  const [salaryRange, setSalaryRange] = useState('$130,000 - $170,000');
  const [workType, setWorkType] = useState<'Remote' | 'Hybrid' | 'On-site'>('Remote');
  const [jobType, setJobType] = useState<'Full-time' | 'Internship' | 'Contract'>('Full-time');
  const [experienceLevel, setExperienceLevel] = useState<'Intern' | 'Junior' | 'Mid' | 'Senior' | 'Lead'>('Mid');
  const [roleCategory, setRoleCategory] = useState('Backend');
  const [skillsString, setSkillsString] = useState('Python, FastAPI, PostgreSQL, Docker');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !location.trim() || !description.trim()) {
      setError('Please fill out all required fields (Title, Company, Location, Description).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedSkills = skillsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, isMatched: false }));

      const jobPayload: any = {
        title: title.trim(),
        company: company.trim(),
        companyName: company.trim(),
        location: location.trim(),
        salaryRange: salaryRange.trim(),
        workType,
        jobType,
        experienceLevel,
        roleCategory,
        skills: parsedSkills,
        requiredSkills: parsedSkills.map((s) => s.name),
        description: description.trim(),
        responsibilities: [
          'Design and maintain scalable backend microservices and distributed data pipelines',
          'Collaborate closely with product, engineering, and infrastructure stakeholders',
          'Ensure high availability, test coverage, and production reliability',
        ],
        status: 'published',
      };

      const createdJob = await recruiterApi.createJob(jobPayload);
      onJobCreated(createdJob);
      onClose();

      // Reset form
      setTitle('');
      setDescription('');
    } catch (err: any) {
      console.error('Failed to create job:', err);
      const msg = err.response?.data?.detail || 'Failed to post job listing. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Post New Engineering Job Listing"
      subtitle="Publish an active role to the CareerX Marketplace with live applicant tracking"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Role Title & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Role Title *"
            placeholder="e.g. Senior Backend Engineer"
            icon={<Briefcase className="w-3.5 h-3.5" />}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Company Name *"
            placeholder="e.g. Stripe, Linear, Vercel"
            icon={<Building2 className="w-3.5 h-3.5" />}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>

        {/* Row 2: Location & Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Location *"
            placeholder="e.g. San Francisco, CA or Remote"
            icon={<MapPin className="w-3.5 h-3.5" />}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Input
            label="Compensation Range"
            placeholder="e.g. $140,000 - $180,000"
            icon={<DollarSign className="w-3.5 h-3.5" />}
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
          />
        </div>

        {/* Row 3: Work Type, Job Type, Experience Level */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226]">Work Model *</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as any)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226]">Job Type *</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as any)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226]">Experience *</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as any)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="Intern">Intern / Entry</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid Level</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead / Staff</option>
            </select>
          </div>
        </div>

        {/* Row 4: Role Category & Core Skills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2226]">Role Category *</label>
            <select
              value={roleCategory}
              onChange={(e) => setRoleCategory(e.target.value)}
              className="w-full bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="Backend">Backend Engineering</option>
              <option value="Frontend">Frontend Engineering</option>
              <option value="Full Stack">Full Stack Engineering</option>
              <option value="DevOps">DevOps & Cloud Infrastructure</option>
              <option value="AI / ML">AI & Machine Learning</option>
              <option value="Mobile">Mobile Engineering</option>
              <option value="Software Engineering">General Software Engineering</option>
            </select>
          </div>

          <Input
            label="Required Competencies (comma separated) *"
            placeholder="e.g. Go, Kafka, PostgreSQL, Kubernetes"
            icon={<Code2 className="w-3.5 h-3.5" />}
            value={skillsString}
            onChange={(e) => setSkillsString(e.target.value)}
            required
          />
        </div>

        {/* Job Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1D2226]">
            Job Description & Engineering Scope *
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the team mission, core architecture challenges, day-to-day responsibilities, and qualifications..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] p-3 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E8]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Publish Job Listing
          </Button>
        </div>
      </form>
    </Modal>
  );
};
