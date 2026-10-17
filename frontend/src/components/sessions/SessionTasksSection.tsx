import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Send,
  Upload,
  CheckCircle2,
  X,
  AlertCircle,
  Users,
} from 'lucide-react';
import { SessionTask, TaskSubmission, DashboardRole } from '../../types';
import { eligibilityService } from '../../services/eligibilityService';
import { notificationService } from '../../services/notificationService';
import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

interface SessionTasksSectionProps {
  tasks?: SessionTask[];
  currentRole: DashboardRole;
  onAddTask?: (newTask: SessionTask) => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

export const SessionTasksSection: React.FC<SessionTasksSectionProps> = ({
  tasks = [],
  currentRole,
  onAddTask,
  onNotify,
  isLoading = false,
}) => {
  const isOperationalAdmin = currentRole === 'super_admin' || currentRole === 'admin';
  const isStudent = currentRole === 'student';
  const isGuest = currentRole === 'guest';

  // State for adding a new task (Admin)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('50');
  const [createTaskErrors, setCreateTaskErrors] = useState<{ title?: string; due?: string }>({});
  const [createTaskSuccess, setCreateTaskSuccess] = useState('');

  // State for submitting a task (Student)
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<SessionTask | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(['task-1']);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // State for viewing submissions (Admin)
  const [viewSubmissionsTask, setViewSubmissionsTask] = useState<SessionTask | null>(null);

  // Persistent task submissions synchronized with eligibility engine
  const [mockSubmissions, setMockSubmissions] = useState<TaskSubmission[]>(() =>
    eligibilityService.getTaskSubmissions()
  );

  // Escape key handler for all SessionTasksSection modals
  useEffect(() => {
    if (!showAddTaskModal && !activeTaskForSubmit && !viewSubmissionsTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowAddTaskModal(false);
        setActiveTaskForSubmit(null);
        setViewSubmissionsTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddTaskModal, activeTaskForSubmit, viewSubmissionsTask]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: string; due?: string } = {};
    if (!newTaskTitle.trim()) {
      errors.title = 'Task title is required.';
    }
    if (!newTaskDue) {
      errors.due = 'Due date is required.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateTaskErrors(errors);
      return;
    }
    setCreateTaskErrors({});

    const newTask: SessionTask = {
      id: `task-${Date.now()}`,
      sessionId: 'sess-active',
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Complete the assigned practical problem.',
      dueDate: newTaskDue,
      points: Number(newTaskPoints) || 50,
      submissionsCount: 0,
    };

    if (onAddTask) {
      onAddTask(newTask);
    }

    // Broadcast persistent notification of newly assigned task
    notificationService.addNotification({
      type: 'task_assigned',
      title: 'New Session Task Assigned',
      message: `New practical task "${newTask.title}" assigned. Due: ${newTaskDue}.`,
      linkTab: 'sessions',
      entityId: `task-${newTask.id}`,
    });

    setCreateTaskSuccess(`Task "${newTask.title}" created successfully!`);
    onNotify(`Task created: "${newTask.title}"`);
    setTimeout(() => {
      setShowAddTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDue('');
      setCreateTaskSuccess('');
    }, 1200);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionContent.trim() && !submissionFileName) {
      setSubmitError('Please provide a submission URL, text response, or upload a deliverable file.');
      return;
    }
    setSubmitError('');

    if (activeTaskForSubmit) {
      setCompletedTaskIds((prev) => [...prev, activeTaskForSubmit.id]);
      const newSub: TaskSubmission = {
        id: `sub-${Date.now()}`,
        taskId: activeTaskForSubmit.id,
        studentName: 'Jordan Lee',
        studentRoll: '2024-CS-42',
        submittedAt: 'Just now',
        contentOrUrl: submissionContent.trim() || submissionFileName,
        status: 'submitted',
      };

      const updated = [newSub, ...mockSubmissions];
      setMockSubmissions(updated);
      eligibilityService.saveTaskSubmissions(updated);

      // Student persistent confirmation
      notificationService.addNotification({
        recipientEmail: 'student@university.edu.pk',
        type: 'assignment_submitted',
        title: 'Task Submitted Successfully',
        message: `Your practical submission for "${activeTaskForSubmit.title}" has been recorded.`,
        linkTab: 'sessions',
        entityId: `sub-stud-${newSub.id}`,
      });

      // Admin persistent alert
      notificationService.addNotification({
        type: 'assignment_submitted',
        title: 'New Student Task Submission',
        message: `Jordan Lee submitted assignment for "${activeTaskForSubmit.title}".`,
        linkTab: 'sessions',
        entityId: `sub-admin-${newSub.id}`,
      });

      setSubmitSuccess('Deliverable submitted successfully! Recorded for certificate evaluation.');
      onNotify('Task deliverable submitted successfully!');
      setTimeout(() => {
        setActiveTaskForSubmit(null);
        setSubmissionContent('');
        setSubmissionFileName('');
        setSubmitSuccess('');
      }, 1200);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-[var(--primary-accent)]" />
          <h3 className="font-poppins font-medium text-base text-white">
            Practical Tasks & Submissions ({tasks.length})
          </h3>
        </div>

        {isOperationalAdmin && (
          <button
            type="button"
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white text-xs font-medium transition-all cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Task</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonState variant="list" count={3} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks assigned yet"
          description="Society leads can assign project deliverables, lab problem sets, and practicals here."
          actionLabel={isOperationalAdmin ? "+ Add Task" : undefined}
          onAction={isOperationalAdmin ? () => setShowAddTaskModal(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const isCompleted = completedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded bg-[var(--accent-20)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                        Task 0{idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-semibold text-white">
                        {task.title}
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-sec-80)] mt-1.5 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <span className="text-xs font-inter text-[var(--text-sec-70)] bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                      Due: {task.dueDate}
                    </span>
                    {task.points && (
                      <span className="text-xs font-semibold text-amber-300 bg-amber-500/15 px-2 py-1 rounded-lg border border-amber-500/25">
                        {task.points} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                  {/* Status Indicator */}
                  {isStudent || isGuest ? (
                    isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Submitted · Under Review</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pending Submission</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[var(--text-sec-70)]">
                      Submissions: {task.submissionsCount || mockSubmissions.filter(s => s.taskId === task.id).length}
                    </span>
                  )}

                  {/* Actions */}
                  {(isStudent || isGuest) && (
                    <button
                      type="button"
                      onClick={() => setActiveTaskForSubmit(task)}
                      className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/20'
                          : 'bg-[var(--primary-accent)] hover:brightness-110 text-white shadow'
                      }`}
                    >
                      {isCompleted ? 'Resubmit / Edit' : 'Submit Task'}
                    </button>
                  )}

                  {isOperationalAdmin && (
                    <button
                      type="button"
                      onClick={() => setViewSubmissionsTask(task)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                      <span>View Submissions</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Add Task Modal */}
      {showAddTaskModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddTaskModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                Create Session Task
              </h4>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="p-1 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createTaskSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{createTaskSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => {
                    setNewTaskTitle(e.target.value);
                    if (createTaskErrors.title) {
                      setCreateTaskErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  placeholder="e.g. Task 01: Setup ROS2 Humble"
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none ${
                    createTaskErrors.title ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#0F766E] dark:focus:border-[#2DD4BF]'
                  }`}
                />
                {createTaskErrors.title && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{createTaskErrors.title}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                  Description & Instructions
                </label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Explain deliverables, format, requirements..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => {
                      setNewTaskDue(e.target.value);
                      if (createTaskErrors.due) {
                        setCreateTaskErrors((prev) => ({ ...prev, due: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-[#172B3A] dark:text-[#F1F5F9] text-sm focus:outline-none ${
                      createTaskErrors.due ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#0F766E] dark:focus:border-[#2DD4BF]'
                    }`}
                  />
                  {createTaskErrors.due && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{createTaskErrors.due}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={newTaskPoints}
                    onChange={(e) => setNewTaskPoints(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF]"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-medium text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#172B3A] dark:text-[#F1F5F9] text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Task Modal */}
      {activeTaskForSubmit && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveTaskForSubmit(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                  Submit Task Deliverable
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#A8B5C7]">{activeTaskForSubmit.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskForSubmit(null)}
                className="p-1 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTask} className="space-y-3">
              <div>
                <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                  Submission URL or Text Description
                </label>
                <textarea
                  rows={3}
                  value={submissionContent}
                  onChange={(e) => {
                    setSubmissionContent(e.target.value);
                    if (submitError) setSubmitError('');
                  }}
                  placeholder="Paste your GitHub repository link, Figma URL, or Google Drive link..."
                  className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none ${
                    submitError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#0F766E] dark:focus:border-[#2DD4BF]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium mb-1">
                  Or Upload Deliverable File
                </label>
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 text-center cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSubmissionFileName(e.target.files[0].name);
                        if (submitError) setSubmitError('');
                      }
                    }}
                    className="text-xs text-[#64748B] dark:text-[#A8B5C7]"
                  />
                  {submissionFileName && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                      ✓ Selected: {submissionFileName}
                    </p>
                  )}
                </div>
                {submitError && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{submitError}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 flex gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-medium text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Deliverable</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskForSubmit(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#172B3A] dark:text-[#F1F5F9] text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin View Submissions Modal */}
      {viewSubmissionsTask && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewSubmissionsTask(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            className="w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                  Submissions: {viewSubmissionsTask.title}
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#A8B5C7]">
                  Review participant code, links, and homework submissions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewSubmissionsTask(null)}
                className="p-1 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {mockSubmissions.filter((s) => s.taskId === viewSubmissionsTask.id).length === 0 ? (
                <p className="text-xs text-[#64748B] dark:text-[#A8B5C7] py-4 text-center">
                  No submissions received for this task yet.
                </p>
              ) : (
                mockSubmissions
                  .filter((s) => s.taskId === viewSubmissionsTask.id)
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">
                          {sub.studentName} ({sub.studentRoll})
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                          {sub.grade || 'Submitted'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-[#A8B5C7] break-all font-mono">
                        {sub.contentOrUrl}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748B] dark:text-[#A8B5C7]">
                        <span>{sub.submittedAt}</span>
                        <button
                          type="button"
                          onClick={() => onNotify(`Marked ${sub.studentName}'s submission as reviewed.`)}
                          className="text-[#0F766E] dark:text-[#2DD4BF] hover:underline font-medium cursor-pointer"
                        >
                          Grade Submission
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewSubmissionsTask(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#172B3A] dark:text-[#F1F5F9] text-xs font-medium cursor-pointer transition-colors"
            >
              Close Submissions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
