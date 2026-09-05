export type PostType =
  | 'Achievement'
  | 'Project'
  | 'Certification'
  | 'Learning Update'
  | 'Career Advice'
  | 'Technical Discussion'
  | 'Job Announcement';

export interface FeedComment {
  id: string;
  authorName: string;
  authorHeadline: string;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: {
    name: string;
    headline: string;
    avatarInitials: string;
    company?: string;
    isVerified: boolean;
  };
  type: PostType;
  createdAt: string;
  content: string;
  codeSnippet?: string;
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  isSaved: boolean;
  sharesCount: number;
  comments: FeedComment[];
}

export const INITIAL_FEED_POSTS: FeedPost[] = [
  // 1. Technical Discussion
  {
    id: 'post-1',
    author: {
      name: 'Alex Rivera',
      headline: 'Distributed Systems & Backend Engineer',
      avatarInitials: 'AR',
      company: 'CloudScale',
      isVerified: true,
    },
    type: 'Technical Discussion',
    createdAt: '2h ago',
    content:
      'When designing distributed rate limiters for 50k+ requests/sec, fixed-window counters allow 2x traffic bursts at boundary borders. Sliding window logs with atomic Redis Lua scripts solve this cleanly with O(1) memory overhead when you trim timestamps.',
    codeSnippet: `// Atomic sliding-window evaluation in Redis Lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local current = redis.call('ZCARD', key)
if current < limit then
    redis.call('ZADD', key, now, now)
    return 1
end
return 0`,
    tags: ['Redis', 'DistributedSystems', 'Concurrency', 'SystemDesign'],
    likesCount: 142,
    isLiked: false,
    commentsCount: 24,
    isSaved: true,
    sharesCount: 18,
    comments: [
      {
        id: 'c-1',
        authorName: 'Marcus Vance',
        authorHeadline: 'Staff SRE @ Stripe',
        content: 'Great breakdown Alex! We use a similar token bucket algorithm with Redis clusters at Stripe.',
        createdAt: '1h ago',
      },
    ],
  },

  // 2. Achievement
  {
    id: 'post-2',
    author: {
      name: 'Elena Rostova',
      headline: 'Full Stack Engineer | React & Go',
      avatarInitials: 'ER',
      company: 'Vercel',
      isVerified: true,
    },
    type: 'Achievement',
    createdAt: '4h ago',
    content:
      'Proud to share that I just crossed 150 solved problems in the CareerX DSA Sandbox and received an official 95th-percentile benchmark in Advanced Concurrency & Graph Algorithms! Consistency over intensity every single day.',
    tags: ['DSA', 'LeetCode', 'Algorithms', 'CareerGrowth'],
    likesCount: 289,
    isLiked: true,
    commentsCount: 42,
    isSaved: false,
    sharesCount: 31,
    comments: [],
  },

  // 3. Project
  {
    id: 'post-3',
    author: {
      name: 'Devin Chen',
      headline: 'Systems Engineer @ UW Lab',
      avatarInitials: 'DC',
      company: 'Univ of Washington',
      isVerified: false,
    },
    type: 'Project',
    createdAt: '6h ago',
    content:
      'Open-sourced my distributed event broker built in Go and Kafka! Implements the Transactional Outbox pattern with zero message loss guarantees and benchmarked at 12,000 msg/sec on a single c6g instance.',
    tags: ['OpenSource', 'Golang', 'Kafka', 'Architecture'],
    likesCount: 198,
    isLiked: false,
    commentsCount: 19,
    isSaved: false,
    sharesCount: 26,
    comments: [],
  },

  // 4. Certification
  {
    id: 'post-4',
    author: {
      name: 'Sophia Patel',
      headline: 'Cloud Infrastructure & DevOps Engineer',
      avatarInitials: 'SP',
      company: 'Datadog',
      isVerified: true,
    },
    type: 'Certification',
    createdAt: '1d ago',
    content:
      'Officially Certified Kubernetes Administrator (CKA)! The 2-hour hands-on terminal exam was rigorous, testing multi-cluster networking, ingress controllers, and etcd snapshot restores. Happy to share my study syllabus with anyone preparing.',
    tags: ['Kubernetes', 'CKA', 'CloudNative', 'DevOps'],
    likesCount: 345,
    isLiked: true,
    commentsCount: 56,
    isSaved: true,
    sharesCount: 45,
    comments: [],
  },

  // 5. Career Advice
  {
    id: 'post-5',
    author: {
      name: 'Sarah Lin',
      headline: 'Principal Tech Recruiter @ Stripe',
      avatarInitials: 'SL',
      company: 'Stripe',
      isVerified: true,
    },
    type: 'Career Advice',
    createdAt: '1d ago',
    content:
      'Tip for candidates applying to senior engineering roles: Replace passive duty bullets on your resume ("Worked on API services") with quantified throughput metrics ("Engineered Go gRPC microservice processing 45M+ daily requests, cutting p99 latency by 38%"). Recruiters look for business outcomes, not job descriptions.',
    tags: ['ResumeTips', 'Hiring', 'FAANG', 'CareerAdvice'],
    likesCount: 512,
    isLiked: false,
    commentsCount: 78,
    isSaved: true,
    sharesCount: 104,
    comments: [],
  },

  // 6. Job Announcement
  {
    id: 'post-6',
    author: {
      name: 'Ryan Sterling',
      headline: 'Engineering Manager @ Linear',
      avatarInitials: 'RS',
      company: 'Linear',
      isVerified: true,
    },
    type: 'Job Announcement',
    createdAt: '2d ago',
    content:
      'We are hiring a Full Stack Product Engineer (Remote, Global) at Linear! We care deeply about keyboard ergonomics, 60fps micro-interactions, and local-first SQLite/CRDT architectures. Check out our open roles on the CareerX Marketplace.',
    tags: ['Hiring', 'RemoteJobs', 'FullStack', 'Linear'],
    likesCount: 420,
    isLiked: false,
    commentsCount: 65,
    isSaved: false,
    sharesCount: 88,
    comments: [],
  },

  // 7. Learning Update
  {
    id: 'post-7',
    author: {
      name: 'Kavita Iyer',
      headline: 'Software Engineer @ Microsoft',
      avatarInitials: 'KI',
      company: 'Microsoft',
      isVerified: true,
    },
    type: 'Learning Update',
    createdAt: '2d ago',
    content:
      'Finished the "PostgreSQL Index Tuning & B-Tree Internals" course in the Learning Hub. Discovering why composite indexes require leftmost column prefixing completely changed how I structure multi-tenant tenant_id queries.',
    tags: ['PostgreSQL', 'Databases', 'SQL', 'LearningHub'],
    likesCount: 167,
    isLiked: false,
    commentsCount: 15,
    isSaved: false,
    sharesCount: 12,
    comments: [],
  },
];
