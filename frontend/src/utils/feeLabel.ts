import { EventItem } from '../types';

/** An event is free when none of its sessions is paid. */
export function isEventFree(event: EventItem): boolean {
  return !event.sessions.some((session) => session.isPaid);
}

/** Event-level fee text built from the sessions' own fees. */
export function getEventFeeLabel(event: EventItem, freeLabel: string): string {
  if (isEventFree(event)) return freeLabel;
  const fees = event.sessions.filter((s) => s.isPaid).map((s) => Number(s.amount ?? 0));
  const lowest = Math.min(...fees);
  const mixed = fees.length < event.sessions.length || fees.some((fee) => fee !== lowest);
  return mixed ? `From Rs. ${lowest}` : `Rs. ${lowest}`;
}
