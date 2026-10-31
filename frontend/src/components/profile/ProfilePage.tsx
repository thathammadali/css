import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Palette,
  Check,
  Mail,
  LogOut,
  Building2,
  Save,
  CheckCircle2,
  User,
  Phone,
  Briefcase,
  Hash,
} from 'lucide-react';
import { DashboardRole, AuthUser, ThemeSwatch } from '../../types';
import { THEME_STORAGE_KEY, applyThemeToDocument } from '../../data/themes';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch, authApi } from '../../services/apiClient';
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_PHONE_MESSAGE,
  isValidEmail,
  isValidPhone,
} from '../../utils/validators';

export interface ProfilePageProps {
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
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'U';
  };

  const [fullName, setFullName] = useState(user?.name || '');
  const [primaryEmail, setPrimaryEmail] = useState(user?.primaryEmail || user?.email || '');
  const [secondaryEmail, setSecondaryEmail] = useState(user?.secondaryEmail || '');
  const [positionTitle, setPositionTitle] = useState('');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [institution, setInstitution] = useState(user?.institutionAffiliation || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPrimaryEmail(user.primaryEmail || user.email || '');
      setSecondaryEmail(user.secondaryEmail || '');
      setRollNumber(user.rollNumber || '');
      setDepartment(user.department || '');
      setPhone(user.phone || '');
      setInstitution(user.institutionAffiliation || '');
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    apiFetch('/auth/me')
      .then(async (res) => {
        if (!res.ok || !active) return;
        const me = await res.json().catch(() => null);
        if (!me || !active) return;
        if (me.full_name !== undefined) setFullName(me.full_name || '');
        if (me.primary_email !== undefined) setPrimaryEmail(me.primary_email || '');
        if (me.secondary_email !== undefined) setSecondaryEmail(me.secondary_email || '');
        setPositionTitle(me.position_title || '');
        setRollNumber(me.roll_number || '');
        setDepartment(me.department || '');
        setPhone(me.phone || '');
        setInstitution(me.institution || '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.email]);

  const profileName = fullName || user?.name || 'User';
  const initials = getInitials(profileName);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secondaryEmail.trim() && !isValidEmail(secondaryEmail)) {
      onNotify(INVALID_EMAIL_MESSAGE);
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      onNotify(INVALID_PHONE_MESSAGE);
      return;
    }
    setIsSaving(true);
    try {
      const updatedAccount = await authApi.updateProfile({
        positionTitle: positionTitle.trim(),
        rollNumber: rollNumber.trim(),
        department: department.trim(),
        phone: phone.trim(),
        institution: institution.trim(),
      });

      if (onUpdateUser) {
        const updatedAuthUser: AuthUser = {
          ...(user || {
            name: updatedAccount.name,
            email: updatedAccount.primaryEmail,
            role: updatedAccount.role,
            isLoggedIn: true,
          }),
          name: updatedAccount.name || fullName,
          email: updatedAccount.primaryEmail || primaryEmail,
          primaryEmail: updatedAccount.primaryEmail || primaryEmail,
          secondaryEmail: updatedAccount.secondaryEmail || secondaryEmail || undefined,
          rollNumber: updatedAccount.rollNumber,
          department: updatedAccount.department,
          phone: phone.trim() || undefined,
          institutionAffiliation: institution.trim() || updatedAccount.institutionAffiliation || undefined,
        };
        onUpdateUser(updatedAuthUser);
      }

      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 3000);
      onNotify('Profile saved successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      onNotify(message);
    } finally {
      setIsSaving(false);
    }
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
    } catch {}
    onNotify(`Active theme set to "${theme.name}".`);
  };

  return (
    <div id="profile-page-container" className="w-full space-y-7 animate-fadeIn max-w-6xl xl:max-w-7xl mx-auto pb-12">
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
              Update your academic and institutional profile details
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-3.5 py-1.5 rounded-2xl bg-white/[0.06] hover:bg-rose-950/40 border border-white/[0.12] hover:border-rose-500/40 text-[var(--text-secondary)] hover:text-rose-200 font-inter text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>

      <div
        id="profile-top-glass-card"
        className="glass-panel p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/25 flex items-center justify-center text-white font-poppins font-medium text-xl sm:text-2xl shadow-lg shrink-0"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.accent} 0%, ${activeTheme.bgEnd} 100%)`,
            }}
          >
            {initials}
          </div>

          <div className="min-w-0 space-y-1.5">
            <h3 className="font-poppins font-medium text-[20px] sm:text-[22px] text-white truncate leading-snug">
              {profileName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-inter font-medium bg-[var(--accent-25)] text-[var(--primary-accent)] border border-[var(--accent-40)]">
                <Shield className="w-3 h-3" />
                <span>{getRoleDisplayName(currentRole)}</span>
              </span>

              {rollNumber && (
                <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/90">
                  <span>ID:</span>
                  <span>{rollNumber}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-inter text-[var(--text-sec-80)] pt-0.5">
              <span className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[var(--text-sec-60)]">Primary:</span>
                <span className="text-white truncate">{primaryEmail || 'Not provided'}</span>
              </span>

              {secondaryEmail && (
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="text-[var(--text-sec-60)]">Secondary:</span>
                  <span className="text-white truncate">{secondaryEmail}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-20)] border border-[var(--accent-40)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
            <User className="w-4 h-4" />
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

      <div id="section-profile-details" className="glass-panel p-6 sm:p-7 rounded-2xl space-y-6">
        <div className="border-b border-white/[0.08] pb-4">
          <h3 className="font-poppins font-medium text-[18px] sm:text-[19px] text-white">
            Profile Details
          </h3>
          <p className="font-inter text-xs text-[var(--text-secondary)]">
            Changes are saved directly to your account via the backend profile service.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-position-title"
                className="block text-xs font-inter font-medium text-white flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>Position / Title</span>
              </label>
              <input
                id="profile-position-title"
                type="text"
                maxLength={100}
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g. Student, Society Secretary, Faculty Advisor"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-roll-number"
                className="block text-xs font-inter font-medium text-white flex items-center gap-1.5"
              >
                <Hash className="w-3.5 h-3.5 text-amber-300" />
                <span>Roll / Registration Number</span>
              </label>
              <input
                id="profile-roll-number"
                type="text"
                maxLength={30}
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 2024-CS-042"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-department"
                className="block text-xs font-inter font-medium text-white flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Department / Faculty</span>
              </label>
              <input
                id="profile-department"
                type="text"
                maxLength={100}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-phone"
                className="block text-xs font-inter font-medium text-white flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-purple-300" />
                <span>Phone Number</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +92 300 1234567"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="profile-institution"
                className="block text-xs font-inter font-medium text-white flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>Institution</span>
              </label>
              <input
                id="profile-institution"
                type="text"
                maxLength={150}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. University of Engineering & Technology"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-inter font-medium text-xs sm:text-[13px] transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {isSavedRecently ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

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
            {availableThemes.length} Themes Available
          </span>
        </div>

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
                  isActive ? 'ring-2 ring-[var(--primary-accent)] shadow-lg' : ''
                }`}
                title={`${swatch.name} — Click to apply this theme`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center -space-x-1.5">
                    {(swatch.swatchColors || [swatch.bgStart, swatch.primary, swatch.accent, swatch.secondary]).map(
                      (c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/30 shadow-xs shrink-0"
                          style={{ backgroundColor: c }}
                        />
                      )
                    )}
                  </div>

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

                  <p className="text-[11px] font-inter truncate" style={{ color: 'var(--primary-accent)' }}>
                    {swatch.vibe}
                  </p>
                  <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                    {swatch.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
