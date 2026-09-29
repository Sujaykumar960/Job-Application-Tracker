import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ApplicationTableView } from '../components/applications/ApplicationTableView';
import { ApplicationKanbanView } from '../components/applications/ApplicationKanbanView';
import { ApplicationModal } from '../components/applications/ApplicationModal';
import { ApplicationDetailModal } from '../components/applications/ApplicationDetailModal';
import { Application, ApplicationStatus, PriorityLevel } from '../types';
import { applicationApi } from '../api/applicationApi';
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
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  // --- STATE FROM BACKEND ---
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'match'>('newest');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  // Fetch applications from backend
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await applicationApi.getApplications();
        setApplications(data ?? []);
      } catch (err) {
        console.error('Applications fetch error:', err);
        setError('Unable to load applications. Please try again.');
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // --- CRUD OPERATIONS ---
  const handleSaveApplication = async (appData: Application) => {
    try {
      if (editingApp && editingApp.id) {
        // Update existing
        const updated = await applicationApi.updateApplication(editingApp.id, appData);
        setApplications((prev) => prev.map((item) => (item.id === editingApp.id ? updated : item)));
      } else {
        // Create new
        const { id, ...createPayload } = appData;
        const created = await applicationApi.createApplication(createPayload);
        setApplications((prev) => [created, ...prev]);
      }
      setEditingApp(null);
    } catch (err) {
      console.error('Failed to save application:', err);
      alert('Failed to save application. Please try again.');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this application?')) {
      try {
        await applicationApi.deleteApplication(id);
        setApplications((prev) => prev.filter((item) => item.id !== id));
        if (viewingApp?.id === id) setViewingApp(null);
      } catch (err) {
        console.error('Failed to delete application:', err);
        alert('Failed to delete application. Please try again.');
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    try {
      const app = applications.find((a) => a.id === id);
      if (app) {
        const updated = await applicationApi.updateApplication(id, { status: newStatus });
        const merged = { ...app, ...updated, status: newStatus };
        setApplications((prev) => prev.map((a) => (a.id === id ? merged : a)));
        if (viewingApp && viewingApp.id === id) {
          setViewingApp((prev) => (prev ? { ...prev, ...merged } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading applications...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load applications</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
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
          </div>
        }
      />

      {applications.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-[380px] gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-[#D9D9D9] dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F3FF] dark:bg-sky-950/40 flex items-center justify-center text-[#0A66C2] dark:text-sky-400 shadow-xs border border-[#d0e6fc] dark:border-sky-800">
            <Briefcase className="w-8 h-8 text-[#0A66C2] dark:text-sky-400" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-[#1D2226] dark:text-slate-100">No applications yet</h3>
            <p className="text-[#56687A] dark:text-slate-400 mt-1 text-sm">
              Start tracking your job and internship applications, interview rounds, and offers here.
            </p>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingApp(null);
                setIsModalOpen(true);
              }}
              className="mt-4"
            >
              Add Your First Application
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* --- PIPELINE STATUS COUNTERS --- */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              onClick={() => setStatusFilter('All')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                statusFilter === 'All'
                  ? 'bg-[#F3F6F8] dark:bg-slate-800 border-[#D9D9D9] dark:border-slate-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#788896] dark:text-slate-400" />
                <span className="text-xs font-semibold text-[#1D2226] dark:text-slate-200">All Apps</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#1D2226] dark:text-slate-200">{counts.total}</span>
            </button>

            <button
              onClick={() => setStatusFilter('Applied')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                statusFilter === 'Applied'
                  ? 'bg-[#FFF4CC] dark:bg-amber-950/40 border-[#ffe899] dark:border-amber-800 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#8A6100]/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-[#8A6100] dark:text-amber-300">Applied</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#8A6100] dark:text-amber-300">{counts.applied}</span>
            </button>

            <button
              onClick={() => setStatusFilter('Interview')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                statusFilter === 'Interview'
                  ? 'bg-[#E8F3FF] dark:bg-sky-950/40 border-[#d0e6fc] dark:border-sky-800 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A66C2] dark:bg-sky-400" />
                <span className="text-xs font-semibold text-[#0A66C2] dark:text-sky-300">Interview</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#0A66C2] dark:text-sky-300">{counts.interview}</span>
            </button>

            <button
              onClick={() => setStatusFilter('Offer')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                statusFilter === 'Offer'
                  ? 'bg-[#E6F4EA] dark:bg-emerald-950/40 border-[#c6ecd2] dark:border-emerald-800 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Offer</span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">{counts.offer}</span>
            </button>

            <button
              onClick={() => setStatusFilter('Rejected')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between col-span-2 sm:col-span-1 ${
                statusFilter === 'Rejected'
                  ? 'bg-[#FCE8E6] dark:bg-rose-950/40 border-[#f8cbc7] dark:border-rose-800 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-[#B3261E] dark:text-rose-300">Rejected</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#B3261E] dark:text-rose-300">{counts.rejected}</span>
            </button>
          </div>

          {/* --- TOOLBAR: SEARCH, FILTERS, SORT, VIEW TOGGLE --- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-xs">
            {/* Left: Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#788896] dark:text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, role, recruiter, notes..."
                className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-400 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#788896] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100"
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
                  className="bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
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
                  className="bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
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
                  className="bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  <option value="newest">Newest Applied</option>
                  <option value="oldest">Oldest Applied</option>
                  <option value="deadline">Closest Deadline</option>
                  <option value="match">Highest Match</option>
                </select>
              </div>

              {/* Table / Kanban View Toggle */}
              <div className="flex items-center bg-[#F3F6F8] dark:bg-slate-800 p-1 rounded-lg border border-[#D9D9D9] dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                    viewMode === 'table'
                      ? 'bg-[#0A66C2] text-white shadow-sm'
                      : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100'
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
                      : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100'
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
        </>
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
