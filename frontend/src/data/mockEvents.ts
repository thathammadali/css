/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventItem } from '../types';
import { INITIAL_SESSIONS } from './mockSessions';

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'National Robotics & Autonomous Systems Summit 2026',
    description:
      'Premier campus robotics summit uniting industrial researchers, autonomous drone engineers, and student builders. Features multi-track keynotes, sensor fusion labs, and ROS2 hackathons.',
    category: 'Robotics & Hardware',
    organizer: 'Robotics & AI Society',
    status: 'PUBLISHED',
    bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    registrationDeadline: '2026-10-14T23:59:59Z',
    isPaid: true,
    feeAmount: 500,
    createdBy: 'dean.taylor@university.edu.pk',
    createdAt: '2026-09-15T10:00:00Z',
    publishedAt: '2026-09-20T12:00:00Z',
    approvedBy: 'superadmin@university.edu.pk',
    sessions: [INITIAL_SESSIONS[0]],
  },
  {
    id: 'evt-2',
    title: 'Design Horizons: Human-Centered UX Sprint',
    description:
      'A practical 3-day product design boot-camp with design leads from leading tech startups. Covers typography systems, design tokens, micro-interactions, and accessibility testing.',
    category: 'Design & Media',
    organizer: 'Design & Creative Media Club',
    status: 'PUBLISHED',
    bannerUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
    registrationDeadline: '2026-10-16T23:59:59Z',
    isPaid: false,
    feeAmount: 0,
    createdBy: 'admin@university.edu.pk',
    createdAt: '2026-09-18T09:00:00Z',
    publishedAt: '2026-09-22T14:30:00Z',
    approvedBy: 'superadmin@university.edu.pk',
    sessions: [INITIAL_SESSIONS[1]],
  },
  {
    id: 'evt-3',
    title: 'High-Performance Cloud Computing & Microservices Bootcamp',
    description:
      'Deep dive into Go, Kubernetes cluster management, gRPC distributed streams, and edge telemetry architectures.',
    category: 'Cloud & DevOps',
    organizer: 'ACM Student Chapter',
    status: 'UPCOMING',
    bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    registrationDeadline: '2026-10-22T18:00:00Z',
    isPaid: true,
    feeAmount: 750,
    createdBy: 'admin@university.edu.pk',
    createdAt: '2026-09-25T11:00:00Z',
    publishedAt: '2026-09-26T16:00:00Z',
    approvedBy: 'superadmin@university.edu.pk',
    sessions: INITIAL_SESSIONS.slice(2, 4),
  },
  {
    id: 'evt-4',
    title: 'Cybersecurity Penetration Testing & Defense Lab',
    description:
      'Ethical hacking protocols, memory exploitation mitigation, reverse engineering, and threat intelligence exercises.',
    category: 'Cybersecurity',
    organizer: 'InfoSec Society',
    status: 'PENDING_APPROVAL',
    bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    registrationDeadline: '2026-10-28T23:59:59Z',
    isPaid: true,
    feeAmount: 600,
    createdBy: 'dean.taylor@university.edu.pk',
    createdAt: '2026-09-28T15:20:00Z',
    sessions: INITIAL_SESSIONS.slice(4, 6),
  },
];
