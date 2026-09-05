import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Lock,
  Eye,
  Briefcase,
  Bell,
  Key,
  Link2,
  LogOut,
  Check,
  DollarSign,
  Building2,
  Mail,
  Smartphone,
  Globe,
  Download,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../utils/cn';

type SettingsSection =
  | 'account'
  | 'security'
  | 'privacy'
  | 'profile_visibility'
  | 'recruiter_visibility'
  | 'notifications'
  | 'password'
  | 'connected_accounts';

const SETTINGS_STORAGE_KEY = 'careerx_user_settings_v2';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // default
      }
    }
    return {
      // Account
      name: user?.name || 'Alex Rivera',
      email: user?.email || 'alex.rivera@example.com',
      phone: '+1 (206) 555-0194',
      username: 'alexrivera',
      timezone: 'America/Los_Angeles (PST - UTC-8)',
      language: 'English (US)',

      // Security
      twoFactorEnabled: true,
      sessionTimeout: '2 hours',

      // Privacy
      allowAnalytics: true,
      allowSearchEngineIndex: false,

      // Specific Mandated Controls
      profileVisibility: 'public', // 'public' | 'members' | 'private'
      resumeVisibility: 'all_recruiters', // 'all_recruiters' | 'applied_only' | 'private'
      careerProgressVisibility: 'public_showcase', // 'public_showcase' | 'recruiters_only' | 'private'
      applicationPrivacy: true, // Keep submitted apps hidden from peers

      // Recruiter Visibility
      jobSearchStatus: 'actively_looking', // 'actively_looking' | 'casually_browsing' | 'not_looking'
      showSalary: true,
      salaryRange: '$165,000 - $195,000',
      cloakCurrentEmployer: true,
      contactVisibility: 'all_recruiters', // 'all_recruiters' | 'mutual_matches' | 'hidden'
      openToRelocation: true,

      // Notifications
      notifInterviewsEmail: true,
      notifInterviewsPush: true,
      notifDeadlinesEmail: true,
      notifDeadlinesPush: true,
      notifMessagesEmail: true,
      notifMessagesPush: true,
      notifRecommendationsEmail: true,
      notifAchievementsInApp: true,

      // Connected Accounts
      googleCalendarConnected: true,
      githubConnected: true,
      linkedinConnected: true,
      gitlabConnected: false,
    };
  });

  // Password fields state
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const showSaveNotice = (msg = 'Settings updated successfully') => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showSaveNotice();
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of CareerX?')) {
      await logout();
      navigate('/login');
    }
  };

  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordState.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    showSaveNotice('Password updated securely');
  };

  // Sidebar Nav Items
  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'profile_visibility', label: 'Profile Visibility', icon: Eye },
    { id: 'recruiter_visibility', label: 'Recruiter Visibility', icon: Briefcase },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'connected_accounts', label: 'Connected Accounts', icon: Link2 },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Settings & Privacy Controls"
        description="Manage your account preferences, candidate visibility, recruiter privacy shields, and connected services."
        badge={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            Security Shield Active
          </Badge>
        }
      />

      {/* Save Toast Notification */}
      {saveSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TWO-COLUMN COMPACT LAYOUT (Optimized for 1366px Laptop Screens)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ==================== LEFT: SETTINGS NAVIGATION (3 COLS) ==================== */}
        <Card className="md:col-span-4 lg:col-span-3 p-2 bg-white border border-[#D9D9D9] space-y-1 shadow-sm">
          <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase text-[#788896] tracking-wider">
            Preferences
          </div>

          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2.5',
                    isActive
                      ? 'bg-[#0A66C2] text-white font-semibold shadow-sm'
                      : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-[#788896]')} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Logout Button */}
          <div className="pt-2 border-t border-[#E8E8E8] mt-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#B3261E] hover:text-[#B3261E] hover:bg-[#FCE8E6] transition flex items-center gap-2.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </Card>

        {/* ==================== RIGHT: ACTIVE SETTINGS SECTION (9 COLS) ==================== */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          {/* SECTION 1: ACCOUNT */}
          {activeSection === 'account' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Account Information</h3>
                <p className="text-[11px] text-[#56687A]">Personal details and regional preferences</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Full Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => updateSetting('name', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Primary Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Phone Number</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Preferred Username</label>
                  <input
                    type="text"
                    value={settings.username}
                    onChange={(e) => updateSetting('username', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => updateSetting('timezone', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                  >
                    <option value="America/Los_Angeles (PST - UTC-8)">Pacific Time (PST)</option>
                    <option value="America/New_York (EST - UTC-5)">Eastern Time (EST)</option>
                    <option value="Europe/London (GMT - UTC+0)">London (GMT)</option>
                    <option value="Asia/Kolkata (IST - UTC+5:30)">India (IST)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Platform Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 2: SECURITY */}
          {activeSection === 'security' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Security & Session Management</h3>
                <p className="text-[11px] text-[#56687A]">Authentication standards and active sessions</p>
              </div>

              {/* 2FA Toggle */}
              <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#1D2226]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Two-Factor Authentication (2FA)</span>
                  </div>
                  <p className="text-[11px] text-[#56687A]">
                    Require TOTP authentication code when logging in from new devices.
                  </p>
                </div>

                <button
                  onClick={() => updateSetting('twoFactorEnabled', !settings.twoFactorEnabled)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                    settings.twoFactorEnabled ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                      settings.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Session Timeout */}
              <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1D2226] block">Session Auto-Lock Timeout</span>
                  <p className="text-[11px] text-[#56687A]">Automatically logout inactive sessions</p>
                </div>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                  className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  <option value="30 minutes">30 minutes</option>
                  <option value="2 hours">2 hours</option>
                  <option value="12 hours">12 hours</option>
                  <option value="30 days">30 days</option>
                </select>
              </div>

              {/* Active Sessions List */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] uppercase font-mono text-[#788896] font-bold block">
                  Active Verified Devices
                </span>
                <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#D9D9D9] flex items-center justify-center text-[#0A66C2] font-bold text-xs">
                      PC
                    </div>
                    <div>
                      <p className="font-semibold text-[#1D2226]">Chrome on Windows 11 (Current Session)</p>
                      <span className="text-[10px] text-[#788896] font-mono">Seattle, WA • IP: 172.56.21.94</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Active Now</Badge>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 3: PRIVACY */}
          {activeSection === 'privacy' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Data Privacy & Platform Telemetry</h3>
                <p className="text-[11px] text-[#56687A]">Manage data retention, indexing, and compliance</p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Search Engine Public Indexing</span>
                    <p className="text-[11px] text-[#56687A]">
                      Allow Google and search engines to index your verified portfolio and projects.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSetting('allowSearchEngineIndex', !settings.allowSearchEngineIndex)
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.allowSearchEngineIndex ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.allowSearchEngineIndex ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Anonymous Code Sandbox Telemetry</span>
                    <p className="text-[11px] text-[#56687A]">
                      Share aggregated benchmark statistics (runtime, memory) to improve Monaco sandbox tooling.
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('allowAnalytics', !settings.allowAnalytics)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.allowAnalytics ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.allowAnalytics ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Export Full Career Archive</span>
                    <p className="text-[11px] text-[#56687A]">
                      Download a complete JSON export of all applications, study logs, and ATS audits.
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const archiveData = {
                        user: { name: settings.name, email: settings.email },
                        settings,
                        exportedAt: new Date().toISOString(),
                      };
                      const element = document.createElement('a');
                      const file = new Blob([JSON.stringify(archiveData, null, 2)], {
                        type: 'application/json',
                      });
                      element.href = URL.createObjectURL(file);
                      element.download = 'careerx_data_archive.json';
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                      showSaveNotice('Career data archive exported successfully');
                    }}
                  >
                    Export Data
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 4: PROFILE VISIBILITY (Mandated Controls: Profile, Resume, Progress) */}
          {activeSection === 'profile_visibility' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Profile, Resume & Progress Visibility</h3>
                <p className="text-[11px] text-[#56687A]">
                  Granular control over who can see your profile, resume, and study achievements
                </p>
              </div>

              <div className="space-y-3.5">
                {/* 1. Profile Visibility */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1D2226] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0A66C2]" />
                      Public Profile Visibility
                    </span>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => updateSetting('profileVisibility', e.target.value)}
                      className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1 focus:ring-1 focus:ring-[#0A66C2]"
                    >
                      <option value="public">Public (Everyone)</option>
                      <option value="members">CareerX Members Only</option>
                      <option value="private">Private (Only You)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-[#56687A]">
                    Controls whether your bio, technical headline, and GitHub links are viewable on the web.
                  </p>
                </div>

                {/* 2. Resume Visibility */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1D2226] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Resume Visibility
                    </span>
                    <select
                      value={settings.resumeVisibility}
                      onChange={(e) => updateSetting('resumeVisibility', e.target.value)}
                      className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1 focus:ring-1 focus:ring-[#0A66C2]"
                    >
                      <option value="all_recruiters">All Verified Recruiters</option>
                      <option value="applied_only">Only Applied Companies</option>
                      <option value="private">Strictly Private</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-[#56687A]">
                    Determines who can view and download your attached PDF resume (ATS: 88%).
                  </p>
                </div>

                {/* 3. Career Progress Visibility */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1D2226] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Career Progress & Milestone Visibility
                    </span>
                    <select
                      value={settings.careerProgressVisibility}
                      onChange={(e) => updateSetting('careerProgressVisibility', e.target.value)}
                      className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2 py-1 focus:ring-1 focus:ring-[#0A66C2]"
                    >
                      <option value="public_showcase">Public Showcase on Feed</option>
                      <option value="recruiters_only">Verified Recruiters Only</option>
                      <option value="private">Private Study Mode</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-[#56687A]">
                    Controls whether coding streaks, unlocked badges, and assessment scorecards are visible.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 5: RECRUITER VISIBILITY (Mandated Controls: Recruiter Visibility & Application Privacy) */}
          {activeSection === 'recruiter_visibility' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Recruiter Visibility & Application Privacy</h3>
                <p className="text-[11px] text-[#56687A]">
                  Control how talent partners discover you and protect active application confidentiality
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Job Search Availability Status */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1D2226] block">Job Search Availability</span>
                    <p className="text-[11px] text-[#56687A]">Signals your readiness to inbound hiring teams</p>
                  </div>
                  <select
                    value={settings.jobSearchStatus}
                    onChange={(e) => updateSetting('jobSearchStatus', e.target.value)}
                    className="bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] px-2.5 py-1 font-semibold focus:ring-1 focus:ring-[#0A66C2]"
                  >
                    <option value="actively_looking">🟢 Actively Interviewing</option>
                    <option value="casually_browsing">🟡 Casually Browsing</option>
                    <option value="not_looking">⚪ Not Looking</option>
                  </select>
                </div>

                {/* Show Target Compensation */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1D2226] block">
                      Target Compensation ({settings.salaryRange})
                    </span>
                    <p className="text-[11px] text-[#56687A]">
                      When enabled, verified recruiters can match salary expectations before reaching out.
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('showSalary', !settings.showSalary)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.showSalary ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.showSalary ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Cloak from Current Employer */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1D2226] block">Cloak from Current Employer Domain</span>
                    <p className="text-[11px] text-[#56687A]">
                      Blocks recruiters associated with your current employer (@cloudscale.io) from viewing you.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSetting('cloakCurrentEmployer', !settings.cloakCurrentEmployer)
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.cloakCurrentEmployer ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.cloakCurrentEmployer ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Application Privacy (Mandated Control) */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1D2226] block">Strict Application Privacy</span>
                    <p className="text-[11px] text-[#56687A]">
                      Keep all submitted applications, interview stages, and offers strictly private from peers and public feed.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSetting('applicationPrivacy', !settings.applicationPrivacy)
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.applicationPrivacy ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.applicationPrivacy ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 6: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Notification Channels & Alerts</h3>
                <p className="text-[11px] text-[#56687A]">Configure email, in-app, and push triggers</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Interview Reminders & Links</span>
                    <p className="text-[11px] text-[#56687A]">Alerts 2 hours before scheduled technical rounds</p>
                  </div>
                  <button
                    onClick={() =>
                      updateSetting('notifInterviewsPush', !settings.notifInterviewsPush)
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.notifInterviewsPush ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.notifInterviewsPush ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Application Deadlines & Cutoffs</span>
                    <p className="text-[11px] text-[#56687A]">Warnings 24 hours before role expirations</p>
                  </div>
                  <button
                    onClick={() =>
                      updateSetting('notifDeadlinesEmail', !settings.notifDeadlinesEmail)
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.notifDeadlinesEmail ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.notifDeadlinesEmail ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#1D2226] block">Recruiter Direct Messages</span>
                    <p className="text-[11px] text-[#56687A]">Instant in-app push and email notifications</p>
                  </div>
                  <button
                    onClick={() => updateSetting('notifMessagesPush', !settings.notifMessagesPush)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                      settings.notifMessagesPush ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                        settings.notifMessagesPush ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 7: PASSWORD */}
          {activeSection === 'password' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Change Account Password</h3>
                <p className="text-[11px] text-[#56687A]">Ensure your account uses a strong, unique password</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-3.5 max-w-md">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-[#FCE8E6] border border-[#B3261E]/30 text-xs text-[#B3261E] flex items-center gap-2 animate-in fade-in duration-150 font-medium">
                    <AlertCircle className="w-4 h-4 text-[#B3261E] flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordState.currentPassword}
                    onChange={(e) =>
                      setPasswordState({ ...passwordState, currentPassword: e.target.value })
                    }
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordState.newPassword}
                    onChange={(e) =>
                      setPasswordState({ ...passwordState, newPassword: e.target.value })
                    }
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                  />
                  <p className="text-[10px] text-[#788896]">Minimum 8 characters with numbers and symbols</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[#38434F] font-semibold block">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordState.confirmPassword}
                    onChange={(e) =>
                      setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                    }
                    className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" size="sm" variant="primary">
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* SECTION 8: CONNECTED ACCOUNTS */}
          {activeSection === 'connected_accounts' && (
            <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 text-xs shadow-sm">
              <div className="border-b border-[#E8E8E8] pb-2">
                <h3 className="text-sm font-bold text-[#1D2226]">Connected Platforms & Integrations</h3>
                <p className="text-[11px] text-[#56687A]">Sync technical calendars and developer profiles</p>
              </div>

              <div className="space-y-3">
                {/* Google Calendar */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-center text-emerald-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1D2226]">Google Calendar</span>
                        <Badge variant="success" size="sm">Connected</Badge>
                      </div>
                      <p className="text-[11px] text-[#788896] font-mono">alex.rivera.dev@gmail.com</p>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      updateSetting(
                        'googleCalendarConnected',
                        !settings.googleCalendarConnected
                      )
                    }
                  >
                    {settings.googleCalendarConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>

                {/* GitHub */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-center text-[#1D2226]">
                      <span className="font-bold text-xs">GH</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1D2226]">GitHub</span>
                        <Badge variant="brand" size="sm">Connected</Badge>
                      </div>
                      <p className="text-[11px] text-[#788896] font-mono">@alexrivera • 4 live repos synced</p>
                    </div>
                  </div>

                  <Button size="xs" variant="outline">Manage</Button>
                </div>

                {/* LinkedIn */}
                <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-center text-[#0A66C2] font-bold text-xs">
                      in
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1D2226]">LinkedIn</span>
                        <Badge variant="brand" size="sm">Connected</Badge>
                      </div>
                      <p className="text-[11px] text-[#788896] font-mono">/in/alexrivera-dev</p>
                    </div>
                  </div>

                  <Button size="xs" variant="outline">Manage</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
