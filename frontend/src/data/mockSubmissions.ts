/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskSubmission } from '../types';

export const INITIAL_TASK_SUBMISSIONS: TaskSubmission[] = [
  {
    id: 'sub-01',
    taskId: 'task-1',
    studentName: 'Ali Raza',
    studentRoll: '2024-CS-01',
    studentEmail: 'ali.raza@university.edu.pk',
    submittedAt: '2026-10-14T11:20:00Z', // On time (Due Oct 14)
    contentOrUrl: 'https://github.com/aliraza/ros2-sandbox-setup',
    status: 'submitted',
    grade: '48 / 50',
  },
  {
    id: 'sub-02',
    taskId: 'task-1',
    studentName: 'Sara Khan',
    studentRoll: '2024-CS-12',
    studentEmail: 'sara.khan@university.edu.pk',
    submittedAt: '2026-10-14T09:45:00Z', // On time (Due Oct 14)
    contentOrUrl: 'https://github.com/sarakhan/ros2-humble-verification',
    status: 'graded',
    grade: '50 / 50',
    feedback: 'Excellent container configuration and clean logs.',
  },
  {
    id: 'sub-03',
    taskId: 'task-1',
    studentName: 'Zainab Fatima',
    studentRoll: '2024-SE-05',
    studentEmail: 'zainab.fatima@university.edu.pk',
    submittedAt: '2026-10-16T15:30:00Z', // LATE SUBMISSION (Due Oct 14)
    contentOrUrl: 'https://github.com/zainabfatima/ros2-repo',
    status: 'submitted',
    grade: '35 / 50',
    feedback: 'Submitted 2 days after deadline.',
  },
  {
    id: 'sub-04',
    taskId: 'task-3',
    studentName: 'Jordan Lee',
    studentRoll: '2024-CS-42',
    studentEmail: 'jordan.lee@university.edu.pk',
    submittedAt: '2026-10-15T16:00:00Z', // On time (Due Oct 16)
    contentOrUrl: 'https://figma.com/@jordanlee/mobile-checkout-critique',
    status: 'graded',
    grade: '40 / 40',
    feedback: 'Outstanding typography and WCAG color contrast.',
  },
];
