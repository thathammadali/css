/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  FileCheck,
  Link2,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { eligibilityService } from '../../services/eligibilityService';
import { notificationService } from '../../services/notificationService';
import { storageService } from '../../services/storageService';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface SubmitTaskModalProps {
  isOpen: boolean;
  taskId: string;
  taskTitle: string;
  sessionTitle: string;
  dueDate?: string;
  studentName: string;
  studentRoll?: string;
  studentEmail?: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
  onNotify: (msg: string) => void;
}

export const SubmitTaskModal: React.FC<SubmitTaskModalProps> = ({
  isOpen,
  taskId,
  taskTitle,
  sessionTitle,
  dueDate,
  studentName,
  studentRoll,
  studentEmail,
  onClose,
  onSubmitSuccess,
  onNotify,
}) => {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionUrl.trim() && !remarks.trim() && !attachedFile) {
      setError('Please provide a repository/project URL, written summary, or attach a file.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let attachmentNote = '';
      if (attachedFile) {
        // If image, compress and save to IndexedDB
        if (attachedFile.type.startsWith('image/')) {
          const compressed = await storageService.compressImage(attachedFile);
          await storageService.saveFile({
            key: `task_sub_${taskId}_${studentRoll || studentName}`,
            dataUrl: compressed.dataUrl,
            fileName: attachedFile.name,
            fileSize: compressed.compressedSize,
            mimeType: compressed.mimeType,
            createdAt: Date.now(),
          });
          attachmentNote = ` [Attachment: ${attachedFile.name} (${Math.round(compressed.compressedSize / 1024)} KB)]`;
        } else {
          attachmentNote = ` [File: ${attachedFile.name}]`;
        }
      }

      const finalContent = submissionUrl.trim()
        ? `${submissionUrl.trim()} ${remarks ? '• Note: ' + remarks : ''}${attachmentNote}`
        : `${remarks.trim()}${attachmentNote}`;

      eligibilityService.submitTask({
        taskId,
        studentName,
        studentRoll,
        studentEmail,
        contentOrUrl: finalContent,
        feedback: 'Submitted via SEMS Student Task Portal. Ready for evaluation.',
      });

      notificationService.addNotification({
        type: 'assignment_submitted',
        title: 'Assignment Submitted',
        message: `Task "${taskTitle}" solution submitted by ${studentName} (${studentRoll || 'Student'}).`,
        linkTab: 'sessions',
        recipientRole: 'admin',
        entityId: `task-${taskId}-${Date.now()}`,
      });

      onNotify(`Task "${taskTitle}" submitted successfully! Your certificate eligibility is updated.`);
      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to process task submission. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="w-full max-w-lg p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] shadow-2xl space-y-4 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-base text-[#172B3A] dark:text-[#F1F5F9]">Submit Task / Assignment</h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#A8B5C7] font-inter">
                {sessionTitle} &bull; <span className="text-[#172B3A] dark:text-[#F1F5F9] font-medium">{taskTitle}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {dueDate && (
          <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
            <span className="text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Deadline:
            </span>
            <span className="font-mono text-[#172B3A] dark:text-[#F1F5F9] font-medium">{dueDate}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Submission URL Input */}
          <div className="space-y-1.5">
            <label className="text-[#172B3A] dark:text-[#F1F5F9] font-medium flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Project / Repository Link (GitHub, Colab, Figma, Google Drive):</span>
            </label>
            <input
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://github.com/your-username/repo"
              className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF]"
            />
          </div>

          {/* Written summary / answer */}
          <div className="space-y-1.5">
            <label className="text-[#172B3A] dark:text-[#F1F5F9] font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Summary / Solution Remarks / Notes:</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain your approach, libraries used, or key accomplishments..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF] resize-none"
            />
          </div>

          {/* Optional Attachment File */}
          <div className="space-y-1.5">
            <label className="text-[#172B3A] dark:text-[#F1F5F9] font-medium block">
              Optional Screenshot or Code Attachment (PDF, ZIP, PNG):
            </label>
            <div
              onClick={() => {
                const el = document.getElementById('task-sub-file');
                if (el) el.click();
              }}
              className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 hover:border-[#0F766E] dark:hover:border-[#2DD4BF] text-center cursor-pointer transition-colors"
            >
              <input
                id="task-sub-file"
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) setAttachedFile(e.target.files[0]);
                }}
                className="hidden"
              />
              {attachedFile ? (
                <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 font-medium">
                  <FileCheck className="w-4 h-4" />
                  <span>{attachedFile.name} ({Math.round(attachedFile.size / 1024)} KB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-6 h-6 text-[#64748B] dark:text-[#A8B5C7] mx-auto" />
                  <span className="text-[11px] text-[#64748B] dark:text-[#A8B5C7] block">Click to attach solution archive or preview</span>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-[#64748B] dark:text-[#A8B5C7]">
              Submissions are permanently logged in the official ledger.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-xs font-semibold text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Assignment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
