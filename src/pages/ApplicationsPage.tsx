import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ApplicationTableView } from '../components/applications/ApplicationTableView';
import { ApplicationKanbanView } from '../components/applications/ApplicationKanbanView';
import { ApplicationModal } from '../components/applications/ApplicationModal';
import { ApplicationDetailModal } from '../components/applications/ApplicationDetailModal';
import { Application, ApplicationStatus, PriorityLevel } from '../types';
import { MOCK_APPLICATIONS } from '../data/mockData';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  LayoutList,
  Kanban,
  X,
  Briefcase,
  Users,
  Award,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'careerx_applications_v2';

export const ApplicationsPage: React.FC = () => {
  // --- STATE WITH LOCALSTORAGE PERSISTENCE ---
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_APPLICATIONS;
      }
    }
    return MOCK_APPLICATIONS;
  });

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'match'>('newest');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  // --- CRUD OPERATIONS ---
  const handleSaveApplication = (appData: Application) => {
    setApplications((prev) => {
      const exists = prev.some((item) => item.id === appData.id);
      if (exists) {
        return prev.map((item) => (item.id === appData.id ? appData : item));
      }
      return [appData, ...prev];
    });
    setEditingApp(null);
  };

  const handleDeleteApplication = (id: string) => {
    if (window.confirm('Are you sure you want to remove this application?')) {
      setApplications((prev) => prev.filter((item) => item.id !== id));
      if (viewingApp?.id === id) setViewingApp(null);
    }
  };

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    if (viewingApp && viewingApp.id === id) {
      setViewingApp((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // --- FILTERING & SORTING ---
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          app.company.toLowerCase().includes(q) ||
          app.role.toLowerCase().includes(q) ||
          app.location.toLowerCase().includes(q) ||
          (app.recruiter && app.recruiter.toLowerCase().includes(q)) ||
          (app.notes && app.notes.toLowerCase().includes(q));

        // Status Filter
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

        // Priority Filter
        const matchesPriority = priorityFilter === 'All' || app.priority === priorityFilter;

        return matchesQuery && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
        }
        if (sortBy === 'deadline') {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (sortBy === 'match') {
          return (b.matchScore || 0) - (a.matchScore || 0);
        }
        return 0;
      });
  }, [applications, searchQuery, statusFilter, priorityFilter, sortBy]);

  // Stage counts
  const counts = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter((a) => a.status === 'Applied').length,
      interview: applications.filter((a) => a.status === 'Interview').length,
      offer: applications.filter((a) => a.status === 'Offer').length,
      rejected: applications.filter((a) => a.status === 'Rejected').length,
    };
  }, [applications]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Job & Internship Applications"
        description="Comprehensive pipeline tracking across Applied, Interview, Offer, and Rejected stages."
        badge={
          <Badge variant="brand" size="sm">
            {counts.total} Total
          </Badge>
        }
        actions={
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingApp(null);
              setIsModalOpen(true);
            }}
          >
            Add Application
          </Button>
        }
      />

      {/* --- PIPELINE STATUS COUNTERS --- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          onClick={() => setStatusFilter('All')}
          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
            statusFilter === 'All'
              ? 'bg-[#F3F6F8] border-[#D9D9D9]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#788896]" />
            <span className="text-xs font-semibold text-[#1D2226]">All Apps</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#1D2226]">{counts.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('Applied')}
          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
            statusFilter === 'Applied'
              ? 'bg-[#FFF4CC] border-[#ffe899]'
              : 'bg-white border-[#D9D9D9] hover:border-[#8A6100]/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-[#8A6100]">Applied</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#8A6100]">{counts.applied}</span>
        </button>

        <button
          onClick={() => setStatusFilter('Interview')}
          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
            statusFilter === 'Interview'
              ? 'bg-[#E8F3FF] border-[#d0e6fc]'
              : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
            <span className="text-xs font-semibold text-[#0A66C2]">Interview</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#0A66C2]">{counts.interview}</span>
        </button>

        <button
          onClick={() => setStatusFilter('Offer')}
          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
            statusFilter === 'Offer'
              ? 'bg-[#E6F4EA] border-[#c6ecd2]'
              : 'bg-white border-[#D9D9D9] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Offer</span>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-700">{counts.offer}</span>
        </button>

        <button
          onClick={() => setStatusFilter('Rejected')}
          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between col-span-2 sm:col-span-1 ${
            statusFilter === 'Rejected'
              ? 'bg-[#FCE8E6] border-[#f8cbc7]'
              : 'bg-white border-[#D9D9D9] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-[#B3261E]">Rejected</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#B3261E]">{counts.rejected}</span>
        </button>
      </div>

      {/* --- TOOLBAR: SEARCH, FILTERS, SORT, VIEW TOGGLE --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-[#D9D9D9] shadow-xs">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, role, recruiter, notes..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#788896] hover:text-[#1D2226]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Filters, Sort, View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="All">All Statuses</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
            >
              <option value="newest">Newest Applied</option>
              <option value="oldest">Oldest Applied</option>
              <option value="deadline">Closest Deadline</option>
              <option value="match">Highest Match</option>
            </select>
          </div>

          {/* Table / Kanban View Toggle */}
          <div className="flex items-center bg-[#F3F6F8] p-1 rounded-lg border border-[#D9D9D9]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226]'
              }`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px]">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'kanban'
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226]'
              }`}
              title="Kanban View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-[11px]">Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- ACTIVE VIEW (TABLE OR KANBAN) --- */}
      {viewMode === 'table' ? (
        <ApplicationTableView
          applications={filteredApplications}
          onView={(app) => setViewingApp(app)}
          onEdit={(app) => {
            setEditingApp(app);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteApplication}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ApplicationKanbanView
          applications={filteredApplications}
          onView={(app) => setViewingApp(app)}
          onEdit={(app) => {
            setEditingApp(app);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteApplication}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* --- ADD / EDIT APPLICATION MODAL --- */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingApp(null);
        }}
        onSubmit={handleSaveApplication}
        initialData={editingApp}
      />

      {/* --- VIEW APPLICATION DETAIL MODAL --- */}
      <ApplicationDetailModal
        application={viewingApp}
        isOpen={Boolean(viewingApp)}
        onClose={() => setViewingApp(null)}
        onEdit={(app) => {
          setEditingApp(app);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteApplication}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default ApplicationsPage;
