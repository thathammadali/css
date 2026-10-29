import { RegistrantItem } from '../types';

export interface FeeStatus {
  label: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
  approved: boolean;
}

export function getFeeStatus(
  registrant: Pick<RegistrantItem, 'backendStatus' | 'receiptFileName'> | undefined,
  isPaidEvent: boolean
): FeeStatus {
  if (!isPaidEvent) {
    return { label: 'Free / No fee required', tone: 'neutral', approved: true };
  }
  switch (registrant?.backendStatus) {
    case 'CONFIRMED':
      return { label: 'Paid / Fee approved', tone: 'success', approved: true };
    case 'PAYMENT_REJECTED':
      return { label: 'Rejected', tone: 'danger', approved: false };
    case 'PAYMENT_PENDING':
      return registrant.receiptFileName
        ? { label: 'Awaiting approval', tone: 'warning', approved: false }
        : { label: 'Payment required', tone: 'warning', approved: false };
    default:
      return { label: 'Payment required', tone: 'warning', approved: false };
  }
}
