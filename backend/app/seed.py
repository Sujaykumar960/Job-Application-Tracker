import argparse
import asyncio
import logging
import sys
from typing import Any, Dict, List

from app.config import settings
from app.database import DatabaseManager
from app.utils.security import hash_password
from app.utils.helpers import utc_now_iso

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("careerx.seed")

DEFAULT_DEV_PASSWORD = "DevPassword123!"

# 1. USERS & PROFILES
SEEDED_USERS = [
    {
        "id": "usr-1",
        "name": "Alex Rivera",
        "email": "alex.rivera@devmail.io",
        "role": "seeker",
        "headline": "Full Stack & Distributed Systems Engineer",
        "bio": "Building low-latency sync engines and high-throughput microservices. Passionate about developer tooling and architecture.",
        "location": "Seattle, WA",
        "company": "CloudScale",
        "atsScore": 88,
        "avatarInitials": "AR",
        "avatarGradient": "from-brand-600 to-indigo-800",
        "skills": ["React", "TypeScript", "Node.js", "Go", "Python", "PostgreSQL", "Docker", "Tailwind CSS"],
    },
    {
        "id": "usr-recruiter-stripe",
        "name": "Sarah Lin",
        "email": "sarah.lin@stripe.com",
        "role": "recruiter",
        "headline": "Principal Technical Recruiter",
        "bio": "Hiring Staff and Principal backend infrastructure engineers for Stripe core payments and ledger teams.",
        "location": "San Francisco, CA",
        "company": "Stripe",
        "atsScore": 90,
        "avatarInitials": "SL",
        "avatarGradient": "from-amber-600 to-orange-800",
        "skills": ["Technical Sourcing", "Executive Recruiting", "System Design Calibration"],
    },
    {
        "id": "usr-recruiter-cloudscale",
        "name": "CloudScale Recruiter",
        "email": "recruiter@cloudscale.com",
        "role": "recruiter",
        "headline": "Senior Talent Partner @ CloudScale",
        "bio": "Building next-gen multi-cloud infrastructure and distributed storage teams.",
        "location": "Seattle, WA",
        "company": "CloudScale",
        "atsScore": 85,
        "avatarInitials": "CR",
        "avatarGradient": "from-slate-600 to-gray-800",
        "skills": ["SRE Recruiting", "Cloud Infrastructure"],
    },
    {
        "id": "usr-marcus",
        "name": "Marcus Vance",
        "email": "marcus.vance@stripe.com",
        "role": "seeker",
        "headline": "Staff SRE & Infrastructure Architect @ Stripe",
        "bio": "Focused on 99.999% uptime, multi-region failover, and high-throughput Kafka pipelines.",
        "location": "San Francisco, CA",
        "company": "Stripe",
        "atsScore": 94,
        "avatarInitials": "MV",
        "avatarGradient": "from-brand-600 to-indigo-800",
        "skills": ["Go", "Kafka", "Distributed Systems", "Redis Lua", "AWS"],
    },
    {
        "id": "usr-chloe",
        "name": "Chloe Nguyen",
        "email": "chloe@linear.app",
        "role": "seeker",
        "headline": "Founding Tech Lead @ Linear | Ex-Airbnb",
        "bio": "Local-first application enthusiast, CRDT sync engines, and micro-interaction polish.",
        "location": "Remote",
        "company": "Linear",
        "atsScore": 96,
        "avatarInitials": "CN",
        "avatarGradient": "from-emerald-600 to-teal-800",
        "skills": ["TypeScript", "React", "Local-First", "CRDTs", "GraphQL"],
    },
    {
        "id": "usr-arjun",
        "name": "Arjun Mehta",
        "email": "arjun.mehta@example.com",
        "role": "seeker",
        "headline": "Senior Database Engineer @ Cockroach Labs",
        "bio": "Database kernel contributor, Raft consensus specialist, and distributed SQL engine builder.",
        "location": "New York, NY",
        "company": "Cockroach Labs",
        "atsScore": 93,
        "avatarInitials": "AM",
        "avatarGradient": "from-purple-600 to-indigo-900",
        "skills": ["Raft", "Go", "Distributed SQL", "Consensus", "Kubernetes"],
    },
    {
        "id": "usr-elena",
        "name": "Elena Rostova",
        "email": "elena.rostova@example.com",
        "role": "seeker",
        "headline": "Senior Full Stack Engineer (React, TypeScript & Go)",
        "bio": "Ex-CloudScale intern, published open source rust bundler, passionate about developer ergonomics.",
        "location": "Seattle, WA",
        "company": "Freelance",
        "atsScore": 91,
        "avatarInitials": "ER",
        "avatarGradient": "from-rose-600 to-pink-800",
        "skills": ["React", "TypeScript", "Next.js", "Go", "WebSockets", "GraphQL"],
    },
    {
        "id": "usr-devin",
        "name": "Devin Chen",
        "email": "devin.chen@uw.edu",
        "role": "seeker",
        "headline": "Systems & Infrastructure Software Engineer",
        "bio": "UW Distributed Systems Lab researcher. Raft consensus benchmark author.",
        "location": "Seattle, WA",
        "company": "UW Lab",
        "atsScore": 84,
        "avatarInitials": "DC",
        "avatarGradient": "from-cyan-600 to-blue-800",
        "skills": ["C++", "Go", "Raft", "PostgreSQL", "Operating Systems", "Linux"],
    },
    {
        "id": "usr-admin",
        "name": "CareerX Admin",
        "email": "admin@careerx.io",
        "role": "admin",
        "headline": "Platform Operations & Compliance",
        "bio": "CareerX administrative and compliance auditor account.",
        "location": "San Francisco, CA",
        "company": "CareerX",
        "atsScore": 99,
        "avatarInitials": "AD",
        "avatarGradient": "from-blue-700 to-slate-900",
        "skills": ["System Administration", "Data Governance"],
    },
]

# 2. JOBS
SEEDED_JOBS = [
    {
        "id": "job-1",
        "title": "Software Engineer Intern",
        "company": "Google",
        "companyName": "Google",
        "location": "Bangalore",
        "salary": "₹1,20,000 / month",
        "salaryRange": "₹1,20,000 / month",
        "workType": "Hybrid",
        "jobType": "Internship",
        "experienceLevel": "Intern",
        "roleCategory": "Backend",
        "postedDate": "2026-09-01",
        "matchScore": 91,
        "skills": ["Python", "SQL", "DSA"],
        "description": "Join Google's core platform team to build scalable services powering billions of searches.",
        "isActive": True,
    },
    {
        "id": "job-2",
        "title": "Backend Software Engineer - Infrastructure",
        "company": "Stripe",
        "companyName": "Stripe",
        "location": "San Francisco, CA (Hybrid)",
        "salary": "$175,000 - $210,000",
        "salaryRange": "$175,000 - $210,000",
        "workType": "Hybrid",
        "jobType": "Full-time",
        "experienceLevel": "Mid Level",
        "roleCategory": "Backend",
        "postedDate": "2026-08-20",
        "matchScore": 94,
        "skills": ["Go", "Kafka", "Distributed Systems", "Kubernetes"],
        "description": "Design sliding window rate limiters and multi-region ledger pipelines for global payment traffic.",
        "isActive": True,
    },
    {
        "id": "job-3",
        "title": "Product Engineer - Realtime Sync",
        "company": "Linear",
        "companyName": "Linear",
        "location": "Remote",
        "salary": "$170,000 - $195,000",
        "salaryRange": "$170,000 - $195,000",
        "workType": "Remote",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Full Stack",
        "postedDate": "2026-08-15",
        "matchScore": 96,
        "skills": ["TypeScript", "React", "CRDTs", "GraphQL"],
        "description": "Build local-first synchronization and real-time collaborative issue tracking engines.",
        "isActive": True,
    },
    {
        "id": "job-4",
        "title": "Backend Platform Engineer",
        "company": "Datadog",
        "companyName": "Datadog",
        "location": "New York, NY (Remote)",
        "salary": "$165,000 - $190,000",
        "salaryRange": "$165,000 - $190,000",
        "workType": "Remote",
        "jobType": "Full-time",
        "experienceLevel": "Mid Level",
        "roleCategory": "Backend",
        "postedDate": "2026-08-22",
        "matchScore": 91,
        "skills": ["Python", "PostgreSQL", "Kafka", "Redis"],
        "description": "Scale time-series ingestion and metrics aggregation pipelines for enterprise cloud observability.",
        "isActive": True,
    },
    {
        "id": "job-5",
        "title": "Frontend Infrastructure Engineer",
        "company": "Vercel",
        "companyName": "Vercel",
        "location": "Remote",
        "salary": "$160,000 - $195,000",
        "salaryRange": "$160,000 - $195,000",
        "workType": "Remote",
        "jobType": "Full-time",
        "experienceLevel": "Mid Level",
        "roleCategory": "Frontend",
        "postedDate": "2026-08-25",
        "matchScore": 95,
        "skills": ["Next.js", "Turborepo", "TypeScript"],
        "description": "Build edge compilation and framework tooling for the Next.js runtime ecosystem.",
        "isActive": True,
    },
    {
        "id": "job-6",
        "title": "Cloud Runtime Engineer",
        "company": "Netflix",
        "companyName": "Netflix",
        "location": "Los Gatos, CA",
        "salary": "$220,000",
        "salaryRange": "$220,000",
        "workType": "On-site",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Backend",
        "postedDate": "2026-07-15",
        "matchScore": 84,
        "skills": ["Java", "AWS", "Titus", "Containers"],
        "description": "Develop high-throughput container scheduling and workload execution runtimes at global scale.",
        "isActive": True,
    },
    {
        "id": "job-7",
        "title": "Systems & Performance Engineer",
        "company": "Figma",
        "companyName": "Figma",
        "location": "San Francisco, CA (Hybrid)",
        "salary": "$180,000 - $215,000",
        "salaryRange": "$180,000 - $215,000",
        "workType": "Hybrid",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Systems",
        "postedDate": "2026-07-20",
        "matchScore": 89,
        "skills": ["WebAssembly", "C++", "Rust", "Graphics"],
        "description": "Optimize multi-player canvas rendering, WebAssembly memory pipelines, and document synchronization.",
        "isActive": True,
    },
    {
        "id": "job-8",
        "title": "Search & Relevance Software Engineer",
        "company": "Airbnb",
        "companyName": "Airbnb",
        "location": "San Francisco, CA",
        "salary": "$175,000 - $205,000",
        "salaryRange": "$175,000 - $205,000",
        "workType": "Hybrid",
        "jobType": "Full-time",
        "experienceLevel": "Mid Level",
        "roleCategory": "Search",
        "postedDate": "2026-08-10",
        "matchScore": 93,
        "skills": ["Java", "Elasticsearch", "Distributed Systems"],
        "description": "Drive personalized ranking algorithms and real-time availability filters across global listing indexes.",
        "isActive": True,
    },
]

# 3. APPLICATIONS FOR usr-1 (Alex Rivera)
SEEDED_APPLICATIONS = [
    {
        "id": "app-1",
        "userId": "usr-1",
        "company": "Stripe",
        "companyName": "Stripe",
        "role": "Software Engineer - Infrastructure",
        "roleTitle": "Software Engineer - Infrastructure",
        "location": "San Francisco, CA (Hybrid)",
        "jobUrl": "https://stripe.com/jobs/infrastructure-eng",
        "appliedDate": "2026-08-14",
        "deadline": "2026-09-08",
        "deadlineDate": "2026-09-08",
        "interviewDate": "2026-09-04 10:00",
        "recruiter": "Sarah Lin (sarah.lin@stripe.com)",
        "status": "Interview",
        "priority": "High",
        "notes": "Sliding window rate limiter & Kafka partitioning discussion scheduled with Staff Engineer.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$175,000 - $210,000",
        "matchScore": 94,
        "tags": ["Go", "Distributed Systems", "Kubernetes"],
    },
    {
        "id": "app-2",
        "userId": "usr-1",
        "company": "Linear",
        "companyName": "Linear",
        "role": "Product Engineer - Realtime Sync",
        "roleTitle": "Product Engineer - Realtime Sync",
        "location": "Remote",
        "jobUrl": "https://linear.app/careers/sync-engineer",
        "appliedDate": "2026-08-02",
        "deadline": "2026-09-12",
        "deadlineDate": "2026-09-12",
        "interviewDate": "2026-09-07 14:00",
        "recruiter": "Jonas Frank (jonas@linear.app)",
        "status": "Offer",
        "priority": "High",
        "notes": "Formal offer received. Base $180k + $75k equity. Comp review deadline in 10 days.",
        "resume": "Alex_Rivera_FullStack_v2.pdf",
        "salaryRange": "$170,000 - $195,000",
        "matchScore": 96,
        "tags": ["TypeScript", "React", "CRDTs"],
    },
    {
        "id": "app-3",
        "userId": "usr-1",
        "company": "Datadog",
        "companyName": "Datadog",
        "role": "Backend Platform Engineer",
        "roleTitle": "Backend Platform Engineer",
        "location": "New York, NY (Remote)",
        "jobUrl": "https://datadoghq.com/careers/backend-platform",
        "appliedDate": "2026-08-25",
        "deadline": "2026-09-02",
        "deadlineDate": "2026-09-02",
        "interviewDate": "2026-09-05 11:30",
        "recruiter": "Elena Vane (elena.v@datadoghq.com)",
        "status": "Interview",
        "priority": "High",
        "notes": "Take-home assessment review due today. High emphasis on Redis cache stampede handling.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$165,000 - $190,000",
        "matchScore": 91,
        "tags": ["Python", "PostgreSQL", "Kafka"],
    },
    {
        "id": "app-4",
        "userId": "usr-1",
        "company": "Vercel",
        "companyName": "Vercel",
        "role": "Frontend Infrastructure Engineer",
        "roleTitle": "Frontend Infrastructure Engineer",
        "location": "Remote",
        "jobUrl": "https://vercel.com/careers/infra",
        "appliedDate": "2026-08-28",
        "deadline": "2026-08-30",
        "deadlineDate": "2026-08-30",
        "recruiter": "Marcus Vance (recruiting@vercel.com)",
        "status": "Applied",
        "priority": "Medium",
        "notes": "Submitted with internal referral from Staff DX Engineer. Application under review.",
        "resume": "Alex_Rivera_FrontendPlatform.pdf",
        "salaryRange": "$160,000 - $195,000",
        "matchScore": 95,
        "tags": ["Next.js", "Turborepo", "TypeScript"],
    },
    {
        "id": "app-5",
        "userId": "usr-1",
        "company": "Figma",
        "companyName": "Figma",
        "role": "Systems & Performance Engineer",
        "roleTitle": "Systems & Performance Engineer",
        "location": "San Francisco, CA (Hybrid)",
        "jobUrl": "https://figma.com/careers/systems",
        "appliedDate": "2026-07-20",
        "deadline": "2026-08-15",
        "deadlineDate": "2026-08-15",
        "recruiter": "Tori Adams",
        "status": "Rejected",
        "priority": "Medium",
        "notes": "Reached final round. Position filled internally by team lead. Welcomed to reapply in 6 months.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$180,000 - $215,000",
        "matchScore": 89,
        "tags": ["WebAssembly", "C++", "Rust"],
    },
    {
        "id": "app-6",
        "userId": "usr-1",
        "company": "Shopify",
        "companyName": "Shopify",
        "role": "Core Rails & Distributed Systems Engineer",
        "roleTitle": "Core Rails & Distributed Systems Engineer",
        "location": "Remote",
        "jobUrl": "https://shopify.com/careers/rails-infra",
        "appliedDate": "2026-08-30",
        "deadline": "2026-09-15",
        "deadlineDate": "2026-09-15",
        "recruiter": "David Tremblay",
        "status": "Applied",
        "priority": "Medium",
        "notes": "Recruiter screen scheduled for next week.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$155,000 - $185,000",
        "matchScore": 88,
        "tags": ["Ruby", "MySQL", "Kafka"],
    },
    {
        "id": "app-7",
        "userId": "usr-1",
        "company": "Airbnb",
        "companyName": "Airbnb",
        "role": "Search & Relevance Software Engineer",
        "roleTitle": "Search & Relevance Software Engineer",
        "location": "San Francisco, CA",
        "jobUrl": "https://airbnb.com/careers/search-eng",
        "appliedDate": "2026-08-10",
        "deadline": "2026-09-18",
        "deadlineDate": "2026-09-18",
        "recruiter": "Chloe Nguyen",
        "status": "Offer",
        "priority": "High",
        "notes": "Offer package received: $185k base + $85k RSU annual vesting. Signing bonus $20k.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$175,000 - $205,000",
        "matchScore": 93,
        "tags": ["Java", "Elasticsearch", "Distributed Systems"],
    },
    {
        "id": "app-8",
        "userId": "usr-1",
        "company": "Netflix",
        "companyName": "Netflix",
        "role": "Cloud Runtime Engineer",
        "roleTitle": "Cloud Runtime Engineer",
        "location": "Los Gatos, CA",
        "jobUrl": "https://jobs.netflix.com/jobs/cloud-runtime",
        "appliedDate": "2026-07-15",
        "deadline": "2026-08-01",
        "deadlineDate": "2026-08-01",
        "recruiter": "Ryan Sterling",
        "status": "Rejected",
        "priority": "Low",
        "notes": "Role canceled due to team reorganization.",
        "resume": "Alex_Rivera_Distributed_Systems.pdf",
        "salaryRange": "$220,000",
        "matchScore": 84,
        "tags": ["Java", "AWS", "Titus"],
    },
]

# 4. CONVERSATIONS & MESSAGES
SEEDED_CONVERSATIONS = [
    {
        "id": "conv-1",
        "participants": ["usr-1", "usr-recruiter-stripe"],
        "lastMessage": "The panel was very impressed with your distributed rate limiter design! Here is the briefing packet for next week’s final onsite loop.",
        "lastMessageTime": "2026-09-02T10:42:00Z",
        "unreadCounts": {"usr-1": 2, "usr-recruiter-stripe": 0},
    },
    {
        "id": "conv-2",
        "participants": ["usr-1", "usr-marcus"],
        "lastMessage": "Looking forward to catching up on Friday!",
        "lastMessageTime": "2026-09-02T09:15:00Z",
        "unreadCounts": {"usr-1": 0, "usr-marcus": 0},
    },
]

SEEDED_MESSAGES = [
    {
        "id": "m-1",
        "conversationId": "conv-1",
        "senderId": "usr-recruiter-stripe",
        "senderName": "Sarah Lin",
        "recipientId": "usr-1",
        "content": "Hi Alex! Thanks for speaking with our Engineering Director yesterday.",
        "timestamp": "2026-09-02T10:30:00Z",
        "status": "read",
    },
    {
        "id": "m-2",
        "conversationId": "conv-1",
        "senderId": "usr-1",
        "senderName": "Alex Rivera",
        "recipientId": "usr-recruiter-stripe",
        "content": "Hi Sarah! It was an insightful discussion on global payment latency and idempotency keys.",
        "timestamp": "2026-09-02T10:35:00Z",
        "status": "read",
    },
    {
        "id": "m-3",
        "conversationId": "conv-1",
        "senderId": "usr-recruiter-stripe",
        "senderName": "Sarah Lin",
        "recipientId": "usr-1",
        "content": "The panel was very impressed with your distributed rate limiter design! Here is the briefing packet for next week’s final onsite loop.",
        "timestamp": "2026-09-02T10:42:00Z",
        "status": "delivered",
        "attachment": {
            "id": "att-1",
            "name": "Stripe_Systems_Onsite_Briefing.pdf",
            "size": "1.8 MB",
            "type": "pdf",
        },
    },
    {
        "id": "m-4",
        "conversationId": "conv-2",
        "senderId": "usr-marcus",
        "senderName": "Marcus Vance",
        "recipientId": "usr-1",
        "content": "Hey Alex! Loved your post on sliding-window rate limiters with Redis Lua. Would love to connect!",
        "timestamp": "2026-09-02T09:00:00Z",
        "status": "read",
    },
    {
        "id": "m-5",
        "conversationId": "conv-2",
        "senderId": "usr-1",
        "senderName": "Alex Rivera",
        "recipientId": "usr-marcus",
        "content": "Thanks Marcus! Looking forward to catching up on Friday!",
        "timestamp": "2026-09-02T09:15:00Z",
        "status": "read",
    },
]

# 5. NETWORK CONNECTIONS & REQUESTS
SEEDED_CONNECTIONS = [
    {
        "id": "conn-1",
        "requesterId": "usr-1",
        "receiverId": "usr-elena",
        "status": "Connected",
        "connectedDate": "2026-08-15T10:00:00Z",
        "requestDate": "2026-08-14T09:00:00Z",
    },
    {
        "id": "conn-2",
        "requesterId": "usr-1",
        "receiverId": "usr-devin",
        "status": "Connected",
        "connectedDate": "2026-08-20T14:00:00Z",
        "requestDate": "2026-08-19T11:00:00Z",
    },
]

SEEDED_CONNECTION_REQUESTS = [
    {
        "id": "req-1",
        "senderId": "usr-marcus",
        "recipientId": "usr-1",
        "status": "Pending",
        "requestDate": "2026-09-03T08:00:00Z",
        "note": "Hey Alex, loved your post on sliding-window rate limiters with Redis Lua. Would love to connect!",
    },
    {
        "id": "req-2",
        "senderId": "usr-chloe",
        "recipientId": "usr-1",
        "status": "Pending",
        "requestDate": "2026-09-02T16:00:00Z",
        "note": "Hi Alex! Saw your linear-clone GitHub project. Very impressed with the micro-interaction responsiveness.",
    },
    {
        "id": "req-3",
        "senderId": "usr-arjun",
        "recipientId": "usr-1",
        "status": "Pending",
        "requestDate": "2026-09-01T12:00:00Z",
        "note": "Let's connect and discuss distributed consensus and LSM-trees.",
    },
]

# 6. FEED POSTS
SEEDED_POSTS = [
    {
        "id": "post-1",
        "author": {
            "id": "usr-1",
            "name": "Alex Rivera",
            "headline": "Distributed Systems & Backend Engineer",
            "avatarInitials": "AR",
            "company": "CloudScale",
            "isVerified": True,
        },
        "type": "Technical Discussion",
        "createdAt": "2026-09-03T08:00:00Z",
        "content": "When designing distributed rate limiters for 50k+ requests/sec, fixed-window counters allow 2x traffic bursts at boundary borders. Sliding window logs with atomic Redis Lua scripts solve this cleanly with O(1) memory overhead when you trim timestamps.",
        "codeSnippet": "// Atomic sliding-window evaluation in Redis Lua\nlocal key = KEYS[1]\nlocal now = tonumber(ARGV[1])\nlocal window = tonumber(ARGV[2])\nlocal limit = tonumber(ARGV[3])\nredis.call('ZREMRANGEBYSCORE', key, 0, now - window)\nlocal current = redis.call('ZCARD', key)\nif current < limit then\n  redis.call('ZADD', key, now, now)\n  return 1\nend\nreturn 0",
        "tags": ["Go", "Redis", "Distributed Systems", "Backend"],
        "likesCount": 42,
        "isLiked": False,
        "commentsCount": 2,
        "isSaved": False,
        "sharesCount": 8,
        "comments": [
            {
                "id": "comm-1",
                "authorId": "usr-marcus",
                "authorName": "Marcus Vance",
                "authorHeadline": "Staff SRE @ Stripe",
                "content": "Spot on. We run a variant of this using Redis cluster with local hash slots to distribute the evaluation across nodes.",
                "createdAt": "2026-09-03T08:30:00Z",
            },
            {
                "id": "comm-2",
                "authorId": "usr-arjun",
                "authorName": "Arjun Mehta",
                "authorHeadline": "Database Engineer @ Cockroach Labs",
                "content": "Great write-up Alex. How are you handling Redis connection failover in multi-region setups?",
                "createdAt": "2026-09-03T09:00:00Z",
            },
        ],
    },
    {
        "id": "post-2",
        "author": {
            "id": "usr-elena",
            "name": "Elena Rostova",
            "headline": "Senior Full Stack Engineer",
            "avatarInitials": "ER",
            "company": "Freelance",
            "isVerified": True,
        },
        "type": "Project",
        "createdAt": "2026-09-02T14:00:00Z",
        "content": "Just shipped an open-source Rust bundler optimized for monorepos! Achieved 10x faster build times compared to Webpack for our TypeScript components.",
        "tags": ["Rust", "TypeScript", "OpenSource", "WebDev"],
        "likesCount": 89,
        "isLiked": False,
        "commentsCount": 1,
        "isSaved": True,
        "sharesCount": 15,
        "comments": [
            {
                "id": "comm-3",
                "authorId": "usr-1",
                "authorName": "Alex Rivera",
                "authorHeadline": "Distributed Systems & Backend Engineer",
                "content": "Impressive benchmarks Elena! Will definitely test this in our next CI pipeline.",
                "createdAt": "2026-09-02T15:00:00Z",
            }
        ],
    },
]

# 7. NOTIFICATIONS
SEEDED_NOTIFICATIONS = [
    {
        "id": "notif-1",
        "userId": "usr-1",
        "category": "interview_reminder",
        "title": "Upcoming Stripe Onsite: System Architecture",
        "description": "Your 4-round technical onsite loop with Stripe begins on Tuesday, Sep 8 at 9:00 AM PST. The briefing dossier has been attached to your messenger.",
        "timestamp": "20m ago",
        "createdAt": "2026-09-02T23:50:00Z",
        "isRead": False,
        "priority": "urgent",
        "company": "Stripe",
        "actionLabel": "Review Briefing",
        "actionUrl": "/messages",
    },
    {
        "id": "notif-2",
        "userId": "usr-1",
        "category": "application_deadline",
        "title": "Deadline Alert: Linear Product Engineering Role",
        "description": "Applications for the Full Stack Product Engineer role at Linear close in 48 hours. Your ATS resume match score is currently 92%.",
        "timestamp": "1h ago",
        "createdAt": "2026-09-02T22:30:00Z",
        "isRead": False,
        "priority": "urgent",
        "company": "Linear",
        "actionLabel": "Apply Now",
        "actionUrl": "/companies",
    },
    {
        "id": "notif-3",
        "userId": "usr-1",
        "category": "follow_up",
        "title": "Follow-Up Recommended: Sarah Lin (Stripe)",
        "description": "It has been 2 business days since your systems architecture debrief with Stripe. A thank-you note is recommended.",
        "timestamp": "3h ago",
        "createdAt": "2026-09-02T20:15:00Z",
        "isRead": False,
        "priority": "normal",
        "company": "Stripe",
        "actionLabel": "Open Chat",
        "actionUrl": "/messages",
    },
    {
        "id": "notif-4",
        "userId": "usr-1",
        "category": "message",
        "title": "New Message from Sarah Lin (Stripe Recruiter)",
        "description": "The panel was very impressed with your distributed rate limiter design! Here is the briefing packet...",
        "timestamp": "5h ago",
        "createdAt": "2026-09-02T18:42:00Z",
        "isRead": False,
        "priority": "urgent",
        "company": "Stripe",
        "actionLabel": "Reply",
        "actionUrl": "/messages",
    },
    {
        "id": "notif-5",
        "userId": "usr-1",
        "category": "connection_request",
        "title": "New Connection Request: Marcus Vance",
        "description": "Marcus Vance (Staff SRE & Infrastructure Architect @ Stripe) sent you a connection request.",
        "timestamp": "8h ago",
        "createdAt": "2026-09-02T15:00:00Z",
        "isRead": True,
        "priority": "normal",
        "company": "Stripe",
        "actionLabel": "View Request",
        "actionUrl": "/network",
    },
    {
        "id": "notif-6",
        "userId": "usr-1",
        "category": "job_recommendation",
        "title": "96% Job Match: Distributed Systems Engineer @ Linear",
        "description": "Based on your verified skills in Go, Distributed Systems, and CRDTs, Linear has a newly opened role.",
        "timestamp": "1d ago",
        "createdAt": "2026-09-01T12:00:00Z",
        "isRead": True,
        "priority": "low",
        "company": "Linear",
        "actionLabel": "View Job",
        "actionUrl": "/jobs",
    },
    {
        "id": "notif-7",
        "userId": "usr-1",
        "category": "learning_achievement",
        "title": "14-Day Coding Streak Achieved! 🔥",
        "description": "You solved 142 total algorithm & system design problems. Current ATS resume score elevated to 88%.",
        "timestamp": "2d ago",
        "createdAt": "2026-08-31T10:00:00Z",
        "isRead": True,
        "priority": "low",
        "actionLabel": "View Progress",
        "actionUrl": "/progress",
    },
]

# 8. RECRUITER CANDIDATES
SEEDED_CANDIDATES = [
    {
        "id": "cand-1",
        "userId": "usr-1",
        "name": "Alex Rivera",
        "role": "Distributed Systems & Backend Platform Engineer",
        "location": "Seattle, WA (Open to Remote & Hybrid)",
        "experienceLevel": "Mid Level",
        "yearsExperience": "2.5 yrs (Ex-CloudScale Intern)",
        "skills": ["Go", "Kafka", "PostgreSQL", "Redis Lua", "Docker", "Kubernetes"],
        "questionsSolved": 142,
        "totalQuestions": 150,
        "accuracy": 93.4,
        "streak": 14,
        "projectsCount": 4,
        "featuredProjects": ["Distributed Event Streaming Broker", "Sliding Window Rate Limiter Service"],
        "assessmentName": "Senior Backend & Concurrency Systems Exam",
        "assessmentScore": 94,
        "assessmentPercentile": "Top 6%",
        "jobMatch": 94,
        "targetRole": "Backend Software Engineer, Core Payments",
        "careerGrowthMetric": "+42% growth across 6 months • 14d streak",
        "atsScore": 88,
        "avatarInitials": "AR",
        "avatarGradient": "from-brand-600 to-indigo-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$165,000 - $195,000",
            "contactVisibility": "all_recruiters",
            "email": "alex.rivera@devmail.io",
            "phone": "+1 (206) 555-0194",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "CloudScale",
        },
    },
    {
        "id": "cand-2",
        "userId": "usr-elena",
        "name": "Elena Rostova",
        "role": "Full Stack Engineer (React, TypeScript & Go)",
        "location": "Seattle, WA (Remote)",
        "experienceLevel": "Senior",
        "yearsExperience": "5 yrs",
        "skills": ["React", "TypeScript", "Next.js", "Go", "WebSockets", "GraphQL"],
        "questionsSolved": 158,
        "totalQuestions": 160,
        "accuracy": 94.8,
        "streak": 22,
        "projectsCount": 5,
        "featuredProjects": ["Turbopack Monorepo Analyzer", "CRDT Collaborative Editor"],
        "assessmentName": "Frontend Architecture & Systems Assessment",
        "assessmentScore": 95,
        "assessmentPercentile": "Top 4%",
        "jobMatch": 92,
        "targetRole": "Full Stack Product Engineer, Sync Engine",
        "careerGrowthMetric": "158 solved • Published open-source Rust bundler",
        "atsScore": 91,
        "avatarInitials": "ER",
        "avatarGradient": "from-rose-600 to-pink-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$180,000 - $215,000",
            "contactVisibility": "all_recruiters",
            "email": "elena.rostova@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-3",
        "userId": "usr-devin",
        "name": "Devin Chen",
        "role": "Systems & Infrastructure Software Engineer",
        "location": "Seattle, WA",
        "experienceLevel": "Entry / Intern",
        "yearsExperience": "New Grad (UW Distributed Systems Lab)",
        "skills": ["C++", "Go", "Raft", "PostgreSQL", "Operating Systems", "Linux"],
        "questionsSolved": 110,
        "totalQuestions": 130,
        "accuracy": 89.2,
        "streak": 8,
        "projectsCount": 3,
        "featuredProjects": ["Raft Consensus Engine", "Multi-Master Postgres Benchmarker"],
        "assessmentName": "Systems Architecture & Algorithms",
        "assessmentScore": 88,
        "assessmentPercentile": "Top 12%",
        "jobMatch": 86,
        "targetRole": "Systems Software Engineer",
        "careerGrowthMetric": "UW CS Magna Cum Laude • 110 solved",
        "atsScore": 84,
        "avatarInitials": "DC",
        "avatarGradient": "from-cyan-600 to-blue-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": False,
            "salaryExpectation": "$130,000 - $155,000",
            "contactVisibility": "mutual_matches",
            "email": "devin.chen@uw.edu",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-4",
        "name": "Sophia Patel",
        "role": "Cloud Platform & Kubernetes SRE Specialist",
        "location": "Los Gatos, CA (Remote)",
        "experienceLevel": "Senior",
        "yearsExperience": "6 yrs",
        "skills": ["Kubernetes (CKA)", "AWS", "Terraform", "Go", "eBPF", "Service Mesh"],
        "questionsSolved": 125,
        "totalQuestions": 140,
        "accuracy": 91.0,
        "streak": 11,
        "projectsCount": 4,
        "featuredProjects": ["Multi-Cluster Ingress Mesh", "Automated DR Snapshot Restorer"],
        "assessmentName": "Cloud Native Infrastructure Benchmark",
        "assessmentScore": 96,
        "assessmentPercentile": "Top 2%",
        "jobMatch": 89,
        "targetRole": "Infrastructure & SRE Platform Engineer",
        "careerGrowthMetric": "Certified Kubernetes Administrator (CKA)",
        "atsScore": 89,
        "avatarInitials": "SP",
        "avatarGradient": "from-indigo-600 to-brand-800",
        "privacy": {
            "searchStatus": "casually_browsing",
            "showSalary": True,
            "salaryExpectation": "$195,000 - $235,000",
            "contactVisibility": "hidden",
            "email": "sophia.patel@example.com",
            "phone": "+1 (408) 555-0129",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "Netflix",
        },
    },
    {
        "id": "cand-5",
        "userId": "usr-arjun",
        "name": "Arjun Mehta",
        "role": "Database Kernel & Storage Systems Engineer",
        "location": "New York, NY (Hybrid)",
        "experienceLevel": "Lead",
        "yearsExperience": "8 yrs",
        "skills": ["Go", "Raft", "Distributed SQL", "PostgreSQL Internals", "C++"],
        "questionsSolved": 195,
        "totalQuestions": 200,
        "accuracy": 96.2,
        "streak": 30,
        "projectsCount": 6,
        "featuredProjects": ["LSM-Tree Key-Value Engine", "Paxos Consensus Sharding"],
        "assessmentName": "Distributed Database Systems Exam",
        "assessmentScore": 98,
        "assessmentPercentile": "Top 1%",
        "jobMatch": 95,
        "targetRole": "Principal Database Architect",
        "careerGrowthMetric": "195 solved • Storage engine maintainer",
        "atsScore": 93,
        "avatarInitials": "AM",
        "avatarGradient": "from-purple-600 to-indigo-900",
        "privacy": {
            "searchStatus": "casually_browsing",
            "showSalary": True,
            "salaryExpectation": "$220,000 - $260,000",
            "contactVisibility": "all_recruiters",
            "email": "arjun.mehta@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-6",
        "name": "Liam O'Connor",
        "role": "Backend Platform & High Availability Engineer",
        "location": "Bellevue, WA",
        "experienceLevel": "Mid Level",
        "yearsExperience": "4 yrs",
        "skills": ["Go", "Ruby", "MySQL", "High Availability", "Kafka", "Redis"],
        "questionsSolved": 134,
        "totalQuestions": 150,
        "accuracy": 90.5,
        "streak": 6,
        "projectsCount": 3,
        "featuredProjects": ["Zero-Downtime Migration Runner", "Distributed Shard Rebalancer"],
        "assessmentName": "Relational Scaling & Sharding Exam",
        "assessmentScore": 89,
        "assessmentPercentile": "Top 10%",
        "jobMatch": 85,
        "targetRole": "Backend Software Engineer, Core Payments",
        "careerGrowthMetric": "134 solved • +35% ATS Score growth",
        "atsScore": 86,
        "avatarInitials": "LO",
        "avatarGradient": "from-slate-700 to-surface-950",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": False,
            "salaryExpectation": "$160,000 - $185,000",
            "contactVisibility": "mutual_matches",
            "email": "liam.oc@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
]

# 9. RECRUITER INTERACTIONS
SEEDED_RECRUITER_INTERACTIONS = [
    {
        "recruiterId": "usr-recruiter-stripe",
        "candidateId": "cand-1",
        "isShortlisted": True,
        "interviewStage": "Technical Onsite",
        "notes": "Excellent performance on distributed rate limiter. Proceed to final loop.",
    },
    {
        "recruiterId": "usr-recruiter-stripe",
        "candidateId": "cand-2",
        "isShortlisted": True,
        "interviewStage": "Offer Sent",
        "notes": "Offer package extended for Full Stack Platform role.",
    },
]

# 10. PROGRESS RECORD FOR usr-1
SEEDED_PROGRESS = {
    "userId": "usr-1",
    "questionsSolved": 142,
    "totalQuestions": 150,
    "accuracy": 93.4,
    "streakDays": 14,
    "codingStreakDays": 14,
    "currentAtsScore": 88,
    "projectsCompleted": 4,
    "certificationsCount": 3,
    "activityHistory": {
        "daily": [
            {"period": "Mon", "studyHours": 3.5, "questionsSolved": 6, "streakDays": 10},
            {"period": "Tue", "studyHours": 4.0, "questionsSolved": 8, "streakDays": 11},
            {"period": "Wed", "studyHours": 2.5, "questionsSolved": 4, "streakDays": 12},
            {"period": "Thu", "studyHours": 5.0, "questionsSolved": 10, "streakDays": 13},
            {"period": "Fri", "studyHours": 4.5, "questionsSolved": 9, "streakDays": 14},
            {"period": "Sat", "studyHours": 6.0, "questionsSolved": 12, "streakDays": 15},
            {"period": "Sun", "studyHours": 3.0, "questionsSolved": 5, "streakDays": 16},
        ],
        "weekly": [
            {"period": "W1 (Jul 25)", "studyHours": 14.5, "questionsSolved": 18, "streakDays": 7},
            {"period": "W2 (Aug 01)", "studyHours": 16.0, "questionsSolved": 22, "streakDays": 14},
            {"period": "W3 (Aug 08)", "studyHours": 18.5, "questionsSolved": 26, "streakDays": 21},
            {"period": "W4 (Aug 15)", "studyHours": 17.0, "questionsSolved": 24, "streakDays": 28},
            {"period": "W5 (Aug 22)", "studyHours": 21.0, "questionsSolved": 31, "streakDays": 35},
            {"period": "W6 (Aug 29)", "studyHours": 23.5, "questionsSolved": 34, "streakDays": 42},
        ],
        "monthly": [
            {"period": "Apr", "studyHours": 38.0, "questionsSolved": 45, "streakDays": 15},
            {"period": "May", "studyHours": 46.0, "questionsSolved": 62, "streakDays": 22},
            {"period": "Jun", "studyHours": 54.0, "questionsSolved": 78, "streakDays": 30},
            {"period": "Jul", "studyHours": 62.0, "questionsSolved": 95, "streakDays": 31},
            {"period": "Aug", "studyHours": 78.0, "questionsSolved": 122, "streakDays": 31},
            {"period": "Sep", "studyHours": 85.0, "questionsSolved": 142, "streakDays": 14},
        ],
    },
    "skillTrajectories": [
        {"name": "Go Concurrency & Channels", "initialScore": 40, "currentScore": 92, "growthPercentage": 130},
        {"name": "Distributed Systems & Consensus", "initialScore": 30, "currentScore": 88, "growthPercentage": 193},
        {"name": "Database Indexing & PostgreSQL", "initialScore": 55, "currentScore": 90, "growthPercentage": 63},
        {"name": "Data Structures & Algorithms", "initialScore": 60, "currentScore": 92, "growthPercentage": 53},
    ],
}

# 11. CALENDAR EVENTS FOR usr-1
SEEDED_CALENDAR_EVENTS = [
    {
        "id": "evt-1",
        "userId": "usr-1",
        "title": "Follow-up with Sarah Lin on Onsite Packet",
        "type": "Follow-up",
        "date": "2026-09-03",
        "time": "09:30 AM",
        "endTime": "10:00 AM",
        "company": "Stripe",
        "locationOrUrl": "Email / Platform Message",
        "notes": "Confirm briefing schedule for next week and ask about distributed rate limiter deep-dive.",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-2",
        "userId": "usr-1",
        "title": "Linear Product Engineering Screen",
        "type": "Interview",
        "date": "2026-09-04",
        "time": "02:00 PM",
        "endTime": "03:00 PM",
        "company": "Linear",
        "locationOrUrl": "https://meet.google.com/lin-tech-9204",
        "notes": "Technical discussion with Chloe Nguyen on local-first CRDT synchronization and SQLite WebAssembly.",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-3",
        "userId": "usr-1",
        "title": "Senior Backend Concurrency Assessment Cutoff",
        "type": "Assessment",
        "date": "2026-09-06",
        "time": "06:00 PM",
        "endTime": "08:00 PM",
        "company": "CareerX Certification",
        "locationOrUrl": "https://careerx.io/learning/code",
        "notes": "Proctored coding exam testing Goroutines, channel backpressure, and atomic Redis Lua locks.",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-4",
        "userId": "usr-1",
        "title": "Stripe Final Technical Onsite Loop (4 Rounds)",
        "type": "Interview",
        "date": "2026-09-08",
        "time": "09:00 AM",
        "endTime": "02:00 PM",
        "company": "Stripe",
        "locationOrUrl": "https://stripe.zoom.us/j/8492048192",
        "notes": "4 rounds: Distributed Systems Architecture, Live Go Coding, Database Concurrency, and Engineering Values.",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-5",
        "userId": "usr-1",
        "title": "Follow-up on Linear Technical Screen Debrief",
        "type": "Follow-up",
        "date": "2026-09-10",
        "time": "01:00 PM",
        "endTime": "01:30 PM",
        "company": "Linear",
        "locationOrUrl": "Platform Messages",
        "notes": "Review feedback from technical screen with Ryan Sterling.",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-6",
        "userId": "usr-1",
        "title": "Datadog Offer Acceptance Deadline",
        "type": "Deadline",
        "date": "2026-09-12",
        "time": "05:00 PM",
        "endTime": "05:00 PM",
        "company": "Datadog",
        "locationOrUrl": "Candidate Portal",
        "notes": "Final acceptance deadline for Telemetry Ingestion Engineer offer ($195k base + equity).",
        "isSyncedWithGoogle": True,
    },
    {
        "id": "evt-7",
        "userId": "usr-1",
        "title": "Vercel Edge Routing Technical Screen",
        "type": "Interview",
        "date": "2026-09-14",
        "time": "11:00 AM",
        "endTime": "12:00 PM",
        "company": "Vercel",
        "locationOrUrl": "https://meet.google.com/ver-sys-4821",
        "notes": "Discussion on Rust WebAssembly isolates and Anycast DNS routing latency.",
        "isSyncedWithGoogle": False,
    },
    {
        "id": "evt-8",
        "userId": "usr-1",
        "title": "Netflix Cloud SRE Application Cutoff",
        "type": "Deadline",
        "date": "2026-09-18",
        "time": "11:59 PM",
        "endTime": "11:59 PM",
        "company": "Netflix",
        "locationOrUrl": "CareerX Companies Portal",
        "notes": "Applications close for Cloud Infrastructure & Kubernetes SRE Specialist role.",
        "isSyncedWithGoogle": False,
    },
    {
        "id": "evt-9",
        "userId": "usr-1",
        "title": "Distributed Systems Capstone Assessment",
        "type": "Assessment",
        "date": "2026-09-22",
        "time": "03:00 PM",
        "endTime": "05:00 PM",
        "company": "CareerX Certification",
        "locationOrUrl": "https://careerx.io/learning/code",
        "notes": "Evaluates Raft consensus state machine and high-availability failure modes.",
        "isSyncedWithGoogle": False,
    },
]


async def seed_database(reset: bool = False) -> Dict[str, int]:
    """Idempotently seed the CareerX MongoDB database."""
    await DatabaseManager.connect()
    db = DatabaseManager.db
    if db is None:
        raise RuntimeError("Database connection not initialized.")

    if reset:
        logger.info("Reset requested: cleaning collections...")
        collections_to_clean = [
            "users", "profiles", "jobs", "applications", "conversations",
            "messages", "connections", "connection_requests", "posts",
            "notifications", "candidates", "recruiter_interactions", "progress",
            "calendar_events"
        ]
        for col_name in collections_to_clean:
            await db[col_name].delete_many({})
        logger.info("Collections cleaned successfully.")

    counts = {}

    # 1. Seed Users and UserProfiles
    hashed_pwd = hash_password(DEFAULT_DEV_PASSWORD)
    user_count = 0
    for u in SEEDED_USERS:
        # User record
        user_doc = {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"].lower(),
            "role": u["role"],
            "passwordHash": hashed_pwd,
            "isActive": True,
            "company": u.get("company"),
            "createdAt": utc_now_iso(),
            "updatedAt": utc_now_iso(),
        }
        await db.users.update_one({"id": u["id"]}, {"$set": user_doc}, upsert=True)

        # Profile record
        profile_doc = {
            "userId": u["id"],
            "name": u["name"],
            "email": u["email"].lower(),
            "role": u["role"],
            "headline": u["headline"],
            "bio": u["bio"],
            "location": u["location"],
            "company": u.get("company"),
            "atsScore": u["atsScore"],
            "avatarInitials": u.get("avatarInitials", "CX"),
            "avatarGradient": u.get("avatarGradient", "from-brand-600 to-indigo-800"),
            "skills": u.get("skills", []),
            "updatedAt": utc_now_iso(),
        }
        await db.profiles.update_one({"userId": u["id"]}, {"$set": profile_doc}, upsert=True)
        user_count += 1
    counts["users"] = user_count

    # 2. Seed Jobs
    job_count = 0
    for job in SEEDED_JOBS:
        j_doc = dict(job)
        j_doc["createdAt"] = utc_now_iso()
        j_doc["skills"] = [
            {"name": s, "isMatched": True} if isinstance(s, str) else s
            for s in job.get("skills", [])
        ]
        await db.jobs.update_one({"id": job["id"]}, {"$set": j_doc}, upsert=True)
        job_count += 1
    counts["jobs"] = job_count

    # 3. Seed Applications
    app_count = 0
    for app in SEEDED_APPLICATIONS:
        a_doc = dict(app)
        a_doc["createdAt"] = utc_now_iso()
        await db.applications.update_one({"id": app["id"]}, {"$set": a_doc}, upsert=True)
        app_count += 1
    counts["applications"] = app_count

    # 4. Seed Conversations and Messages
    conv_count = 0
    for conv in SEEDED_CONVERSATIONS:
        c_doc = dict(conv)
        c_doc["createdAt"] = utc_now_iso()
        await db.conversations.update_one({"id": conv["id"]}, {"$set": c_doc}, upsert=True)
        conv_count += 1
    counts["conversations"] = conv_count

    msg_count = 0
    for msg in SEEDED_MESSAGES:
        m_doc = dict(msg)
        m_doc["createdAt"] = utc_now_iso()
        await db.messages.update_one({"id": msg["id"]}, {"$set": m_doc}, upsert=True)
        msg_count += 1
    counts["messages"] = msg_count

    # 5. Seed Connections and Connection Requests
    conn_count = 0
    for conn in SEEDED_CONNECTIONS:
        cn_doc = dict(conn)
        cn_doc["createdAt"] = utc_now_iso()
        await db.connections.update_one({"id": conn["id"]}, {"$set": cn_doc}, upsert=True)
        conn_count += 1
    counts["connections"] = conn_count

    req_count = 0
    for req in SEEDED_CONNECTION_REQUESTS:
        r_doc = dict(req)
        r_doc["createdAt"] = utc_now_iso()
        await db.connection_requests.update_one({"id": req["id"]}, {"$set": r_doc}, upsert=True)
        req_count += 1
    counts["connection_requests"] = req_count

    # 6. Seed Feed Posts
    post_count = 0
    for post in SEEDED_POSTS:
        p_doc = dict(post)
        p_doc["createdAt"] = utc_now_iso()
        await db.posts.update_one({"id": post["id"]}, {"$set": p_doc}, upsert=True)
        post_count += 1
    counts["posts"] = post_count

    # 7. Seed Notifications
    notif_count = 0
    for notif in SEEDED_NOTIFICATIONS:
        n_doc = dict(notif)
        await db.notifications.update_one({"id": notif["id"]}, {"$set": n_doc}, upsert=True)
        notif_count += 1
    counts["notifications"] = notif_count

    # 8. Seed Recruiter Candidates
    cand_count = 0
    for cand in SEEDED_CANDIDATES:
        c_doc = dict(cand)
        c_doc["createdAt"] = utc_now_iso()
        await db.candidates.update_one({"id": cand["id"]}, {"$set": c_doc}, upsert=True)
        cand_count += 1
    counts["candidates"] = cand_count

    # 9. Seed Recruiter Interactions
    inter_count = 0
    for inter in SEEDED_RECRUITER_INTERACTIONS:
        i_doc = dict(inter)
        i_doc["updatedAt"] = utc_now_iso()
        await db.recruiter_interactions.update_one(
            {"recruiterId": inter["recruiterId"], "candidateId": inter["candidateId"]},
            {"$set": i_doc},
            upsert=True,
        )
        inter_count += 1
    counts["recruiter_interactions"] = inter_count

    # 10. Seed Progress
    prog_doc = dict(SEEDED_PROGRESS)
    prog_doc["updatedAt"] = utc_now_iso()
    await db.progress.update_one({"userId": prog_doc["userId"]}, {"$set": prog_doc}, upsert=True)
    counts["progress"] = 1

    # 11. Seed Calendar Events
    cal_count = 0
    for evt in SEEDED_CALENDAR_EVENTS:
        evt_doc = dict(evt)
        evt_doc["updatedAt"] = utc_now_iso()
        await db.calendar_events.update_one({"id": evt["id"]}, {"$set": evt_doc}, upsert=True)
        cal_count += 1
    counts["calendar_events"] = cal_count

    logger.info("=== Database Seeding Complete ===")
    for k, v in counts.items():
        logger.info("  %s: %d records", k, v)

    return counts


def main():
    parser = argparse.ArgumentParser(description="CareerX Database Seeding CLI")
    parser.add_argument("--reset", action="store_true", help="Clean existing collections before seeding")
    args = parser.parse_args()

    asyncio.run(seed_database(reset=args.reset))


if __name__ == "__main__":
    main()
