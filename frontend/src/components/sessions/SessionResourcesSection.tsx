import React from 'react';
import { SessionResource, DashboardRole } from '../../types';

export interface SessionResourcesSectionProps {
  resources?: SessionResource[];
  currentRole: DashboardRole;
  onAddResource?: (newResource: SessionResource) => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

export const SessionResourcesSection: React.FC<SessionResourcesSectionProps> = () => null;
