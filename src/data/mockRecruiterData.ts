export interface RecruiterCandidate {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceLevel: 'Entry / Intern' | 'Junior' | 'Mid Level' | 'Senior' | 'Lead';
  yearsExperience: string;
  skills: string[];
  questionsSolved: number;
  totalQuestions: number;
  accuracy: number;
  streak: number;
  projectsCount: number;
  featuredProjects: string[];
  assessmentName: string;
  assessmentScore: number;
  assessmentPercentile: string;
  jobMatch: number;
  targetRole: string;
  careerGrowthMetric: string;
  atsScore: number;
  avatarInitials: string;
  avatarGradient: string;
  isShortlisted: boolean;
  interviewStage?: 'Phone Screen' | 'Technical Onsite' | 'Offer Sent' | 'Not Started';
  
  // Privacy Settings (Set by candidate)
  privacy: {
    searchStatus: 'actively_looking' | 'casually_browsing' | 'not_looking';
    showSalary: boolean;
    salaryExpectation: string;
    contactVisibility: 'all_recruiters' | 'mutual_matches' | 'hidden';
    email: string;
    phone?: string;
    cloakedFromCurrentEmployer: boolean;
    currentEmployer?: string;
  };
}

export const INITIAL_RECRUITER_CANDIDATES: RecruiterCandidate[] = [
  // 1. Alex Rivera (Featured Candidate)
  {
    id: 'cand-1',
    name: 'Alex Rivera',
    role: 'Distributed Systems & Backend Platform Engineer',
    location: 'Seattle, WA (Open to Remote & Hybrid)',
    experienceLevel: 'Mid Level',
    yearsExperience: '2.5 yrs (Ex-CloudScale Intern)',
    skills: ['Go', 'Kafka', 'PostgreSQL', 'Redis Lua', 'Docker', 'Kubernetes'],
    questionsSolved: 142,
    totalQuestions: 150,
    accuracy: 93.4,
    streak: 14,
    projectsCount: 4,
    featuredProjects: ['Distributed Event Streaming Broker', 'Sliding Window Rate Limiter Service'],
    assessmentName: 'Senior Backend & Concurrency Systems Exam',
    assessmentScore: 94,
    assessmentPercentile: 'Top 6%',
    jobMatch: 94,
    targetRole: 'Backend Software Engineer, Core Payments',
    careerGrowthMetric: '+42% growth across 6 months • 14d streak',
    atsScore: 88,
    avatarInitials: 'AR',
    avatarGradient: 'from-brand-600 to-indigo-800',
    isShortlisted: true,
    interviewStage: 'Technical Onsite',
    privacy: {
      searchStatus: 'actively_looking',
      showSalary: true,
      salaryExpectation: '$165,000 - $195,000',
      contactVisibility: 'all_recruiters',
      email: 'alex.rivera@example.com',
      phone: '+1 (206) 555-0194',
      cloakedFromCurrentEmployer: true,
      currentEmployer: 'CloudScale',
    },
  },

  // 2. Elena Rostova
  {
    id: 'cand-2',
    name: 'Elena Rostova',
    role: 'Full Stack Engineer (React, TypeScript & Go)',
    location: 'Seattle, WA (Remote)',
    experienceLevel: 'Senior',
    yearsExperience: '5 yrs',
    skills: ['React', 'TypeScript', 'Next.js', 'Go', 'WebSockets', 'GraphQL'],
    questionsSolved: 158,
    totalQuestions: 160,
    accuracy: 94.8,
    streak: 22,
    projectsCount: 5,
    featuredProjects: ['Turbopack Monorepo Analyzer', 'CRDT Collaborative Editor'],
    assessmentName: 'Frontend Architecture & Systems Assessment',
    assessmentScore: 95,
    assessmentPercentile: 'Top 4%',
    jobMatch: 92,
    targetRole: 'Full Stack Product Engineer, Sync Engine',
    careerGrowthMetric: '158 solved • Published open-source Rust bundler',
    atsScore: 91,
    avatarInitials: 'ER',
    avatarGradient: 'from-rose-600 to-pink-800',
    isShortlisted: true,
    interviewStage: 'Offer Sent',
    privacy: {
      searchStatus: 'actively_looking',
      showSalary: true,
      salaryExpectation: '$180,000 - $215,000',
      contactVisibility: 'all_recruiters',
      email: 'elena.rostova@example.com',
      cloakedFromCurrentEmployer: false,
    },
  },

  // 3. Devin Chen
  {
    id: 'cand-3',
    name: 'Devin Chen',
    role: 'Systems & Infrastructure Software Engineer',
    location: 'Seattle, WA',
    experienceLevel: 'Entry / Intern',
    yearsExperience: 'New Grad (UW Distributed Systems Lab)',
    skills: ['C++', 'Go', 'Raft', 'PostgreSQL', 'Operating Systems', 'Linux'],
    questionsSolved: 110,
    totalQuestions: 130,
    accuracy: 89.2,
    streak: 8,
    projectsCount: 3,
    featuredProjects: ['Raft Consensus Engine', 'Multi-Master Postgres Benchmarker'],
    assessmentName: 'Systems Architecture & Algorithms',
    assessmentScore: 88,
    assessmentPercentile: 'Top 12%',
    jobMatch: 86,
    targetRole: 'Systems Software Engineer',
    careerGrowthMetric: 'UW CS Magna Cum Laude • 110 solved',
    atsScore: 84,
    avatarInitials: 'DC',
    avatarGradient: 'from-cyan-600 to-blue-800',
    isShortlisted: false,
    interviewStage: 'Not Started',
    privacy: {
      searchStatus: 'actively_looking',
      showSalary: false,
      salaryExpectation: '$130,000 - $155,000',
      contactVisibility: 'mutual_matches',
      email: 'devin.chen@uw.edu',
      cloakedFromCurrentEmployer: false,
    },
  },

  // 4. Sophia Patel
  {
    id: 'cand-4',
    name: 'Sophia Patel',
    role: 'Cloud Platform & Kubernetes SRE Specialist',
    location: 'Los Gatos, CA (Remote)',
    experienceLevel: 'Senior',
    yearsExperience: '6 yrs',
    skills: ['Kubernetes (CKA)', 'AWS', 'Terraform', 'Go', 'eBPF', 'Service Mesh'],
    questionsSolved: 125,
    totalQuestions: 140,
    accuracy: 91.0,
    streak: 11,
    projectsCount: 4,
    featuredProjects: ['Multi-Cluster Ingress Mesh', 'Automated DR Snapshot Restorer'],
    assessmentName: 'Cloud Native Infrastructure Benchmark',
    assessmentScore: 96,
    assessmentPercentile: 'Top 2%',
    jobMatch: 89,
    targetRole: 'Infrastructure & SRE Platform Engineer',
    careerGrowthMetric: 'Certified Kubernetes Administrator (CKA)',
    atsScore: 89,
    avatarInitials: 'SP',
    avatarGradient: 'from-indigo-600 to-brand-800',
    isShortlisted: false,
    interviewStage: 'Phone Screen',
    privacy: {
      searchStatus: 'casually_browsing',
      showSalary: true,
      salaryExpectation: '$195,000 - $235,000',
      contactVisibility: 'hidden',
      email: 'sophia.patel@example.com',
      cloakedFromCurrentEmployer: true,
      currentEmployer: 'Netflix',
    },
  },

  // 5. Arjun Mehta
  {
    id: 'cand-5',
    name: 'Arjun Mehta',
    role: 'Database Kernel & Storage Systems Engineer',
    location: 'New York, NY (Hybrid)',
    experienceLevel: 'Lead',
    yearsExperience: '8 yrs',
    skills: ['Go', 'Raft', 'Distributed SQL', 'PostgreSQL Internals', 'C++'],
    questionsSolved: 195,
    totalQuestions: 200,
    accuracy: 96.2,
    streak: 30,
    projectsCount: 6,
    featuredProjects: ['LSM-Tree Key-Value Engine', 'Paxos Consensus Sharding'],
    assessmentName: 'Distributed Database Systems Exam',
    assessmentScore: 98,
    assessmentPercentile: 'Top 1%',
    jobMatch: 95,
    targetRole: 'Principal Database Architect',
    careerGrowthMetric: '195 solved • Storage engine maintainer',
    atsScore: 93,
    avatarInitials: 'AM',
    avatarGradient: 'from-purple-600 to-indigo-900',
    isShortlisted: true,
    interviewStage: 'Technical Onsite',
    privacy: {
      searchStatus: 'casually_browsing',
      showSalary: true,
      salaryExpectation: '$220,000 - $260,000',
      contactVisibility: 'all_recruiters',
      email: 'arjun.mehta@example.com',
      cloakedFromCurrentEmployer: false,
    },
  },

  // 6. Liam O’Connor
  {
    id: 'cand-6',
    name: 'Liam O’Connor',
    role: 'Backend Platform & High Availability Engineer',
    location: 'Bellevue, WA',
    experienceLevel: 'Mid Level',
    yearsExperience: '4 yrs',
    skills: ['Go', 'Ruby', 'MySQL', 'High Availability', 'Kafka', 'Redis'],
    questionsSolved: 134,
    totalQuestions: 150,
    accuracy: 90.5,
    streak: 6,
    projectsCount: 3,
    featuredProjects: ['Zero-Downtime Migration Runner', 'Distributed Shard Rebalancer'],
    assessmentName: 'Relational Scaling & Sharding Exam',
    assessmentScore: 89,
    assessmentPercentile: 'Top 10%',
    jobMatch: 85,
    targetRole: 'Backend Software Engineer, Core Payments',
    careerGrowthMetric: '134 solved • +35% ATS Score growth',
    atsScore: 86,
    avatarInitials: 'LO',
    avatarGradient: 'from-slate-700 to-surface-950',
    isShortlisted: false,
    interviewStage: 'Not Started',
    privacy: {
      searchStatus: 'actively_looking',
      showSalary: false,
      salaryExpectation: '$160,000 - $185,000',
      contactVisibility: 'mutual_matches',
      email: 'liam.oc@example.com',
      cloakedFromCurrentEmployer: false,
    },
  },
];
