export type NotificationCategory =
  | 'interview_reminder'
  | 'application_deadline'
  | 'follow_up'
  | 'message'
  | 'connection_request'
  | 'job_recommendation'
  | 'learning_achievement';

export interface CareerNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  priority: 'urgent' | 'normal' | 'low';
  company?: string;
  actionLabel?: string;
  actionUrl?: string;
  actionPayload?: any;
}

export const INITIAL_NOTIFICATIONS: CareerNotification[] = [
  // 1. Interview Reminder
  {
    id: 'notif-1',
    category: 'interview_reminder',
    title: 'Upcoming Stripe Onsite: System Architecture',
    description: 'Your 4-round technical onsite loop with Stripe begins on Tuesday, Sep 8 at 9:00 AM PST. The briefing dossier has been attached to your messenger.',
    timestamp: '20m ago',
    createdAt: '2026-09-02T23:50:00Z',
    isRead: false,
    priority: 'urgent',
    company: 'Stripe',
    actionLabel: 'Review Briefing',
    actionUrl: '/messages',
  },

  // 2. Application Deadline
  {
    id: 'notif-2',
    category: 'application_deadline',
    title: 'Deadline Alert: Linear Product Engineering Role',
    description: 'Applications for the Full Stack Product Engineer role at Linear close in 48 hours. Your ATS resume match score is currently 92%.',
    timestamp: '1h ago',
    createdAt: '2026-09-02T22:30:00Z',
    isRead: false,
    priority: 'urgent',
    company: 'Linear',
    actionLabel: 'Apply Now',
    actionUrl: '/companies',
  },

  // 3. Follow-up
  {
    id: 'notif-3',
    category: 'follow_up',
    title: 'Follow-Up Recommended: Sarah Lin (Stripe)',
    description: 'It has been 2 business days since your screening debrief with Stripe. Send a brief note confirming your availability for the onsite loop.',
    timestamp: '3h ago',
    createdAt: '2026-09-02T20:45:00Z',
    isRead: false,
    priority: 'normal',
    company: 'Stripe',
    actionLabel: 'Open Messenger',
    actionUrl: '/messages',
  },

  // 4. Message
  {
    id: 'notif-4',
    category: 'message',
    title: 'New Message from Marcus Vance (Staff SRE)',
    description: '“Are you using transactional outbox or change data capture with Kafka in your broker project?”',
    timestamp: '4h ago',
    createdAt: '2026-09-02T19:20:00Z',
    isRead: false,
    priority: 'normal',
    company: 'Stripe',
    actionLabel: 'Reply to Marcus',
    actionUrl: '/messages',
  },

  // 5. Connection Request
  {
    id: 'notif-5',
    category: 'connection_request',
    title: 'Connection Request: Chloe Nguyen (Linear)',
    description: 'Founding Tech Lead at Linear sent you an invitation with a note: “Checked out your local-first issue tracker project on GitHub. Very impressed with the CRDT sync.”',
    timestamp: '6h ago',
    createdAt: '2026-09-02T17:15:00Z',
    isRead: true,
    priority: 'normal',
    company: 'Linear',
    actionLabel: 'Review Request',
    actionUrl: '/network',
  },

  // 6. Job Recommendation
  {
    id: 'notif-6',
    category: 'job_recommendation',
    title: 'New 94% Match: Telemetry Ingestion Engineer',
    description: 'Datadog just opened a new position for Telemetry Ingestion Engineer ($175k - $215k) that matches your Go concurrency and Kafka background.',
    timestamp: '1d ago',
    createdAt: '2026-09-01T15:00:00Z',
    isRead: true,
    priority: 'low',
    company: 'Datadog',
    actionLabel: 'View Job Details',
    actionUrl: '/companies',
  },

  // 7. Learning Achievement
  {
    id: 'notif-7',
    category: 'learning_achievement',
    title: '14-Day Coding Streak Unlocked! 🔥',
    description: 'You have maintained an unbroken 14-day practice streak on CareerX! You earned 150 Platform XP and unlocked the Algorithmic Consistency Gold Badge.',
    timestamp: '1d ago',
    createdAt: '2026-09-01T11:30:00Z',
    isRead: true,
    priority: 'low',
    actionLabel: 'View Progress Badge',
    actionUrl: '/progress',
  },
];
