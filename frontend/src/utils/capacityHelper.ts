/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionItem, RegistrantItem } from '../types';

export interface SessionCapacityInfo {
  totalSeats: number;
  enrolledCount: number;
  seatsRemaining: number;
  isCapacityFull: boolean;
  waitlistCount: number;
  displayStatus: 'available' | 'low_seats' | 'full';
  capacityLabel: string;
}

export function getSessionCapacity(
  session: SessionItem | null | undefined,
  allRegistrants?: RegistrantItem[]
): SessionCapacityInfo {
  if (!session) {
    return {
      totalSeats: 100,
      enrolledCount: 0,
      seatsRemaining: 100,
      isCapacityFull: false,
      waitlistCount: 0,
      displayStatus: 'available',
      capacityLabel: 'Open Enrollment',
    };
  }

  // Count from registrants if provided
  const matchingRegistrants = allRegistrants?.filter(
    (r) => r.sessionId === session.id && r.status !== 'rejected'
  ) || [];

  const waitlisted = matchingRegistrants.filter(
    (r) => r.lifecycleStatus === 'WAITLISTED' || r.isWaitlisted
  );
  const enrolledFromList = matchingRegistrants.length - waitlisted.length;

  let totalSeats = session.totalSeats ?? 100;
  let enrolledCount = enrolledFromList;

  // If session has capacity string (e.g. "64 / 120 slots filled" or "38 / 40 slots filled")
  const capacityText = String(session.capacity ?? '');
  const match = capacityText.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    const parsedEnrolled = parseInt(match[1], 10);
    const parsedTotal = parseInt(match[2], 10);
    totalSeats = parsedTotal;
    // If we have actual registered items in state, use whichever is higher to reflect real new submissions
    enrolledCount = Math.max(parsedEnrolled, enrolledFromList);
  } else {
    const registeredCount = Number(session.registered_count);
    const enrolledFromRemaining =
      session.seatsRemaining !== undefined
        ? Math.max(totalSeats - session.seatsRemaining, 0)
        : 0;
    enrolledCount = Math.max(
      enrolledFromList,
      Number.isFinite(registeredCount) ? registeredCount : 0,
      enrolledFromRemaining
    );
  }

  const seatsRemaining = Math.max(0, totalSeats - enrolledCount);
  const isCapacityFull = seatsRemaining <= 0 || session.status === 'closed';

  let displayStatus: 'available' | 'low_seats' | 'full' = 'available';
  if (isCapacityFull) {
    displayStatus = 'full';
  } else if (seatsRemaining <= 10) {
    displayStatus = 'low_seats';
  }

  return {
    totalSeats,
    enrolledCount,
    seatsRemaining,
    isCapacityFull,
    waitlistCount: waitlisted.length,
    displayStatus,
    capacityLabel: `${enrolledCount} / ${totalSeats} seats filled`,
  };
}
