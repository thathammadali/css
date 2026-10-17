/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Plus,
  Upload,
  FolderOpen,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SessionResource, DashboardRole } from '../../types';
import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

interface SessionResourcesSectionProps {
  resources?: SessionResource[];
  currentRole: DashboardRole;
  onAddResource?: (newResource: SessionResource) => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

export const SessionResourcesSection: React.FC<SessionResourcesSectionProps> = ({
  resources = [],
  currentRole,
  onAddResource,
  onNotify,
  isLoading = false,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [customFileSize, setCustomFileSize] = useState('');
  const [customFileType, setCustomFileType] = useState('pdf');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageResources = currentRole === 'super_admin' || currentRole === 'admin';

  // Escape key handler for upload modal
  useEffect(() => {
    if (!showUploadModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowUploadModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal]);

  /**
   * Icon and accent helper matched to file extension/type.
   */
  const getFileVisuals = (fileName: string, type?: string) => {
    const lowerName = fileName.toLowerCase();
    const cleanType = (type || '').toLowerCase();

    if (lowerName.endsWith('.pdf') || cleanType === 'pdf') {
      return {
        icon: FileText,
        colorClass: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
        label: 'PDF Document',
      };
    }
    if (
      lowerName.endsWith('.zip') ||
      lowerName.endsWith('.tar') ||
      lowerName.endsWith('.gz') ||
      cleanType === 'archive'
    ) {
      return {
        icon: FileArchive,
        colorClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
        label: 'Archive Package',
      };
    }
    if (
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.ts') ||
      lowerName.endsWith('.js') ||
      lowerName.endsWith('.py') ||
      cleanType === 'code'
    ) {
      return {
        icon: FileCode,
        colorClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
        label: 'Code / Script',
      };
    }
    if (
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      cleanType === 'data'
    ) {
      return {
        icon: FileSpreadsheet,
        colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        label: 'Spreadsheet',
      };
    }
    if (
      lowerName.endsWith('.fig') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      cleanType === 'figma' ||
      cleanType === 'image'
    ) {
      return {
        icon: FileImage,
        colorClass: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
        label: 'Design File',
      };
    }
    return {
      icon: File,
      colorClass: 'text-[var(--primary-accent)] bg-[var(--accent-20)] border-[var(--accent-30)]',
      label: 'Document',
    };
  };

  const handleDownload = (file: SessionResource) => {
    onNotify(`Downloading "${file.name}" (${file.size})...`);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const formattedSize = `${sizeInMb} MB`;
    const ext = file.name.split('.').pop() || 'doc';

    const newRes: SessionResource = {
      name: file.name,
      size: formattedSize,
      type: ext,
    };

    if (onAddResource) {
      onAddResource(newRes);
    }
    onNotify(`Uploaded "${file.name}" to session resources.`);
    setShowUploadModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFileName.trim()) {
      setUploadError('Resource / file name is required.');
      return;
    }
    setUploadError('');

    const formattedName = customFileName.includes('.')
      ? customFileName.trim()
      : `${customFileName.trim()}.${customFileType}`;

    const newRes: SessionResource = {
      name: formattedName,
      size: customFileSize.trim() || '1.4 MB',
      type: customFileType,
    };

    if (onAddResource) {
      onAddResource(newRes);
    }
    setUploadSuccess(`Resource "${formattedName}" uploaded successfully!`);
    onNotify(`Uploaded "${formattedName}" to session resources.`);
    setTimeout(() => {
      setCustomFileName('');
      setCustomFileSize('');
      setUploadSuccess('');
      setShowUploadModal(false);
    }, 1200);
  };

  return (
    <div
      id="session-resources-card"
      className="p-5 sm:p-6 rounded-2xl bg-white/[0.08] border border-white/[0.16] backdrop-blur-md space-y-4 shadow-xl"
    >
      {/* Top Header: Title, Count, and Head "+ Upload" button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="font-poppins font-medium text-[16px] text-white">
            Resources
          </h4>
          <span className="text-[11px] font-inter text-[var(--text-sec-70)] bg-white/[0.06] border border-white/[0.10] px-2 py-0.5 rounded-full">
            {resources.length}
          </span>
        </div>

        {/* If role is Admin or Super Admin, show small "+ Upload" button */}
        {canManageResources && (
          <button
            id="btn-upload-resource"
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1 rounded-xl bg-[var(--accent-25)] hover:bg-[var(--accent-40)] border border-[var(--accent-40)] text-[var(--primary-accent)] hover:text-white text-xs font-inter font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Upload session resource"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Upload</span>
          </button>
        )}
      </div>

      {/* List of Resource Items or Empty State */}
      {isLoading ? (
        <SkeletonState variant="list" count={3} />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No resources added yet"
          description="Slides, lab manuals, code templates, and handouts will appear here once published."
          actionLabel={canManageResources ? "+ Upload Document" : undefined}
          onAction={canManageResources ? () => setShowUploadModal(true) : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {resources.map((file, idx) => {
            const visual = getFileVisuals(file.name, file.type);
            const IconComponent = visual.icon;

            return (
              <div
                key={`${file.name}-${idx}`}
                className="group p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.10] transition-colors flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${visual.colorClass}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-inter font-medium text-white truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="block text-[11px] font-inter text-[var(--text-sec-70)]">
                      {file.size} · {visual.label}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer shrink-0"
                  title={`Download ${file.name}`}
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="w-4 h-4 text-[var(--primary-accent)]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal (Head Role) */}
      {showUploadModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                  Upload session resource
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick real file picker */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 text-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                id="file-upload-hidden-input"
                onChange={handleFilePicked}
              />
              <label
                htmlFor="file-upload-hidden-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white font-inter text-xs font-medium cursor-pointer transition-all shadow-xs"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select file from computer</span>
              </label>
              <p className="text-[11px] font-inter text-[#64748B] dark:text-[#A8B5C7]">
                Supports PDF, ZIP, code archives, CSV datasets, and presentations
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="flex-shrink mx-3 text-[11px] font-inter text-[#64748B] dark:text-[#A8B5C7] uppercase font-medium">
                Or enter details
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Manual Form Entry */}
            <form onSubmit={handleManualUploadSubmit} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium">
                  Resource / file name *
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => {
                    setCustomFileName(e.target.value);
                    if (uploadError) setUploadError('');
                  }}
                  placeholder="e.g. lecture_slides_chapter_1.pdf"
                  className={`w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none ${
                    uploadError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#0F766E] dark:focus:border-[#2DD4BF]'
                  }`}
                />
                {uploadError && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium">
                    Estimated size
                  </label>
                  <input
                    type="text"
                    value={customFileSize}
                    onChange={(e) => setCustomFileSize(e.target.value)}
                    placeholder="e.g. 2.4 MB"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] font-medium">
                    File category
                  </label>
                  <select
                    value={customFileType}
                    onChange={(e) => setCustomFileType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF]"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="archive">ZIP Archive</option>
                    <option value="code">Code / Script</option>
                    <option value="data">Dataset (CSV)</option>
                    <option value="figma">Design (.fig)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customFileName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 text-xs font-inter font-medium text-white cursor-pointer shadow-xs transition-all"
                >
                  Add resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
