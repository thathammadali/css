import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Clock,
  CheckCircle2,
  Sparkles,
  Award,
  Zap,
  BookOpen,
} from 'lucide-react';
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

const DEFAULT_SESSION_DATA: SessionActivityPoint[] = [
  {
    id: 'S1',
    label: 'Session 1',
    sessionTitle: 'Society Orientation & Kickoff',
    hours: 3.5,
    category: 'General',
    date: 'Sep 05, 2026',
    attendancePercent: 100,
    status: 'completed',
  },
  {
    id: 'S2',
    label: 'Session 2',
    sessionTitle: 'Intro to Design Systems',
    hours: 5.0,
    category: 'UI/UX',
    date: 'Sep 12, 2026',
    attendancePercent: 95,
    status: 'completed',
  },
  {
    id: 'S3',
    label: 'Session 3',
    sessionTitle: 'UI/UX Design Sprint (Certified)',
    hours: 8.5,
    category: 'Design Sprint',
    date: 'Sep 19, 2026',
    attendancePercent: 100,
    status: 'completed',
  },
  {
    id: 'S4',
    label: 'Session 4',
    sessionTitle: 'Linux & Embedded Systems Workshop',
    hours: 6.0,
    category: 'Systems',
    date: 'Sep 26, 2026',
    attendancePercent: 88,
    status: 'completed',
  },
  {
    id: 'S5',
    label: 'Session 5',
    sessionTitle: 'Robotics ROS2 Lab & Hardware Demo',
    hours: 7.5,
    category: 'Robotics',
    date: 'Oct 03, 2026',
    attendancePercent: 90,
    status: 'completed',
  },
  {
    id: 'S6',
    label: 'Session 6',
    sessionTitle: 'Annual Robotics & AI Symposium 2026',
    hours: 6.0,
    category: 'AI & Robotics',
    date: 'Oct 10, 2026 (Recent)',
    attendancePercent: 92,
    status: 'completed',
  },
  {
    id: 'S7',
    label: 'Session 7',
    sessionTitle: 'Computer Vision & Deep Learning',
    hours: 4.5,
    category: 'AI',
    date: 'Oct 17, 2026 (Live)',
    attendancePercent: 82,
    status: 'in_progress',
  },
  {
    id: 'S8',
    label: 'Session 8',
    sessionTitle: 'Cloud Architecture & Hackathon Prep',
    hours: 6.0,
    category: 'Cloud',
    date: 'Oct 24, 2026 (Upcoming)',
    attendancePercent: 0,
    status: 'upcoming',
  },
];

interface AttendanceMetric {
  sessionTitle: string;
  attendancePercent: number;
  attendedHours: number;
  totalHours: number;
  status: 'eligible' | 'near' | 'in_progress';
}

const ATTENDANCE_DATA: AttendanceMetric[] = [
  {
    sessionTitle: 'Annual Robotics & AI Symposium 2026',
    attendancePercent: 92,
    attendedHours: 5.5,
    totalHours: 6.0,
    status: 'eligible',
  },
  {
    sessionTitle: 'UI/UX Design Sprint 2026',
    attendancePercent: 100,
    attendedHours: 4.0,
    totalHours: 4.0,
    status: 'eligible',
  },
  {
    sessionTitle: 'Introductory Cloud Architecture Workshop',
    attendancePercent: 75,
    attendedHours: 3.0,
    totalHours: 4.0,
    status: 'near',
  },
  {
    sessionTitle: 'Competitive Programming Masterclass',
    attendancePercent: 88,
    attendedHours: 4.5,
    totalHours: 5.0,
    status: 'eligible',
  },
];

interface StudentActivityChartProps {
  sessions?: SessionItem[];
  registrants?: RegistrantItem[];
  currentUserEmail?: string;
  currentUserName?: string;
}

export const StudentActivityChart: React.FC<StudentActivityChartProps> = ({
  sessions = [],
  registrants = [],
  currentUserEmail,
  currentUserName,
}) => {
  const [chartType, setChartType] = useState<'timeline' | 'attendance'>('timeline');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(5); // Default to recent session

  // Derive session dataset
  const sessionPoints = useMemo(() => {
    // If user has registered sessions, map them if possible
    if (sessions.length > 0 && registrants.length > 0) {
      const userRegs = registrants.filter((r) => {
        if (currentUserEmail && (r.email?.toLowerCase() === currentUserEmail.toLowerCase() || r.primaryEmail?.toLowerCase() === currentUserEmail.toLowerCase())) {
          return true;
        }
        if (currentUserName && r.name?.toLowerCase().includes(currentUserName.toLowerCase())) {
          return true;
        }
        return false;
      });

      if (userRegs.length >= 3) {
        return userRegs.slice(0, 8).map((reg, idx) => {
          const matchedSession = sessions.find((s) => s.id === reg.sessionId);
          const hours = matchedSession?.minAttendanceMinutes ? Number((matchedSession.minAttendanceMinutes / 60).toFixed(1)) : 4.0;
          const isAttended = reg.attendanceCompleted || reg.lifecycleStatus === 'ATTENDED' || reg.status === 'approved';
          return {
            id: `S${idx + 1}`,
            label: `Session ${idx + 1}`,
            sessionTitle: reg.sessionTitle || matchedSession?.title || `Session ${idx + 1}`,
            hours: hours > 0 ? hours : 4.0,
            category: matchedSession?.category || 'Workshop',
            date: matchedSession?.date || '2026 Term',
            attendancePercent: isAttended ? 100 : reg.lifecycleStatus === 'FORM_IN_PROGRESS' ? 40 : 85,
            status: isAttended ? 'completed' : 'in_progress',
          } as SessionActivityPoint;
        });
      }
    }
    return DEFAULT_SESSION_DATA;
  }, [sessions, registrants, currentUserEmail, currentUserName]);

  // Aggregate stats
  const totalHours = useMemo(() => {
    return sessionPoints.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);
  }, [sessionPoints]);

  const avgAttendance = useMemo(() => {
    const activeWithAttendance = sessionPoints.filter((s) => s.attendancePercent > 0);
    if (!activeWithAttendance.length) return '91.4%';
    const sum = activeWithAttendance.reduce((acc, curr) => acc + curr.attendancePercent, 0);
    return `${(sum / activeWithAttendance.length).toFixed(1)}%`;
  }, [sessionPoints]);

  const completedSessionsCount = useMemo(() => {
    return sessionPoints.filter((s) => s.status === 'completed' || s.attendancePercent >= 75).length;
  }, [sessionPoints]);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 25;
  const maxHours = 12;

  const getCoordinates = (point: SessionActivityPoint, index: number) => {
    const x =
      paddingX +
      (index / (sessionPoints.length - 1)) * (svgWidth - paddingX * 2);
    const y =
      svgHeight -
      paddingY -
      (Math.min(point.hours, maxHours) / maxHours) * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const points = sessionPoints.map((p, i) => getCoordinates(p, i));

  // Build smooth bezier path
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
  }, '');

  // Fill path closing at bottom
  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const fillD = `${pathD} L ${lastPt.x},${svgHeight - paddingY} L ${firstPt.x},${svgHeight - paddingY} Z`;

  const activeIdx = hoveredIdx !== null && hoveredIdx < sessionPoints.length ? hoveredIdx : 5;
  const activePoint = sessionPoints[activeIdx] || sessionPoints[0];

  return (
    <div
      id="student-activity-chart-panel"
      className="glass-card p-5 sm:p-6 rounded-2xl space-y-4"
    >
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--panel-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0 shadow-xs">
            <TrendingUp className="w-5 h-5 text-[var(--primary-accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-semibold text-base sm:text-lg text-[var(--text-primary)]">
                Academic & Session Engagement
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                <Sparkles className="w-3 h-3 text-[var(--primary-accent)]" />
                Live Session Analytics
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Track your per-session learning hours, workshop attendance, and certificate milestone progress.
            </p>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] self-start sm:self-center shadow-xs">
          <button
            type="button"
            onClick={() => setChartType('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              chartType === 'timeline'
                ? 'bg-[var(--primary-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>Session Hours</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('attendance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              chartType === 'attendance'
                ? 'bg-[var(--primary-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Attendance %</span>
          </button>
        </div>
      </div>

      {/* Metric Highlight Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-sec-70)]">Total Hours</span>
            <span className="font-poppins font-semibold text-sm text-[var(--text-primary)]">{totalHours} hrs</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-secondary)]">Avg Attendance</span>
            <span className="font-poppins font-semibold text-sm text-[var(--text-primary)]">{avgAttendance}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-secondary)]">Completed Sessions</span>
            <span className="font-poppins font-semibold text-sm text-[var(--text-primary)]">{completedSessionsCount} of {sessionPoints.length}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-secondary)]">Certificates</span>
            <span className="font-poppins font-semibold text-sm text-[var(--text-primary)]">2 Earned</span>
          </div>
        </div>
      </div>

      {/* CHART VIEW 1: TIMELINE SVG AREA GRAPH (SESSION-BASED) */}
      {chartType === 'timeline' && (
        <div className="space-y-3 pt-2">
          {/* Active Hover Detail Tooltip Callout */}
          <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activePoint.status === 'completed' ? 'bg-emerald-500' : activePoint.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              <span className="font-semibold text-[var(--text-primary)]">
                {activePoint.label} ({activePoint.date}):
              </span>
              <span className="text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-xs font-medium">
                {activePoint.sessionTitle}
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-15)] text-[var(--primary-accent)]">
                {activePoint.category}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {activePoint.hours} hrs logged
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                ({activePoint.attendancePercent}% attendance)
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-44 sm:h-52 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[2, 4, 6, 8, 10].map((val) => {
                const y = svgHeight - paddingY - (val / maxHours) * (svgHeight - paddingY * 2);
                return (
                  <g key={`grid-${val}`}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-white/10"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      className="fill-slate-500 dark:fill-white/40 text-[9px] font-mono"
                      textAnchor="end"
                    >
                      {val}h
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              <path d={fillD} fill="url(#chartGradient)" />

              {/* Smooth Curve Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                filter="url(#glow)"
              />

              {/* Interactive Points */}
              {points.map((pt, idx) => {
                const isSelected = activeIdx === idx;
                const pointData = sessionPoints[idx];
                return (
                  <g
                    key={`pt-${idx}`}
                    className="cursor-pointer transition-transform duration-150"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                  >
                    {/* Hover vertical line */}
                    {isSelected && (
                      <line
                        x1={pt.x}
                        y1={paddingY}
                        x2={pt.x}
                        y2={svgHeight - paddingY}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />
                    )}
                    {/* Outer glow ring */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#10b981' : '#042f2e'}
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    {/* Inner dot */}
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r="2.5" fill="#ffffff" />
                    )}

                    {/* X-axis Session Label (S1, S2, etc.) */}
                    <text
                      x={pt.x}
                      y={svgHeight - 6}
                      className={isSelected ? 'fill-emerald-600 dark:fill-emerald-400 font-bold' : 'fill-slate-600 dark:fill-white/60 font-medium'}
                      fontSize="10"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {pointData.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--text-sec-70)] px-2 pt-1 border-t border-[var(--panel-border)] gap-1">
            <span>💡 Tip: Click or hover over any session node (S1–S8) to inspect session hours & syllabus engagement.</span>
            <span className="font-mono text-emerald-400">Target: 4+ hrs/session</span>
          </div>
        </div>
      )}

      {/* CHART VIEW 2: ATTENDANCE & ELIGIBILITY BARS */}
      {chartType === 'attendance' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-sec-80)]">
            <span>Enrolled Sessions Progress</span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-0.5 bg-amber-400 inline-block" />
              Minimum 75% Required For Certificate
            </span>
          </div>

          <div className="space-y-3.5">
            {ATTENDANCE_DATA.map((item, i) => {
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)] truncate max-w-[280px] sm:max-w-md">
                      {item.sessionTitle}
                    </span>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-[var(--text-sec-70)]">
                        {item.attendedHours}/{item.totalHours} hrs
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          item.attendancePercent >= 90
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.attendancePercent >= 75
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {item.attendancePercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="relative w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.attendancePercent >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : item.attendancePercent >= 75
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-400'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                      style={{ width: `${item.attendancePercent}%` }}
                    />
                    {/* 75% threshold indicator mark */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-white/40"
                      style={{ left: '75%' }}
                      title="75% threshold"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">
              Certificate Eligibility Status: <strong className="text-[var(--text-primary)]">3 of 4 Sessions Qualified</strong>
            </span>
            <span className="text-emerald-400 font-medium">Auto-Issue Enabled</span>
          </div>
        </div>
      )}
    </div>
  );
};
