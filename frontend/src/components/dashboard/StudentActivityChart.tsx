import React from 'react';
import { SessionItem, RegistrantItem } from '../../types';

export interface SessionActivityPoint {
  id: string;
  label: string;
  sessionTitle: string;
  hours: number;
  category: string;
  date: string;
  attendancePercent: number;
  status: 'completed' | 'in_progress' | 'upcoming';
}

export interface StudentActivityChartProps {
  sessions?: SessionItem[];
  registrants?: RegistrantItem[];
  currentUserEmail?: string;
  currentUserName?: string;
}

export const StudentActivityChart: React.FC<StudentActivityChartProps> = () => null;
