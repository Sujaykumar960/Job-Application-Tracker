import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EditProfileModal, ProfileFormData } from '../components/profile/EditProfileModal';
import { RecruiterPrivacyCard } from '../components/profile/RecruiterPrivacyCard';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Mail,
  Briefcase,
  Github,
  Linkedin,
  Globe,
  FileText,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Flame,
  Target,
  Trophy,
  Award,
  Calendar,
  ExternalLink,
  MessageSquare,
  UserPlus,
  UserCheck,
  Users,
  GraduationCap,
  Code2,
  TrendingUp,
  Download,
  ArrowUpRight,
  Clock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Connection & Edit State
  const [isConnected, setIsConnected] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || 'Alex Rivera',
    headline:
      user?.headline ||
      'Distributed Systems & Backend Platform Engineer | Go, TypeScript, PostgreSQL | Ex-CloudScale Intern | B.S. CS @ Univ. of Washington',
    location: user?.location || 'Seattle, WA (Open to Remote & Hybrid)',
    bio:
      user?.bio ||
      'Software engineer obsessed with high-throughput backend architecture, concurrency models, and low-latency data pipelines. Experienced in designing distributed rate limiters, Kafka event-driven architectures, and transactional relational data models. Passionate about craftsmanship, 60fps local-first web applications, and writing clean, benchmarked Go and TypeScript code.',
    github: 'https://github.com/alexrivera',
    linkedin: 'https://linkedin.com/in/alexrivera-dev',
    website: 'https://alexrivera.dev',
  });

  const handleSaveProfile = (updated: ProfileFormData) => {
    setProfileData(updated);
    setIsEditModalOpen(false);
  };

  // Work Experience
  const experiences = [
    {
      company: 'CloudScale Infrastructure',
      role: 'Backend Software Engineer Intern',
      period: 'Jun 2025 - Sep 2025 (4 mos)',
      location: 'San Francisco, CA (Hybrid)',
      bullets: [
        'Architected a distributed sliding-window rate limiter in Go and atomic Redis Lua scripts, throttling 45M+ daily requests and reducing p99 latency spikes by 38%.',
        'Implemented Kafka partition rebalancing hooks and dead-letter queues, cutting event processing drops to 0.00%.',
        'Profiled memory footprint in Go telemetry services using ppprof, reclaiming 2.1 GB of heap allocations across production pods.',
      ],
      skills: ['Go', 'Redis Lua', 'Kafka', 'Docker', 'pprof'],
    },
    {
      company: 'University of Washington Distributed Systems Lab',
      role: 'Undergraduate Systems Researcher',
      period: 'Sep 2024 - Jun 2025 (10 mos)',
      location: 'Seattle, WA',
      bullets: [
        'Researched conflict-free replicated data types (CRDTs) and consensus protocols (Raft) for collaborative document sync.',
        'Co-authored technical benchmark paper evaluating multi-master PostgreSQL replication vs DynamoDB transaction isolation.',
      ],
      skills: ['C++', 'Distributed Systems', 'PostgreSQL', 'Raft'],
    },
  ];

  // Featured Projects
  const projects = [
    {
      title: 'Distributed Event Streaming Broker',
      tech: ['Go', 'Kafka', 'Redis', 'Docker'],
      impact: '12k msg/sec throughput with zero message loss and transactional outbox guarantees.',
      link: 'https://github.com/alexrivera/distributed-broker',
      date: 'Aug 2026',
    },
    {
      title: 'Sliding-Window Rate Limiter Service',
      tech: ['Go', 'Redis Lua', 'gRPC', 'Protobuf'],
      impact: 'Throttles 45M+ daily requests with atomic Redis scripts and <10ms p99 latency.',
      link: 'https://github.com/alexrivera/go-rate-limiter',
      date: 'Jul 2026',
    },
    {
      title: 'Local-First Issue Tracker UI',
      tech: ['React', 'TypeScript', 'WebSockets', 'Tailwind CSS'],
      impact: 'Sub-200ms initial load, CRDT collaborative sync, and 60fps micro-interactions.',
      link: 'https://github.com/alexrivera/linear-clone',
      date: 'Jun 2026',
    },
    {
      title: 'High-Throughput Telemetry Aggregator',
      tech: ['Python', 'PostgreSQL', 'Docker', 'Grafana'],
      impact: 'Ingests microservice latency spans with partition sharding and B-Tree indexes.',
      link: 'https://github.com/alexrivera/telemetry-engine',
      date: 'May 2026',
    },
  ];

  // Categorized Skills
  const skillsMatrix = {
    'Languages': ['Go (Golang)', 'TypeScript', 'Python', 'SQL', 'C++', 'JavaScript'],
    'Distributed Architecture': ['Event-Driven (Kafka)', 'gRPC & Protobuf', 'Microservices', 'Rate Limiting', 'Concurrency'],
    'Databases & Caching': ['PostgreSQL (B-Trees)', 'Redis (Lua)', 'DynamoDB', 'MongoDB', 'ACID Isolation'],
    'Cloud & Infrastructure': ['Docker', 'Kubernetes (CKA)', 'AWS (ECS, S3, RDS)', 'Linux Internals', 'CI/CD Pipelines'],
    'Frontend': ['React 19', 'Next.js', 'Tailwind CSS', 'WebSockets', 'State Machines'],
  };

  // Certifications
  const certifications = [
    {
      name: 'AWS Certified Solutions Architect - Associate',
      issuer: 'Amazon Web Services',
      issueDate: 'Jul 2026',
      credentialId: 'AWS-PSA-849204',
    },
    {
      name: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation (CNCF)',
      issueDate: 'Aug 2026',
      credentialId: 'CKA-992015-LF',
    },
    {
      name: 'Meta Advanced React & Architecture Certification',
      issuer: 'Meta / Coursera',
      issueDate: 'May 2026',
      credentialId: 'META-REACT-34821',
    },
  ];

  // Achievements
  const achievements = [
    { title: '100 Questions Solved', date: 'Aug 2026', icon: Target, badge: 'Algorithmic Mastery' },
    { title: '14 Day Coding Streak', date: 'Sep 2026', icon: Flame, badge: 'Top 5% Consistency' },
    { title: 'Senior Backend Verified', date: 'Aug 2026', icon: Trophy, badge: '94% Score (Top 6%)' },
    { title: '88% ATS Resume Score', date: 'Sep 2026', icon: Sparkles, badge: 'FAANG Ready' },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HERO PROFILE CARD                                                      */}
      {/* ========================================================================= */}
      <Card className="p-6 bg-white border border-[#D9D9D9] space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left: Avatar + Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Status Ring */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-700 to-[#1D2226] border-2 border-[#0A66C2]/50 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
                {profileData.name.slice(0, 2).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono font-bold text-[9px] border-2 border-white shadow"
                title="Actively Interviewing"
              >
                OPEN
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-[#1D2226] tracking-tight">
                  {profileData.name}
                </h1>
                <Badge variant="brand" size="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Engineer
                </Badge>
                <Badge variant="success" size="sm">
                  ATS: 88%
                </Badge>
              </div>

              <p className="text-xs text-[#56687A] font-medium max-w-2xl leading-relaxed">
                {profileData.headline}
              </p>

              <div className="flex items-center gap-4 text-xs text-[#788896] flex-wrap pt-0.5 font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#788896]" />
                  {profileData.location}
                </span>
                <span className="flex items-center gap-1 text-[#56687A]">
                  <Briefcase className="w-3 h-3 text-[#788896]" />
                  Actively Interviewing
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions (Edit Profile, Connect, Message) */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>

            <Button
              size="sm"
              variant={isConnected ? 'outline' : 'secondary'}
              onClick={() => setIsConnected(!isConnected)}
              icon={
                isConnected ? (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )
              }
            >
              {isConnected ? 'Connected ✓' : 'Connect'}
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/messages')}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Message
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/network')}
              icon={<Users className="w-3.5 h-3.5 text-[#0A66C2]" />}
            >
              Network
            </Button>
          </div>
        </div>

        {/* Links Bar */}
        <div className="pt-4 border-t border-[#E8E8E8] flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {profileData.github && (
              <a
                href={profileData.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#56687A] hover:text-[#1D2226] transition font-mono text-[11px]"
              >
                <Github className="w-3.5 h-3.5" />
                <span>alexrivera</span>
              </a>
            )}
            {profileData.linkedin && (
              <a
                href={profileData.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#0A66C2] hover:text-[#004182] transition font-mono text-[11px]"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                <span>LinkedIn</span>
              </a>
            )}
            {profileData.website && (
              <a
                href={profileData.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#56687A] hover:text-[#1D2226] transition font-mono text-[11px]"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>alexrivera.dev</span>
              </a>
            )}
          </div>

          {/* Resume Quick Badge */}
          <Link
            to="/resume"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F3F6F8] hover:bg-[#E8E8E8] border border-[#D9D9D9] text-[#0A66C2] hover:text-[#004182] transition font-mono text-[11px]"
          >
            <FileText className="w-3 h-3 text-[#0A66C2]" />
            <span>Alex_Rivera_Distributed_Systems.pdf</span>
            <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-[#788896]" />
          </Link>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. CODING STATISTICS BAR                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Questions Solved</span>
          <p className="text-lg font-bold text-[#1D2226] font-mono">142 / 150</p>
          <span className="text-[10px] text-emerald-600 font-mono">Top 5% Volume</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Coding Streak</span>
          <p className="text-lg font-bold text-[#8A6100] font-mono flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-500" />
            14 Days
          </p>
          <span className="text-[10px] text-[#8A6100] font-mono">Active Streak</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">First-Submit Acc</span>
          <p className="text-lg font-bold text-emerald-600 font-mono">93.4%</p>
          <span className="text-[10px] text-emerald-600 font-mono">Verified Tests</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">ATS Resume Score</span>
          <p className="text-lg font-bold text-[#0A66C2] font-mono">88%</p>
          <span className="text-[10px] text-[#0A66C2] font-mono">FAANG Ready</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Tracked Languages</span>
          <p className="text-lg font-bold text-[#1D2226] font-mono">15</p>
          <span className="text-[10px] text-sky-600 font-mono">Go, TS, Python...</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896]">Career Readiness</span>
          <p className="text-lg font-bold text-[#1D2226] font-mono">94%</p>
          <span className="text-[10px] text-emerald-600 font-mono">Offer Stage</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN 2-COLUMN LAYOUT: CONTENT ON LEFT, WIDGETS ON RIGHT                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================== LEFT COLUMN (8 COLS) ==================== */}
        <div className="lg:col-span-8 space-y-5">
          {/* ABOUT SECTION */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0A66C2]" />
              About & Engineering Philosophy
            </h3>
            <p className="text-xs text-[#38434F] leading-relaxed whitespace-pre-wrap font-sans">
              {profileData.bio}
            </p>
          </Card>

          {/* EXPERIENCE SECTION */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-[#0A66C2]" />
                Work Experience ({experiences.length})
              </h3>
              <Badge variant="brand" size="sm">
                Verified
              </Badge>
            </div>

            <div className="space-y-4">
              {experiences.map((exp, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-sm font-bold text-[#1D2226]">{exp.role}</h4>
                      <p className="text-xs text-[#0A66C2] font-semibold">{exp.company}</p>
                    </div>
                    <div className="text-left sm:text-right font-mono text-[11px] text-[#788896]">
                      <p>{exp.period}</p>
                      <p className="text-[#788896]">{exp.location}</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5 list-disc list-inside text-xs text-[#38434F] leading-relaxed">
                    {exp.bullets.map((b, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {exp.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-white border border-[#D9D9D9] text-[10px] font-mono text-[#56687A]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* FEATURED PROJECTS */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                Production Engineering Projects ({projects.length})
              </h3>
              <Badge variant="brand" size="sm">
                Live Repos
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {projects.map((proj) => (
                <div
                  key={proj.title}
                  className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col justify-between space-y-3 hover:border-[#0A66C2]/40 transition group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition line-clamp-1">
                        {proj.title}
                      </h4>
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#788896] hover:text-[#1D2226]"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-[11px] text-[#38434F] leading-relaxed line-clamp-2">
                      {proj.impact}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E8E8E8]">
                    <div className="flex flex-wrap gap-1">
                      {proj.tech.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 rounded bg-white text-[#56687A] border border-[#D9D9D9] text-[10px] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-[#788896] block">
                      Published: {proj.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* EDUCATION SECTION */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
              Education & Academic Credentials
            </h3>

            <div className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#1D2226]">University of Washington</h4>
                <p className="text-xs text-[#0A66C2]">
                  Bachelor of Science in Computer Science (B.S. CS)
                </p>
                <p className="text-[11px] text-[#56687A]">
                  Relevant Coursework: Distributed Systems, Operating Systems, Relational Databases, Advanced Algorithms.
                </p>
              </div>

              <div className="text-left sm:text-right font-mono text-xs space-y-0.5">
                <span className="font-bold text-emerald-600">GPA: 3.8 / 4.0</span>
                <p className="text-[10px] text-[#788896]">Dean's Honor List</p>
                <p className="text-[10px] text-[#788896]">Graduated: June 2024</p>
              </div>
            </div>
          </Card>

          {/* CAREER TIMELINE PREVIEW */}
          <Card className="p-5 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#0A66C2]" />
                Career Growth Trajectory
              </h3>
              <Link to="/progress" className="text-xs text-[#0A66C2] hover:text-[#004182] font-semibold flex items-center gap-1">
                Full Progress Analytics <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                <span className="text-[10px] text-[#788896] uppercase">Phase 1: Foundation</span>
                <p className="font-bold text-[#1D2226]">UW B.S. CS (3.8 GPA)</p>
                <span className="text-[10px] text-emerald-600">Completed ✓</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                <span className="text-[10px] text-[#788896] uppercase">Phase 2: Mastery</span>
                <p className="font-bold text-[#1D2226]">142 Problems (93% Acc)</p>
                <span className="text-[10px] text-emerald-600">Top 5% Tier ✓</span>
              </div>
              <div className="p-3 rounded-xl bg-[#E8F3FF] border border-[#0A66C2]/30 space-y-1">
                <span className="text-[10px] text-[#0A66C2] uppercase">Phase 3: Placement</span>
                <p className="font-bold text-[#1D2226]">Stripe / Linear Pipeline</p>
                <span className="text-[10px] text-[#8A6100]">Active Rounds</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ==================== RIGHT COLUMN (4 COLS) ==================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* PROFILE COMPLETION WIDGET */}
          <ProfileCompletionCard />

          {/* RECRUITER PRIVACY CONTROLS */}
          <RecruiterPrivacyCard />

          {/* VERIFIED RESUME CARD */}
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0A66C2]" />
                <h3 className="text-xs font-bold text-[#1D2226]">Attached Resume</h3>
              </div>
              <Badge variant="success" size="sm">
                88% ATS Score
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
              <p className="text-xs font-bold text-[#1D2226] truncate">
                Alex_Rivera_Distributed_Systems.pdf
              </p>
              <p className="text-[11px] text-[#56687A]">
                Optimized for Senior Backend & Distributed Systems engineering rubrics.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#788896] pt-1">
                <span>PDF • 2.4 MB</span>
                <span>Updated Sep 02, 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link to="/resume" className="w-full">
                <Button size="xs" variant="outline" className="w-full text-[11px]">
                  Inspect in ATS
                </Button>
              </Link>
              <Button
                size="xs"
                variant="primary"
                className="w-full text-[11px]"
                icon={<Download className="w-3 h-3" />}
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob(
                    [`Alex Rivera - Full Stack & Distributed Systems Engineer\nResume Version: 2026.09\nATS Score: 88%\nSkills: Go, TypeScript, Python, PostgreSQL, Kafka, Redis, Docker, Kubernetes`],
                    { type: 'text/plain' }
                  );
                  element.href = URL.createObjectURL(file);
                  element.download = 'Alex_Rivera_Distributed_Systems.txt';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                Download PDF
              </Button>
            </div>
          </Card>

          {/* CERTIFICATIONS CARD */}
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Certifications ({certifications.length})
              </h3>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>

            <div className="space-y-2.5">
              {certifications.map((cert) => (
                <div
                  key={cert.name}
                  className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1"
                >
                  <p className="text-xs font-bold text-[#1D2226] leading-snug">{cert.name}</p>
                  <p className="text-[11px] text-[#56687A]">{cert.issuer}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-[#788896]">
                    <span>{cert.credentialId}</span>
                    <span className="text-emerald-600 font-bold">{cert.issueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ACHIEVEMENTS CARD */}
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Key Achievements ({achievements.length})
              </h3>
            </div>

            <div className="space-y-2">
              {achievements.map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.title}
                    className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-[#1D2226]">{ach.title}</p>
                        <span className="text-[10px] text-[#56687A] font-mono">{ach.badge}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#788896]">{ach.date}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CATEGORIZED SKILLS MATRIX */}
          <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
              <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#0A66C2]" />
                Verified Skills Matrix
              </h3>
              <Link to="/skills" className="text-[11px] text-[#0A66C2] hover:text-[#004182] font-semibold">
                Gap Matrix →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {Object.entries(skillsMatrix).map(([category, skills]) => (
                <div key={category} className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#788896] uppercase font-semibold block">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] font-mono text-[10px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EDIT PROFILE MODAL                                                     */}
      {/* ========================================================================= */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        initialData={profileData}
      />
    </div>
  );
};

export default ProfilePage;
