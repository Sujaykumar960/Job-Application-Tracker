import React from 'react';
import { JobFilterState } from '../../types';
import { Search, X, Filter, RotateCcw } from 'lucide-react';

export interface JobFiltersProps {
  filters: JobFilterState;
  onChange: (filters: JobFilterState) => void;
  onReset: () => void;
  availableRoles: string[];
  availableLocations: string[];
  availableSkills: string[];
  totalResults: number;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  filters,
  onChange,
  onReset,
  availableRoles,
  availableLocations,
  availableSkills,
  totalResults,
}) => {
  const hasActiveFilters =
    filters.role !== 'All' ||
    filters.location !== 'All' ||
    filters.experience !== 'All' ||
    filters.skill !== 'All' ||
    filters.jobType !== 'All' ||
    filters.workType !== 'All' ||
    filters.search !== '';

  const handleChange = (key: keyof JobFilterState, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
      {/* Search & Sort Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search by title, company, skills, keywords..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className="absolute right-2.5 top-2.5 text-[#788896] hover:text-[#1D2226]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          <span className="text-xs font-mono text-[#56687A]">
            Showing <strong className="text-[#1D2226] font-bold">{totalResults}</strong> jobs
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#56687A] hidden sm:inline">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => handleChange('sortBy', e.target.value)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="match">Highest Resume Match</option>
              <option value="newest">Newest Listed</option>
              <option value="salary">Compensation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Dropdowns Grid: Role, Location, Experience, Skills, Job Type, Remote/On-site */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-[#E8E8E8]">
        {/* 1. Role */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Role</label>
          <select
            value={filters.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Location */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Location</label>
          <select
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Locations</option>
            {availableLocations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Experience */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Experience</label>
          <select
            value={filters.experience}
            onChange={(e) => handleChange('experience', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Levels</option>
            <option value="Intern">Intern / Co-op</option>
            <option value="Junior">Junior (1-2y)</option>
            <option value="Mid">Mid-Level (3-5y)</option>
            <option value="Senior">Senior (5y+)</option>
          </select>
        </div>

        {/* 4. Skills */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Skills</label>
          <select
            value={filters.skill}
            onChange={(e) => handleChange('skill', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Skills</option>
            {availableSkills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Job Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Job Type</label>
          <select
            value={filters.jobType}
            onChange={(e) => handleChange('jobType', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        {/* 6. Remote/On-site */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono font-semibold text-[#788896]">Workplace</label>
          <select
            value={filters.workType}
            onChange={(e) => handleChange('workType', e.target.value)}
            className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="All">All Workplaces</option>
            <option value="Remote">Remote Only</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] text-xs">
          <span className="text-[11px] text-[#56687A]">Filters are currently active</span>
          <button
            onClick={onReset}
            className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-semibold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default JobFilters;
