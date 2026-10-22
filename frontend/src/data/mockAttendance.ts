/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttendanceRecord } from '../types';

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-01',
    sessionId: 'sess-1',
    participantId: 'reg-101',
    participantName: 'Ali Raza',
    participantEmail: 'ali.raza@university.edu.pk',
    rollNumber: '2024-CS-01',
    joinTimestamp: '2026-10-15T14:02:00Z',
    leaveTimestamp: '2026-10-15T17:25:00Z',
    durationMinutes: 203,
    thresholdMet: true, // Attended full 3+ hour session
    verifiedBy: 'Dean Taylor',
  },
  {
    id: 'att-02',
    sessionId: 'sess-1',
    participantId: 'reg-102',
    participantName: 'Sara Khan',
    participantEmail: 'sara.khan@university.edu.pk',
    rollNumber: '2024-CS-12',
    joinTimestamp: '2026-10-15T14:00:00Z',
    leaveTimestamp: '2026-10-15T17:30:00Z',
    durationMinutes: 210,
    thresholdMet: true, // Attended full session
    verifiedBy: 'Alex Morgan',
  },
  {
    id: 'att-03',
    sessionId: 'sess-1',
    participantId: 'reg-103',
    participantName: 'Ahmed Bilal',
    participantEmail: 'ahmed.bilal@university.edu.pk',
    rollNumber: '2024-CS-20',
    joinTimestamp: '2026-10-15T14:15:00Z',
    leaveTimestamp: '2026-10-15T14:45:00Z',
    durationMinutes: 30,
    thresholdMet: false, // Left early, threshold not met
    verifiedBy: 'Alex Morgan',
  },
  {
    id: 'att-04',
    sessionId: 'sess-1',
    participantId: 'reg-104',
    participantName: 'Zainab Fatima',
    participantEmail: 'zainab.fatima@university.edu.pk',
    rollNumber: '2024-SE-05',
    joinTimestamp: '2026-10-15T16:45:00Z',
    leaveTimestamp: '2026-10-15T17:30:00Z',
    durationMinutes: 45,
    thresholdMet: false, // Arrived late, threshold not met
    verifiedBy: 'Dean Taylor',
  },
  {
    id: 'att-05',
    sessionId: 'sess-2',
    participantId: 'reg-105',
    participantName: 'Jordan Lee',
    participantEmail: 'jordan.lee@university.edu.pk',
    rollNumber: '2024-CS-42',
    joinTimestamp: '2026-10-17T10:00:00Z',
    leaveTimestamp: '2026-10-17T13:00:00Z',
    durationMinutes: 180,
    thresholdMet: true, // Complete attendance
    verifiedBy: 'Alex Morgan',
  },
];
