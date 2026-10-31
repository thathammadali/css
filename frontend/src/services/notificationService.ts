/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationItem, DashboardRole } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'sems_notifications_log';

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'event_published',
    title: 'New Campus Event Published',
    message: 'National Robotics & Autonomous Systems Summit 2026 has been approved and published.',
    timestamp: '2h ago',
    read: false,
    linkTab: 'sessions',
    entityId: 'initial-evt-1',
  },
  {
    id: 'notif-2',
    type: 'payment_approved',
    title: 'Payment Receipt Approved',
    message: 'Your registration fee payment of Rs. 500 for "Annual Robotics & AI Symposium 2026" has been verified. Seat confirmed!',
    timestamp: 'Yesterday',
    read: false,
    linkTab: 'registrants',
    recipientEmail: 'student@university.edu.pk',
    entityId: 'initial-pay-102',
  },
  {
    id: 'notif-3',
    type: 'certificate_issued',
    title: 'SEMS Certificate Available',
    message: 'Your verified certificate for UI/UX Design Sprint is ready for download.',
    timestamp: '3d ago',
    read: true,
    linkTab: 'certificates',
    recipientEmail: 'student@university.edu.pk',
    entityId: 'initial-cert-02',
  },
];

export const notificationService = {
  /**
   * Retrieves all notifications from authoritative persistent storage.
   * Applies role-safe recipient filtering if userContext is provided.
   */
  getNotifications(userContext?: { email?: string; role?: DashboardRole }): NotificationItem[] {
    let allNotifications: NotificationItem[] = [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        allNotifications = JSON.parse(stored);
      } else {
        allNotifications = INITIAL_NOTIFICATIONS;
        this.saveNotifications(allNotifications);
      }
    } catch {
      allNotifications = INITIAL_NOTIFICATIONS;
    }

    if (!userContext) {
      return allNotifications;
    }

    const { email, role } = userContext;
    const normalizedEmail = email?.toLowerCase().trim();
    const studentAliases = ['student@university.edu.pk', 'sportszaab@gmail.com', 'jordan.lee@university.edu.pk'];
    const isStudentUser = studentAliases.includes(normalizedEmail || '');

    return allNotifications.filter((n) => {
      // 1. Guest view: only broadcast public announcements and published events
      if (role === 'guest') {
        return !n.recipientEmail && !n.recipientRole;
      }

      // 2. Direct recipient email match (case-insensitive) & student alias match
      if (n.recipientEmail && normalizedEmail) {
        const notifRecipient = n.recipientEmail.toLowerCase().trim();
        if (notifRecipient === normalizedEmail) {
          return true;
        }
        if (isStudentUser && studentAliases.includes(notifRecipient)) {
          return true;
        }
      }

      // 3. Administrative role match
      if (n.recipientRole) {
        if (role === 'super_admin') return true;
        if (role === 'admin' && n.recipientRole === 'admin') return true;
        return false;
      }

      // 4. Broadcast notification (no specific recipient)
      if (!n.recipientEmail && !n.recipientRole) {
        return true;
      }

      return false;
    });
  },

  /**
   * Saves raw notifications array to persistent storage.
   */
  saveNotifications(list: NotificationItem[]): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sems_notifications_changed'));
      }
    } catch {
      // Safe fallback
    }
  },

  /**
   * Adds a new persistent notification with strict idempotency / deduplication.
   */
  addNotification(
    item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>
  ): NotificationItem {
    const list = this.getAllRawNotifications();

    // Idempotency check: if an entityId is provided, prevent duplicate notifications
    if (item.entityId) {
      const existing = list.find(
        (n) =>
          n.entityId === item.entityId &&
          n.type === item.type &&
          n.recipientEmail === item.recipientEmail
      );
      if (existing) {
        return existing;
      }
    }

    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: 'Just now',
      read: false,
    };

    const updated = [newNotif, ...list];
    this.saveNotifications(updated);
    return newNotif;
  },

  /**
   * Marks a single notification as read.
   */
  markAsRead(notificationId: string): void {
    const list = this.getAllRawNotifications();
    const updated = list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  },

  /**
   * Marks all notifications visible to the user as read.
   */
  markAllAsRead(userContext?: { email?: string; role?: DashboardRole }): void {
    const visible = this.getNotifications(userContext);
    const visibleIds = new Set(visible.map((n) => n.id));
    const list = this.getAllRawNotifications();
    const updated = list.map((n) => (visibleIds.has(n.id) ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  },

  /**
   * Gets unread count for the active user context.
   */
  getUnreadCount(userContext?: { email?: string; role?: DashboardRole }): number {
    return this.getNotifications(userContext).filter((n) => !n.read).length;
  },

  /**
   * Subscribes to notification state changes.
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = () => callback();
    window.addEventListener('sems_notifications_changed', handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('sems_notifications_changed', handler);
      window.removeEventListener('storage', handler);
    };
  },

  /**
   * Internal helper to retrieve unfiltered storage.
   */
  getAllRawNotifications(): NotificationItem[] {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Safe fallback
    }
    return INITIAL_NOTIFICATIONS;
  },
};
