/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Palette,
  Check,
  Mail,
  LogOut,
  GraduationCap,
  Building2,
  Save,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  KeyRound,
  HardDrive,
  RotateCcw,
  Trash2,
  Database,
} from 'lucide-react';
import { DashboardRole, AuthUser, ThemeSwatch } from '../../types';
import { THEME_STORAGE_KEY, applyThemeToDocument } from '../../data/themes';
import { useTheme } from '../../context/ThemeContext';
import { storageService } from '../../services/storageService';
import { ConfirmDialog } from '../ConfirmDialog';

interface ProfilePageProps {
  currentRole: DashboardRole;
  user: AuthUser | null;
  activeTheme?: ThemeSwatch;
  onSelectTheme?: (theme: ThemeSwatch) => void;
  onBack: () => void;
  onSelectRole?: (role: DashboardRole) => void;
  onOpenAuthModal: () => void;
  onUpdateUser?: (updated: AuthUser) => void;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentRole,
  user,
  activeTheme: propTheme,
  onSelectTheme: propSelectTheme,
  onBack,
  onSelectRole,
  onOpenAuthModal,
  onUpdateUser,
  onLogout,
  onNotify,
}) => {
  const {
    activeTheme: contextTheme,
    setTheme: contextSetTheme,
    availableThemes,
  } = useTheme();
  const activeTheme = propTheme || contextTheme;
  const onSelectTheme = propSelectTheme || contextSetTheme;

  const getRoleDisplayName = (role: DashboardRole): string => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'student':
        return 'Student';
      default:
        return 'Guest';
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const defaultPrimaryEmail = user?.primaryEmail || user?.email || (
    currentRole === 'guest'
      ? 'guest.observer@university.edu'
      : ''
  );

  const defaultSecondaryEmail = user?.secondaryEmail || '';

  const [primaryEmailInput, setPrimaryEmailInput] = useState(defaultPrimaryEmail);
  const [secondaryEmailInput, setSecondaryEmailInput] = useState(defaultSecondaryEmail);
  const [fullNameInput, setFullNameInput] = useState(user?.name || '');
  const [rollNumberInput, setRollNumberInput] = useState(user?.rollNumber || '');
  const [departmentInput, setDepartmentInput] = useState(user?.department || '');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [emailErrors, setEmailErrors] = useState<{ primary?: string; secondary?: string }>({});

  // IndexedDB Storage & Demo Reset State
  const [storageStats, setStorageStats] = useState<{ fileCount: number; totalEstimatedBytes: number }>({
    fileCount: 0,
    totalEstimatedBytes: 0,
  });
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    storageService.getStorageStats().then((stats) => setStorageStats(stats));
  }, []);

  const refreshStorageStats = () => {
    storageService.getStorageStats().then((stats) => setStorageStats(stats));
  };

  const handleClearOfflineFiles = async () => {
    try {
      await storageService.clearAllFiles();
      refreshStorageStats();
      onNotify('Offline receipt cache cleared successfully.');
    } catch {
      onNotify('Failed to clear offline cache.');
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await storageService.resetAllDemoData();
      onNotify('System reset to original demo state. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Reset error:', err);
      onNotify('Failed to reset demo data.');
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (user) {
      setPrimaryEmailInput(user.primaryEmail || user.email || '');
      setSecondaryEmailInput(user.secondaryEmail || '');
      setFullNameInput(user.name || '');
      setRollNumberInput(user.rollNumber || '');
      setDepartmentInput(user.department || '');
    }
  }, [user]);

  const profileName = fullNameInput || user?.name || (
    currentRole === 'super_admin'
      ? 'Prof. Dean Taylor'
      : currentRole === 'admin'
      ? 'Alex Morgan'
      : currentRole === 'student'
      ? 'Jordan Lee'
      : 'Guest Visitor'
  );

  const initials = getInitials(profileName);

  const handleSaveEmails = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { primary?: string; secondary?: string } = {};

    if (!primaryEmailInput.trim()) {
      errors.primary = 'Primary university email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmailInput.trim())) {
      errors.primary = 'Please enter a valid primary email address.';
    }

    if (!secondaryEmailInput.trim()) {
      errors.secondary = 'Secondary personal email is required for graduation recovery.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryEmailInput.trim())) {
      errors.secondary = 'Please enter a valid secondary personal email address.';
    } else if (secondaryEmailInput.trim().toLowerCase() === primaryEmailInput.trim().toLowerCase()) {
      errors.secondary = 'Secondary email must be different from university email (use personal e.g. Gmail/Outlook).';
    }

    if (Object.keys(errors).length > 0) {
      setEmailErrors(errors);
      onNotify('Please correct the email address formatting.');
      return;
    }

    setEmailErrors({});

    const updatedUser: AuthUser = {
      name: fullNameInput.trim() || profileName,
      email: primaryEmailInput.trim(),
      primaryEmail: primaryEmailInput.trim(),
      secondaryEmail: secondaryEmailInput.trim(),
      role: user?.role || currentRole,
      isLoggedIn: true,
      rollNumber: rollNumberInput.trim(),
      department: departmentInput.trim(),
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 3000);
    onNotify('Dual emails updated: Permanent graduation certificate protection active!');
  };

  const handleSwatchClick = (theme: ThemeSwatch) => {
    if (!theme.unlocked) {
      onNotify(`Theme "${theme.name}" is locked.`);
      return;
    }

    onSelectTheme(theme);
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      // Safe fallback
    }
    onNotify(`Active theme set to "${theme.name}".`);
  };

  return (
    <div id="profile-page-container" className="w-full space-y-7 animate-fadeIn max-w-6xl xl:max-w-7xl mx-auto pb-12">
      {/* ========================================================
          SUBHEADER: Back Arrow + "Profile" Title
         ======================================================== */}
      <div
        className="flex items-center justify-between gap-4 pb-2 border-b"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            id="btn-back-from-profile"
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            aria-label="Back to previous page"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2
              className="font-poppins font-medium text-[20px] sm:text-[22px] leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Profile & Account Settings
            </h2>
            <p className="font-inter text-xs" style={{ color: 'var(--text-secondary)' }}>
              Manage your dual emails, graduation credentials, and visual theme
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-3.5 py-1.5 rounded-2xl bg-white/[0.06] hover:bg-rose-950/40 border border-white/[0.12] hover:border-rose-500/40 text-[var(--text-secondary)] hover:text-rose-200 font-inter text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out / Switch Account</span>
        </button>
      </div>

      {/* ========================================================
          TOP GLASS CARD: Avatar, Name, Role Label
         ======================================================== */}
      <div
        id="profile-top-glass-card"
        className="glass-panel p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          {/* Avatar circle with initials */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/25 flex items-center justify-center text-white font-poppins font-medium text-xl sm:text-2xl shadow-lg shrink-0"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.accent} 0%, ${activeTheme.bgEnd} 100%)`,
            }}
          >
            {initials}
          </div>

          {/* Name & Role Label */}
          <div className="min-w-0 space-y-1.5">
            <h3 className="font-poppins font-medium text-[20px] sm:text-[22px] text-white truncate leading-snug">
              {profileName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-inter font-medium bg-[var(--accent-25)] text-[var(--primary-accent)] border border-[var(--accent-40)]">
                <Shield className="w-3 h-3" />
                <span>{getRoleDisplayName(currentRole)}</span>
              </span>

              {currentRole === 'student' && (
                <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/90">
                  <span>ID:</span>
                  <span>{rollNumberInput || user?.rollNumber || 'Not provided'}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-inter text-[var(--text-sec-80)] pt-0.5">
              <span className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[var(--text-sec-60)]">Uni:</span>
                <span className="text-white truncate">{primaryEmailInput || user?.primaryEmail || user?.email || 'Not provided'}</span>
              </span>

              <span className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="text-[var(--text-sec-60)]">Permanent:</span>
                <span className="text-white truncate">{secondaryEmailInput || user?.secondaryEmail || 'Not provided'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* User's Verified Role Details */}
        <div className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-20)] border border-[var(--accent-40)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[11px] font-inter text-[var(--text-sec-70)] uppercase tracking-wider font-semibold leading-tight">
              Assigned Role
            </span>
            <span className="font-poppins font-medium text-xs sm:text-sm text-white">
              {getRoleDisplayName(currentRole)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          SECTION 1: DUAL EMAILS & GRADUATION RECOVERY GUARANTEE
         ======================================================== */}
      <div id="section-dual-emails" className="glass-panel p-6 sm:p-7 rounded-2xl space-y-6">
        <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-poppins font-medium text-[18px] sm:text-[19px] text-white">
                Dual Email Architecture & Alumni Security
              </h3>
              <p className="font-inter text-xs text-[var(--text-secondary)]">
                Prevent loss of verified certificates and event credentials after graduating
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-inter font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alumni Recovery Guard Active</span>
          </span>
        </div>

        {/* Informational callout explaining why 2 emails are needed */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs font-inter space-y-1">
            <p className="font-medium text-white text-sm">
              Why Session Management System maintains two emails for your account:
            </p>
            <p className="text-[var(--text-sec-80)] leading-relaxed">
              When students graduate, universities frequently deactivate institutional email accounts (<span className="text-cyan-300">@university.edu.pk</span>). Your <strong className="text-white">Secondary Personal Email</strong> (Gmail, Outlook, Yahoo, etc.) permanently anchors your credentials. You can always sign in, verify, or download your official event certificates and accreditation years after graduating.
            </p>
          </div>
        </div>

        {/* Dual Email Configuration Form */}
        <form onSubmit={handleSaveEmails} noValidate className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. PRIMARY UNIVERSITY EMAIL */}
            <div className="space-y-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="profile-primary-email"
                  className="block font-inter font-medium text-xs sm:text-[13px] text-white flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Primary University Email</span>
                </label>
                <span className="text-[10px] font-inter uppercase tracking-wider text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Institutional
                </span>
              </div>

              <input
                id="profile-primary-email"
                type="email"
                value={primaryEmailInput}
                onChange={(e) => {
                  setPrimaryEmailInput(e.target.value);
                  if (emailErrors.primary) setEmailErrors((prev) => ({ ...prev, primary: undefined }));
                }}
                placeholder="student@university.edu.pk"
                className={`w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] ${
                  emailErrors.primary ? 'border-rose-400 bg-rose-950/20' : 'border-white/[0.14]'
                }`}
              />

              {emailErrors.primary ? (
                <p className="text-[11px] font-inter text-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{emailErrors.primary}</span>
                </p>
              ) : (
                <p className="text-[11px] font-inter text-[var(--text-sec-70)]">
                  Used for active semester enrollment, society elections, and internal campus verifications.
                </p>
              )}
            </div>

            {/* 2. SECONDARY PERSONAL EMAIL (PERMANENT) */}
            <div className="space-y-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="profile-secondary-email"
                  className="block font-inter font-medium text-xs sm:text-[13px] text-white flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-300" />
                  <span>Secondary Personal Email</span>
                </label>
                <span className="text-[10px] font-inter uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Post-Graduation Permanent
                </span>
              </div>

              <input
                id="profile-secondary-email"
                type="email"
                value={secondaryEmailInput}
                onChange={(e) => {
                  setSecondaryEmailInput(e.target.value);
                  if (emailErrors.secondary) setEmailErrors((prev) => ({ ...prev, secondary: undefined }));
                }}
                placeholder="your.name@gmail.com"
                className={`w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] ${
                  emailErrors.secondary ? 'border-rose-400 bg-rose-950/20' : 'border-white/[0.14]'
                }`}
              />

              {emailErrors.secondary ? (
                <p className="text-[11px] font-inter text-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{emailErrors.secondary}</span>
                </p>
              ) : (
                <p className="text-[11px] font-inter text-[var(--text-sec-70)]">
                  Personal address (Gmail / Outlook). Retains lifetime access to credentials even if uni email closes.
                </p>
              )}
            </div>
          </div>

          {/* Academic Details row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-inter font-medium text-white mb-1">
                Display Full Name
              </label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-inter font-medium text-white mb-1">
                University Roll / Reg Number
              </label>
              <input
                type="text"
                value={rollNumberInput}
                onChange={(e) => setRollNumberInput(e.target.value)}
                placeholder="Roll / Reg Number"
                className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-inter font-medium text-white mb-1">
                Department / Faculty
              </label>
              <input
                type="text"
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs font-inter text-[var(--text-sec-70)] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>You can sign in using either email at any time.</span>
            </span>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-[0.99] text-white font-inter font-medium text-xs sm:text-[13px] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {isSavedRecently ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Emails Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Email Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================
          APPEARANCE SECTION: 5 Curated Designer Themes
         ======================================================== */}
      <div id="section-appearance" className="space-y-4">
        <div
          className="flex items-center justify-between gap-2 pb-2 border-b"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[var(--primary-accent)]" />
            <h3
              className="font-poppins font-medium text-[18px] sm:text-[19px]"
              style={{ color: 'var(--text-primary)' }}
            >
              Curated Designer Themes
            </h3>
          </div>
          <span
            className="text-[11px] font-inter font-medium px-2.5 py-0.5 rounded-full border"
            style={{
              backgroundColor: 'var(--primary-accent-subtle)',
              borderColor: 'var(--primary-accent)',
              color: 'var(--primary-accent)',
            }}
          >
            5 Themes Available
          </span>
        </div>

        {/* Theme Swatches Grid: 1 col on mobile, 2 on tablet, 5 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {availableThemes.map((swatch) => {
            const isActive = activeTheme.id === swatch.id;

            return (
              <div
                key={swatch.id}
                id={`theme-swatch-${swatch.id}`}
                onClick={() => handleSwatchClick(swatch)}
                style={
                  isActive
                    ? {
                        borderColor: 'var(--primary-accent)',
                        backgroundColor: 'var(--primary-accent-subtle)',
                      }
                    : {
                        borderColor: 'var(--panel-border)',
                      }
                }
                className={`glass-panel-interactive relative p-4 rounded-2xl flex flex-col justify-between cursor-pointer border ${
                  isActive
                    ? 'ring-2 ring-[var(--primary-accent)] shadow-lg'
                    : ''
                }`}
                title={`${swatch.name} — Click to apply this theme`}
              >
                {/* Top Row: 4 Color Circles matching the combo guide + active checkmark */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* 4 Swatch Circles */}
                  <div className="flex items-center -space-x-1.5">
                    {(swatch.swatchColors || [swatch.bgStart, swatch.primary, swatch.accent, swatch.secondary]).map(
                      (c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/30 shadow-xs shrink-0"
                          style={{ backgroundColor: c }}
                          title={`Color ${i + 1}: ${c}`}
                        />
                      )
                    )}
                  </div>

                  {/* Active checkmark */}
                  <div>
                    {isActive ? (
                      <span
                        className="w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: 'var(--primary-accent)' }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                    )}
                  </div>
                </div>

                {/* Bottom: Theme Name + Vibe + Category */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="font-poppins font-semibold text-[13px] sm:text-[14px] truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {swatch.number}. {swatch.name}
                    </span>
                    {isActive && (
                      <span
                        className="text-[10px] font-inter px-1.5 py-0.2 rounded-full font-semibold shrink-0"
                        style={{
                          backgroundColor: 'var(--primary-accent-subtle)',
                          color: 'var(--primary-accent)',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>

                  <p
                    className="text-[11px] font-inter truncate"
                    style={{ color: 'var(--primary-accent)' }}
                  >
                    {swatch.vibe}
                  </p>
                  <p
                    className="text-[10px] font-mono truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {swatch.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          SECTION: STORAGE & DEMO DATA ENGINE
          IndexedDB client-side persistence & 1-click factory reset
         ======================================================== */}
      <div id="section-storage" className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--primary-accent)]" />
            <h3 className="font-poppins font-medium text-[18px] sm:text-[19px] text-white">
              Data & Storage Management
            </h3>
          </div>
          <span className="text-[11px] font-inter text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            IndexedDB Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: IndexedDB Offline Storage */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-15)] text-[var(--primary-accent)] flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-poppins font-semibold text-sm text-white">Client-Side File Vault</h4>
                  <p className="text-[11px] text-[var(--text-sec-70)]">High-capacity browser IndexedDB storage</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-inter">
              Payment slips and uploaded receipts are automatically compressed via HTML5 Canvas and saved in IndexedDB. This eliminates the 5MB browser quota crash and ensures receipts remain permanently available across page reloads.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              <div>
                <span className="text-[var(--text-sec-60)] block text-[10px] uppercase font-mono">Cached Documents</span>
                <span className="font-semibold text-white font-mono text-sm">{storageStats.fileCount} file(s)</span>
              </div>
              <div className="text-right">
                <span className="text-[var(--text-sec-60)] block text-[10px] uppercase font-mono">Estimated Storage</span>
                <span className="font-semibold text-emerald-400 font-mono text-sm">
                  {Math.round(storageStats.totalEstimatedBytes / 1024)} KB
                </span>
              </div>
            </div>

            {storageStats.fileCount > 0 && (
              <button
                type="button"
                onClick={handleClearOfflineFiles}
                className="w-full py-2 px-3 rounded-xl border border-white/[0.12] hover:bg-white/[0.08] text-xs text-white/80 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Cached Slips ({storageStats.fileCount})</span>
              </button>
            )}
          </div>

          {/* Card 2: 1-Click Demo Reset */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 border border-amber-500/20 bg-amber-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-poppins font-semibold text-sm text-white">Reset Demo Environment</h4>
                  <p className="text-[11px] text-amber-300/80">Restore factory demonstration state</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                1-Click Reset
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-inter">
              Testing forms, registrations, or payment slip workflows? Resetting clears test submissions, purges IndexedDB cache, and restores default sessions, certificates, and mock registrants.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo Data to Initial State</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Demo Data */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset All Demo Data?"
        message="This will clear all uploaded receipt files from IndexedDB and restore all events, sessions, registrations, certificates, and user roles back to their default demo state. This action cannot be undone."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        variant="danger"
        isProcessing={isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
