import { EventItem } from '../types';

/** Event-level fee text built from the sessions' own fees. Falls back to the event fee when it has no sessions. */
export function getEventFeeLabel(event: EventItem, freeLabel: string): string {
  if (!event.sessions.length) return event.isPaid ? `Rs. ${event.feeAmount}` : freeLabel;
  const fees = event.sessions.filter((s) => s.isPaid).map((s) => Number(s.amount ?? 0));
  if (!fees.length) return freeLabel;
  const lowest = Math.min(...fees);
  const mixed = fees.length < event.sessions.length || fees.some((fee) => fee !== lowest);
  return mixed ? `From Rs. ${lowest}` : `Rs. ${lowest}`;
}
