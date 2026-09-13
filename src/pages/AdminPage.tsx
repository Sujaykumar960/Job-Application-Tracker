import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Briefcase,
  FileText,
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { adminApi, AdminMetrics, AdminUserItem, AdminPostItem, AdminAuditLogItem } from '../api/adminApi';
import { useAuth } from '../context/AuthContext';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [systemInfo, setSystemInfo] = useState<{ status: string; environment: string; timestamp: string } | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Moderation state
  const [moderationPosts, setModerationPosts] = useState<AdminPostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Global status / error
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'moderation') {
      loadModerationPosts();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadOverview = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await adminApi.getOverview();
      setMetrics(data.metrics);
      setSystemInfo(data.system);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load platform overview metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({
        q: searchQuery || undefined,
        role: roleFilter || undefined,
        limit: 50,
      });
      setUsers(res.users);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to retrieve user directory');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    try {
      await adminApi.updateUserStatus(user.id, { isActive: !user.isActive });
      setSuccessMessage(`User status updated for ${user.email}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not update user status');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateUserStatus(userId, { role: newRole });
      setSuccessMessage(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not update user role');
    }
  };

  const loadModerationPosts = async () => {
    setIsLoadingPosts(true);
    setError(null);
    try {
      const res = await adminApi.listModerationPosts(50);
      setModerationPosts(res.posts);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load moderation posts');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to take down this post?')) return;
    try {
      await adminApi.deleteModerationPost(postId, 'Admin Moderation Action');
      setSuccessMessage('Post successfully moderated and taken down.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setModerationPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete post');
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs(50);
      setAuditLogs(res.auditLogs);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto p-8 my-12 text-center rounded-xl bg-card border border-border shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">
          The CareerX Administration Portal is restricted to platform administrators. Your current role is{' '}
          <span className="font-semibold text-foreground uppercase">{user.role}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <Shield className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              CareerX Platform Governance & Administration
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            System administration, user lifecycle management, content moderation, and operational observability.
          </p>
        </div>

        <button
          onClick={loadOverview}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Platform Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          User Governance
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'moderation'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Content Moderation
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Tab 1: Platform Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Users</span>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">{metrics.totalUsers}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metrics.totalSeekers} Seekers · {metrics.totalRecruiters} Recruiters · {metrics.totalAdmins} Admins
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Job Marketplace</span>
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">{metrics.totalJobs}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metrics.activeJobs} Active Openings Published
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Applications Submitted</span>
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">{metrics.totalApplications}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {metrics.totalResumes} Candidate Resumes Managed
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">System Health</span>
                  <Activity className="w-5 h-5 text-brand-500" />
                </div>
                <div className="mt-3 text-2xl font-bold text-emerald-500 capitalize">
                  {systemInfo?.status || 'Healthy'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Env: {systemInfo?.environment || 'Production'}
                </div>
              </div>
            </div>
          )}

          {/* Telemetry Links */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-base font-semibold text-foreground">Operational Endpoints & Observability</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <a
                href="/metrics"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg bg-muted/50 border border-border hover:border-brand-500 transition-colors block"
              >
                <div className="font-semibold text-foreground">Prometheus Metrics</div>
                <div className="text-xs text-muted-foreground mt-1">/metrics · Latency & traffic counters</div>
              </a>
              <a
                href="/api/health/ready"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg bg-muted/50 border border-border hover:border-brand-500 transition-colors block"
              >
                <div className="font-semibold text-foreground">Readiness Probe</div>
                <div className="text-xs text-muted-foreground mt-1">/api/health/ready · Deep health check</div>
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg bg-muted/50 border border-border hover:border-brand-500 transition-colors block"
              >
                <div className="font-semibold text-foreground">OpenAPI / Swagger</div>
                <div className="text-xs text-muted-foreground mt-1">/docs · Interactive API documentation</div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Governance */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                loadUsers();
              }}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Roles</option>
              <option value="seeker">Seekers</option>
              <option value="recruiter">Recruiters</option>
              <option value="admin">Administrators</option>
            </select>
            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              Filter
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded bg-muted border border-border text-foreground"
                          >
                            <option value="seeker">Seeker</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Suspended
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${
                              u.isActive
                                ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                                : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Content Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-base font-semibold text-foreground">Community Posts Moderation Queue</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Review published technical discussion posts and immediately take down abusive content or spam.
            </p>
          </div>

          {isLoadingPosts ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : moderationPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No posts in moderation queue.</div>
          ) : (
            <div className="space-y-3">
              {moderationPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-xl bg-card border border-border flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{post.author?.name || 'Anonymous Member'}</span>
                      <span>·</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] uppercase font-bold">{post.type}</span>
                      <span>·</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                  </div>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Take Down
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="text-base font-semibold text-foreground">Platform Administrative Audit Trail</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Immutable security record of administrative decisions, role adjustments, and content takedowns.
            </p>
          </div>

          {isLoadingAudit ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground uppercase tracking-wider">{log.event}</span>
                      <span className="text-muted-foreground ml-2">by Admin {log.actorId}</span>
                      {log.targetUserId && (
                        <span className="text-muted-foreground ml-2">→ Target User {log.targetUserId}</span>
                      )}
                      {log.reason && <span className="text-muted-foreground ml-2">(Reason: {log.reason})</span>}
                    </div>
                  </div>
                  <div className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
