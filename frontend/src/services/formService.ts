/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RegistrationFormConfig } from '../types';
import { DEFAULT_REGISTRATION_FORM } from '../data/mockForms';
import { auditService } from './userService';
import { notificationService } from './notificationService';

const FORM_STORAGE_KEY = 'sems_registration_form_active';
const FORM_HISTORY_KEY = 'sems_registration_form_history';

export const formService = {
  /**
   * Retrieves all preserved historical registration form schemas.
   * Past schema versions (V1, V2, V3...) are never deleted or mutated.
   */
  getHistoricalVersions(): RegistrationFormConfig[] {
    try {
      const stored = localStorage.getItem(FORM_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RegistrationFormConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (a.version || 1) - (b.version || 1));
        }
      }
    } catch {
      // Safe fallback
    }

    // Default seed contains Version 1
    const initialSeed: RegistrationFormConfig[] = [
      {
        ...DEFAULT_REGISTRATION_FORM,
        version: 1,
        isPublished: true,
      },
    ];
    this.saveHistoricalVersions(initialSeed);
    return initialSeed;
  },

  /**
   * Persists the array of preserved historical versions.
   */
  saveHistoricalVersions(versions: RegistrationFormConfig[]): void {
    try {
      localStorage.setItem(FORM_HISTORY_KEY, JSON.stringify(versions));
      window.dispatchEvent(new Event('sems_forms_updated'));
    } catch {
      // Safe fallback
    }
  },

  /**
   * Retrieves the currently active published registration form schema.
   */
  getActiveForm(): RegistrationFormConfig {
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RegistrationFormConfig;
        if (parsed && parsed.fields) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }

    const history = this.getHistoricalVersions();
    const active = history[history.length - 1] || DEFAULT_REGISTRATION_FORM;
    return active;
  },

  /**
   * Fetches an exact immutable snapshot of a historical form schema version.
   * Registrations submitted against V1 remain linked to the V1 schema, V2 to V2, etc.
   */
  getFormByVersion(version: number): RegistrationFormConfig | undefined {
    const history = this.getHistoricalVersions();
    return history.find((f) => (f.version || 1) === version);
  },

  /**
   * Publishes a new registration form schema version.
   * Increments version (e.g. V1 -> V2 -> V3), preserves all prior versions,
   * updates the active form, and records audit and notification events.
   */
  publishNewVersion(
    config: Omit<RegistrationFormConfig, 'version'>,
    publisherRole: string = 'ADMIN'
  ): RegistrationFormConfig {
    const history = this.getHistoricalVersions();
    const maxVersion = history.reduce((max, cur) => Math.max(max, cur.version || 1), 0);
    const nextVersion = maxVersion + 1;

    const newSnapshot: RegistrationFormConfig = {
      ...config,
      id: `form-schema-v${nextVersion}`,
      version: nextVersion,
      updatedAt: new Date().toISOString().split('T')[0],
      isPublished: true,
      isArchived: false,
    };

    // Mark previous versions as archived snapshots (preserved immutably)
    const updatedHistory: RegistrationFormConfig[] = history.map((item) => ({
      ...item,
      isArchived: true,
    }));
    updatedHistory.push(newSnapshot);

    this.saveHistoricalVersions(updatedHistory);

    try {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(newSnapshot));
    } catch {
      // Safe fallback
    }

    auditService.log({
      action: 'FORM_SCHEMA_VERSIONED',
      actor: publisherRole.toUpperCase(),
      actorRole: publisherRole.toUpperCase(),
      target: `Registration Form Schema (V${nextVersion})`,
      details: `Published dynamic schema version V${nextVersion} with ${newSnapshot.fields.length} fields. All previous versions preserved.`,
      result: 'SUCCESS',
    });

    notificationService.addNotification({
      recipientRole: 'admin',
      type: 'announcement',
      title: `Form Schema Updated to V${nextVersion}`,
      message: `Registration form schema updated to Version V${nextVersion}. New registrations will use this schema; historical records stay on prior version.`,
      linkTab: 'form-builder',
      entityId: `form-schema-v${nextVersion}`,
    });

    return newSnapshot;
  },

  /**
   * Allows activating a designated prior version as the active form.
   */
  setActiveVersion(version: number): RegistrationFormConfig | undefined {
    const target = this.getFormByVersion(version);
    if (!target) return undefined;

    try {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(target));
      window.dispatchEvent(new Event('sems_forms_updated'));
    } catch {
      // Safe fallback
    }
    return target;
  },
};
