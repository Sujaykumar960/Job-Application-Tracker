import { CalendarEvent } from '../api/calendarSync';

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  // 1. Follow-up today
  {
    id: 'evt-1',
    title: 'Follow-up with Sarah Lin on Onsite Packet',
    type: 'Follow-up',
    date: '2026-09-03',
    time: '09:30 AM',
    endTime: '10:00 AM',
    company: 'Stripe',
    locationOrUrl: 'Email / Platform Message',
    notes: 'Confirm briefing schedule for next week and ask about distributed rate limiter deep-dive.',
    isSyncedWithGoogle: true,
  },

  // 2. Linear Technical Screen
  {
    id: 'evt-2',
    title: 'Linear Product Engineering Screen',
    type: 'Interview',
    date: '2026-09-04',
    time: '02:00 PM',
    endTime: '03:00 PM',
    company: 'Linear',
    locationOrUrl: 'https://meet.google.com/lin-tech-9204',
    notes: 'Technical discussion with Chloe Nguyen on local-first CRDT synchronization and SQLite WebAssembly.',
    isSyncedWithGoogle: true,
  },

  // 3. Senior Backend Proctored Assessment
  {
    id: 'evt-3',
    title: 'Senior Backend Concurrency Assessment Cutoff',
    type: 'Assessment',
    date: '2026-09-06',
    time: '06:00 PM',
    endTime: '08:00 PM',
    company: 'CareerX Certification',
    locationOrUrl: 'https://careerx.io/learning/code',
    notes: 'Proctored coding exam testing Goroutines, channel backpressure, and atomic Redis Lua locks.',
    isSyncedWithGoogle: true,
  },

  // 4. Stripe Final Onsite Loop
  {
    id: 'evt-4',
    title: 'Stripe Final Technical Onsite Loop (4 Rounds)',
    type: 'Interview',
    date: '2026-09-08',
    time: '09:00 AM',
    endTime: '02:00 PM',
    company: 'Stripe',
    locationOrUrl: 'https://stripe.zoom.us/j/8492048192',
    notes: '4 rounds: Distributed Systems Architecture, Live Go Coding, Database Concurrency, and Engineering Values.',
    isSyncedWithGoogle: true,
  },

  // 5. Follow-up with Linear
  {
    id: 'evt-5',
    title: 'Follow-up on Linear Technical Screen Debrief',
    type: 'Follow-up',
    date: '2026-09-10',
    time: '01:00 PM',
    endTime: '01:30 PM',
    company: 'Linear',
    locationOrUrl: 'Platform Messages',
    notes: 'Review feedback from technical screen with Ryan Sterling.',
    isSyncedWithGoogle: true,
  },

  // 6. Datadog Offer Deadline
  {
    id: 'evt-6',
    title: 'Datadog Offer Acceptance Deadline',
    type: 'Deadline',
    date: '2026-09-12',
    time: '05:00 PM',
    endTime: '05:00 PM',
    company: 'Datadog',
    locationOrUrl: 'Candidate Portal',
    notes: 'Final acceptance deadline for Telemetry Ingestion Engineer offer ($195k base + equity).',
    isSyncedWithGoogle: true,
  },

  // 7. Vercel Technical Screen
  {
    id: 'evt-7',
    title: 'Vercel Edge Routing Technical Screen',
    type: 'Interview',
    date: '2026-09-14',
    time: '11:00 AM',
    endTime: '12:00 PM',
    company: 'Vercel',
    locationOrUrl: 'https://meet.google.com/ver-sys-4821',
    notes: 'Discussion on Rust WebAssembly isolates and Anycast DNS routing latency.',
    isSyncedWithGoogle: false,
  },

  // 8. Netflix Application Deadline
  {
    id: 'evt-8',
    title: 'Netflix Cloud SRE Application Cutoff',
    type: 'Deadline',
    date: '2026-09-18',
    time: '11:59 PM',
    endTime: '11:59 PM',
    company: 'Netflix',
    locationOrUrl: 'CareerX Companies Portal',
    notes: 'Applications close for Cloud Infrastructure & Kubernetes SRE Specialist role.',
    isSyncedWithGoogle: false,
  },

  // 9. Distributed Systems Benchmark
  {
    id: 'evt-9',
    title: 'Distributed Systems Capstone Assessment',
    type: 'Assessment',
    date: '2026-09-22',
    time: '03:00 PM',
    endTime: '05:00 PM',
    company: 'CareerX Certification',
    locationOrUrl: 'https://careerx.io/learning/code',
    notes: 'Evaluates Raft consensus state machine and high-availability failure modes.',
    isSyncedWithGoogle: false,
  },
];
