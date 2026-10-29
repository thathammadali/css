import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Palette,
  Server,
} from 'lucide-react';
import { UserRole, FormErrors } from '../types';
import { identifyRoleFromEmail } from '../utils/roleUtils';
import { userService } from '../services/userService';
import { authApi } from '../services/apiClient';
import { BackendConnectionModal } from './BackendConnectionModal';
import { useTheme } from '../context/ThemeContext';
import { THEME_SWATCHES, THEME_STORAGE_KEY, applyThemeToDocument } from '../data/themes';
import { DEMO_MODE } from '../config';
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_NAME_MESSAGE,
  INVALID_ROLL_NUMBER_MESSAGE,
  isValidEmail,
  isValidName,
  isValidRollNumber,
} from '../utils/validators';

interface LoginPageProps {
  onSuccessLogin: (
    user: {
      name: string;
      email: string;
      role: UserRole;
      primaryEmail?: string;
      secondaryEmail?: string;
      isBackendConnected?: boolean;
    },
    isNewSignup?: boolean
  ) => void;
  onNavigateToSignup?: () => void;
  onNavigateToSessions: () => void;
  onNavigateToAbout: () => void;
  onForgotPassword: (email: string) => void;
  initialMode?: 'signin' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccessLogin,
  onNavigateToSessions,
  onNavigateToAbout,
  onForgotPassword,
  initialMode = 'signin',
}) => {
  const { activeTheme, setTheme } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [accountType, setAccountType] = useState<'student' | 'guest'>('student');
  const [showTunnelModal, setShowTunnelModal] = useState(false);
  const [tunnelLive, setTunnelLive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    authApi.checkHealth().then((res) => {
      if (mounted) {
        setTunnelLive(res.ok);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('Software Engineering');
  const [affiliation, setAffiliation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Automatically detected role for email
  const detectedRole = identifyRoleFromEmail(email);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (authMode === 'signup') {
      const trimmedName = name.trim();
      if (!isValidName(trimmedName)) newErrors.name = INVALID_NAME_MESSAGE;

      // Student-specific signup fields
      if (accountType === 'student') {
        const trimmedRoll = rollNumber.trim();
        if (!isValidRollNumber(trimmedRoll)) newErrors.rollNumber = INVALID_ROLL_NUMBER_MESSAGE;
        if (!department.trim()) {
          newErrors.department = 'Academic department is required.';
        }
      } else if (accountType === 'guest') {
        const trimmedAff = affiliation.trim();
        if (!trimmedAff) {
          newErrors.affiliation = 'Company, university, or organization affiliation is required.';
        }
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!isValidEmail(trimmedEmail)) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (authMode === 'signup') {
      if (secondaryEmail.trim()) {
        const trimmedSecondary = secondaryEmail.trim();
        if (!isValidEmail(trimmedSecondary)) {
          newErrors.secondaryEmail = INVALID_EMAIL_MESSAGE;
        } else if (trimmedSecondary.toLowerCase() === trimmedEmail.toLowerCase()) {
          newErrors.secondaryEmail = 'Secondary email must differ from primary email.';
        }
      }
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (authMode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Confirm your password.';
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.auth;
      return copy;
    });
    setSuccessMessage('');

    if (authMode === 'signin') {
      const normalizedEmail = email.trim().toLowerCase();

      try {
        // Authenticate using backend tunnel (OAuth2 form-urlencoded: username=email&password=...)
        // followed by GET /auth/me with Bearer token, with seamless local fallback
        const authResult = await authApi.login(normalizedEmail, password);

        if (!authResult.success) {
          setErrors((prev) => ({
            ...prev,
            auth: authResult.error || 'Authentication rejected: Invalid credentials.',
          }));
          setIsSubmitting(false);
          return;
        }

        // Credentials successfully verified
        setSuccessMessage(
          authResult.isBackendConnected
            ? (import.meta.env.DEV ? 'Backend Tunnel verified! Signing in...' : 'Signing in...')
            : 'Signed in via Offline / Mock Mode (local fallback)...'
        );
        setTimeout(() => {
          setIsSubmitting(false);
          const authedUser = authResult.user!;
          onSuccessLogin({
            name: authedUser.name,
            email: authedUser.primaryEmail || authedUser.secondaryEmail || normalizedEmail,
            primaryEmail: authedUser.primaryEmail || normalizedEmail,
            secondaryEmail: authedUser.secondaryEmail,
            role: authedUser.role,
            isBackendConnected: Boolean(authResult.isBackendConnected),
          });
        }, 400);
      } catch (err: any) {
        setErrors((prev) => ({
          ...prev,
          auth: err?.message || 'Authentication error. Please try again.',
        }));
        setIsSubmitting(false);
      }
    } else {
      // Sign up flow
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const existingAccount = userService.findUserByEmail(normalizedEmail);
        if (existingAccount) {
          setErrors((prev) => ({
            ...prev,
            email: 'An account with this email address already exists. Please sign in instead.',
          }));
          setIsSubmitting(false);
          return;
        }

        // Register through authApi (JSON POST /auth/signup to backend endpoint, with local mirror)
        const regResult = await authApi.register({
          name: name.trim(),
          primaryEmail: normalizedEmail,
          secondaryEmail:
            accountType === 'student'
              ? secondaryEmail.trim()
              : secondaryEmail.trim() || undefined,
          accountType,
          affiliation: accountType === 'guest' ? affiliation.trim() : undefined,
          department: accountType === 'student' ? department.trim() : undefined,
          rollNumber: accountType === 'student' ? rollNumber.trim() : undefined,
          password,
        });

        if (!regResult.success || !regResult.user) {
          setErrors((prev) => ({
            ...prev,
            auth: regResult.error || 'Server rejected registration. Please check inputs.',
          }));
          setIsSubmitting(false);
          return;
        }

        const createdAccount = regResult.user;
        setSuccessMessage(
          regResult.isBackendConnected
            ? (import.meta.env.DEV ? 'Account registered on Backend Tunnel! Redirecting to dashboard...' : 'Account registered! Redirecting to dashboard...')
            : 'Registered in Offline / Mock Mode! Redirecting to dashboard...'
        );
        setTimeout(() => {
          setIsSubmitting(false);
          onSuccessLogin(
            {
              name: createdAccount.name,
              email: createdAccount.primaryEmail,
              primaryEmail: createdAccount.primaryEmail,
              secondaryEmail: createdAccount.secondaryEmail,
              role: createdAccount.role,
              isBackendConnected: Boolean(regResult.isBackendConnected),
            },
            true
          );
        }, 400);
      } catch (err: any) {
        setErrors((prev) => ({
          ...prev,
          auth: err?.message || 'Failed to complete registration.',
        }));
        setIsSubmitting(false);
      }
    }
  };

  const handleInputChange = (field: string, val: string) => {
    if (field === 'name') setName(val);
    if (field === 'email') setEmail(val);
    if (field === 'secondaryEmail') setSecondaryEmail(val);
    if (field === 'rollNumber') setRollNumber(val);
    if (field === 'department') setDepartment(val);
    if (field === 'affiliation') setAffiliation(val);
    if (field === 'password') setPassword(val);
    if (field === 'confirmPassword') setConfirmPassword(val);

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      delete copy.auth;
      if (field === 'email' && val.trim() && !isValidEmail(val)) {
        copy.email = INVALID_EMAIL_MESSAGE;
      }
      if (field === 'secondaryEmail' && val.trim() && !isValidEmail(val)) {
        copy.secondaryEmail = INVALID_EMAIL_MESSAGE;
      }
      return copy;
    });
  };

  const fillDemoAccount = (role: 'super_admin' | 'admin' | 'student' | 'guest') => {
    setAuthMode('signin');
    setErrors({});
    if (role === 'super_admin') {
      setEmail('dean.taylor@university.edu.pk');
      setPassword('dean1234');
    } else if (role === 'admin') {
      setEmail('admin@university.edu.pk');
      setPassword('admin123');
    } else if (role === 'student') {
      setEmail('student@university.edu.pk');
      setPassword('student123');
    } else {
      setEmail('sarah.connor@industrytech.io');
      setPassword('guest123');
    }
  };

  return (
    <div
      id="login-page-theme-container"
      className="relative w-full min-h-[100dvh] md:h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 md:py-4 lg:px-8 overflow-x-hidden md:overflow-hidden bg-[var(--bg-start)] text-white transition-colors duration-500"
    >
      {/* ========================================================
          DYNAMIC AMBIENT GLOWS & ORBS (Reflecting Active Theme)
         ======================================================== */}
      {/* Glowing light orb 1 - Top Left */}
      <div
        className="absolute top-10 left-10 w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 opacity-25"
        style={{ background: 'var(--primary-accent)' }}
      />
      {/* Glowing light orb 2 - Center Right */}
      <div
        className="absolute top-1/3 right-10 w-[460px] h-[460px] rounded-full blur-[120px] pointer-events-none transition-all duration-700 opacity-20"
        style={{ background: 'var(--theme-secondary, var(--primary-accent))' }}
      />
      {/* Glowing light orb 3 - Bottom Center */}
      <div
        className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full blur-[110px] pointer-events-none transition-all duration-700 opacity-25"
        style={{ background: 'var(--bg-end)' }}
      />
      {/* Subtle warm accent orb */}
      <div
        className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none transition-all duration-700 opacity-15"
        style={{ background: 'var(--primary-accent)' }}
      />

      {/* Top Bar: View Sessions, About, and Theme Switcher */}
      <div className="w-full max-w-4xl mb-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToSessions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.12] hover:bg-white/[0.22] border border-white/[0.24] text-white text-xs font-inter font-medium transition-all duration-200 cursor-pointer backdrop-blur-xl shadow-lg active:scale-95"
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>View Sessions</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/70" />
          </button>

          <button
            type="button"
            onClick={onNavigateToAbout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.10] hover:bg-white/[0.18] border border-white/[0.20] text-white/90 hover:text-white text-xs font-inter font-medium transition-all duration-200 cursor-pointer backdrop-blur-xl shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>About</span>
          </button>

          {import.meta.env.DEV && (
            <>
          <button
            type="button"
            onClick={() => setShowTunnelModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 hover:text-white text-xs font-inter font-medium transition-all duration-200 cursor-pointer backdrop-blur-xl shadow-md active:scale-95"
            title="Configure Backend Tunnel & Copy Preview Origin for CORS"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tunnel & Origin</span>
            <span className="sm:hidden">Tunnel</span>
          </button>

          {tunnelLive === true ? (
            <div
              id="login-tunnel-live-badge"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-inter font-medium backdrop-blur-xl shadow-xs"
              title="Cloudflare Tunnel Connected: Real authentication active"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Backend Live</span>
            </div>
          ) : tunnelLive === false ? (
            <div
              id="login-tunnel-offline-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-inter font-medium backdrop-blur-xl shadow-xs"
              title="Tunnel unreachable: App will fall back to local offline mock data"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Offline / Mock Mode</span>
            </div>
          ) : null}
            </>
          )}
        </div>

        {/* Quick Theme Switcher on Login Page */}
        <div className="relative" ref={themeRef}>
          <button
            id="btn-login-theme-picker"
            type="button"
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.10] hover:bg-white/[0.20] border border-white/[0.22] text-white text-xs font-inter font-medium transition-all cursor-pointer backdrop-blur-xl shadow-md active:scale-95"
            title="Switch Colour Combo"
          >
            <Palette className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span className="hidden sm:inline">Theme: {activeTheme.name}</span>
            <span className="sm:hidden">Theme</span>
          </button>

          {showThemePicker && (
            <div
              id="login-theme-picker-panel"
              style={{ backgroundColor: 'var(--bg-end-90)' }}
              className="absolute right-0 mt-2 w-[310px] sm:w-[380px] rounded-2xl border border-white/[0.18] shadow-2xl backdrop-blur-xl p-3.5 z-50 text-left animate-fadeIn max-h-[460px] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.12] px-1">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--primary-accent)]" />
                  <span className="font-poppins font-semibold text-sm text-white">
                    Designer Colour Combos
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--primary-accent)] bg-white/10 px-2 py-0.5 rounded-full font-bold">
                  {THEME_SWATCHES.length} Themes
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-sec-80)] mb-3 px-1 leading-relaxed">
                Click any combo to transform the entire app in real time!
              </p>

              <div className="grid grid-cols-2 gap-2">
                {THEME_SWATCHES.map((swatch) => {
                  const isActive = activeTheme.id === swatch.id;
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => {
                        setTheme(swatch);
                        applyThemeToDocument(swatch);
                        try {
                          localStorage.setItem(THEME_STORAGE_KEY, swatch.id);
                        } catch {}
                        setShowThemePicker(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 group ${
                        isActive
                          ? 'border-[var(--primary-accent)] bg-white/[0.12] shadow-md ring-1 ring-[var(--primary-accent)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center -space-x-1">
                          {(swatch.swatchColors || [swatch.bgStart, swatch.primary, swatch.accent, swatch.secondary]).map((color, cIdx) => (
                            <span
                              key={cIdx}
                              className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs inline-block"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-sec-70)] group-hover:text-white">
                          #{swatch.number}
                        </span>
                      </div>
                      <div>
                        <span className="block font-poppins font-semibold text-xs text-white truncate">
                          {swatch.name}
                        </span>
                        <span className="block font-inter text-[10px] text-[var(--text-sec-70)] truncate">
                          {swatch.vibe}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          AUTHENTIC GLASSMORPHISM CARD CONTAINER
         ======================================================== */}
      <div
        id="login-glass-card"
        className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/[0.22] overflow-hidden backdrop-blur-3xl transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.03) 100%)',
          boxShadow: `
            inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.35),
            inset 0 -1px 1px 0 rgba(255, 255, 255, 0.08),
            0 24px 64px -12px rgba(0, 0, 0, 0.65),
            0 0 40px var(--accent-20, rgba(255, 255, 255, 0.05))
          `,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* ========================================================
              LEFT COLUMN: Welcome Back & Tagline
             ======================================================== */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/[0.16] relative bg-white/[0.03]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.10] border border-white/[0.20] text-[11px] font-inter text-[var(--primary-accent)] backdrop-blur-md shadow-sm">
                <Sparkles className="w-3 h-3 text-[var(--primary-accent)]" />
                <span>Session Management System</span>
              </div>

              {/* Large Welcome Back Typography */}
              <h1 className="font-poppins font-semibold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1] drop-shadow-sm">
                Welcome <br />
                Back
              </h1>

              <p className="font-inter text-xs text-white/60 leading-relaxed max-w-xs">
                Log in to discover sessions, join live meetings, submit vouchers, and claim verified credentials.
              </p>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: Underline Dividers, Minimal Fields & Sign In/Up
             ======================================================== */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-black/[0.12] backdrop-blur-xl">
            {/* Top Distinct Horizontal Lines and Header */}
            <div className="mb-6">
              <div className="w-full border-t border-white/[0.35]" />

              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrors({});
                    }}
                    className={`font-poppins font-semibold text-lg sm:text-xl tracking-widest uppercase transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    SIGN IN
                  </button>

                  <span className="text-white/30 text-sm">/</span>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrors({});
                    }}
                    className={`font-poppins font-semibold text-lg sm:text-xl tracking-widest uppercase transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    SIGN UP
                  </button>
                </div>

                <span className="text-[11px] font-mono text-[var(--primary-accent)]">
                  {authMode === 'signin' ? 'Portal Access' : 'New Member'}
                </span>
              </div>

              <div className="w-full border-t border-white/[0.35]" />
            </div>

            {/* If Sign Up: Account Type Selector */}
            {authMode === 'signup' && (
              <div className="mb-4 flex items-center gap-2 p-1 rounded-xl bg-white/[0.08] border border-white/[0.16] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('student');
                    setErrors({});
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-inter font-medium transition-all cursor-pointer ${
                    accountType === 'student'
                      ? 'bg-white/25 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  🎓 University Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('guest');
                    setErrors({});
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-inter font-medium transition-all cursor-pointer ${
                    accountType === 'guest'
                      ? 'bg-white/25 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  🌐 Guest Participant
                </button>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {errors.auth && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errors.auth}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Name Field (Sign Up Only) */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label
                    htmlFor="auth-name"
                    className="block font-inter text-[12px] text-white/90"
                  >
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={100}
                    placeholder={accountType === 'student' ? 'e.g. Jordan Lee' : 'e.g. Dr. Sarah Connor'}
                    className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Student Only Signup Fields: Roll Number & Department */}
              {authMode === 'signup' && accountType === 'student' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="auth-roll"
                      className="block font-inter text-[12px] text-white/90"
                    >
                      Roll Number / Reg ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="auth-roll"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      maxLength={15}
                      placeholder="e.g. 202442"
                      className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                    />
                    {errors.rollNumber && (
                      <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.rollNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="auth-dept"
                      className="block font-inter text-[12px] text-white/90"
                    >
                      Department <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="auth-dept"
                      type="text"
                      value={department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="e.g. Software Engineering"
                      className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                    />
                    {errors.department && (
                      <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.department}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Only Signup Field: Organization / Affiliation */}
              {authMode === 'signup' && accountType === 'guest' && (
                <div className="space-y-1">
                  <label
                    htmlFor="auth-affiliation"
                    className="block font-inter text-[12px] text-white/90"
                  >
                    Organization / Company Affiliation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="auth-affiliation"
                    type="text"
                    value={affiliation}
                    onChange={(e) => handleInputChange('affiliation', e.target.value)}
                    placeholder="e.g. Autonomous Robotics Labs Inc. / External Guest"
                    className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                  />
                  {errors.affiliation && (
                    <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.affiliation}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Email Address Field (Underline input) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-email"
                    className="block font-inter text-[12px] text-white/90"
                  >
                    {authMode === 'signup' && accountType === 'student' ? 'University Primary Email' : 'Email Address'} <span className="text-rose-400">*</span>
                  </label>
                  {authMode === 'signin' && email.trim().includes('@') && (
                    <span className="text-[10px] font-mono text-[var(--primary-accent)] flex items-center gap-1">
                      <span>{detectedRole.badgeEmoji}</span>
                      <span>{detectedRole.roleDisplayName}</span>
                    </span>
                  )}
                </div>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => {
                    if (!isValidEmail(email)) setErrors((prev) => ({ ...prev, email: INVALID_EMAIL_MESSAGE }));
                  }}
                  maxLength={254}
                  placeholder={
                    authMode === 'signup'
                      ? accountType === 'student'
                        ? 'e.g. student@university.edu.pk'
                        : 'e.g. sarah.connor@industrytech.io'
                      : 'e.g. student@university.edu.pk or your email'
                  }
                  className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                />
                {errors.email && (
                  <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Optional secondary email */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-sec-email"
                      className="block font-inter text-[12px] text-white/90"
                    >
                      Backup Personal Email (Optional)
                    </label>
                    <span className="text-[10px] text-[var(--text-sec-80)]">
                      Must differ from primary
                    </span>
                  </div>
                  <input
                    id="auth-sec-email"
                    type="email"
                    value={secondaryEmail}
                    onChange={(e) => handleInputChange('secondaryEmail', e.target.value)}
                    onBlur={() => {
                      if (secondaryEmail.trim() && !isValidEmail(secondaryEmail)) {
                        setErrors((prev) => ({ ...prev, secondaryEmail: INVALID_EMAIL_MESSAGE }));
                      }
                    }}
                    maxLength={254}
                    placeholder="e.g. personal.recovery@gmail.com"
                    className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                  />
                  {errors.secondaryEmail && (
                    <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.secondaryEmail}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Password Field (Underline input) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block font-inter text-[12px] text-white/90"
                  >
                    Password
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => onForgotPassword(email || 'your email')}
                      className="text-[11px] font-inter text-[var(--primary-accent)] hover:text-white transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-10 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password (Sign up only) */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label
                    htmlFor="auth-confirm-password"
                    className="block font-inter text-[12px] text-white/90"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.06] rounded-xl border border-white/[0.35] focus:border-white focus:outline-none pl-3 pr-3 py-2 text-white placeholder-white/35 text-sm font-inter transition-colors"
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Themed Button [ SIGN IN ] */}
              <div className="pt-2">
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="px-8 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 border border-white/[0.30] text-white font-semibold text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-xl disabled:opacity-50"
                  style={{
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 6px 20px var(--accent-30, rgba(0, 0, 0, 0.25))',
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>PROCESSING...</span>
                    </span>
                  ) : authMode === 'signin' ? (
                    'SIGN IN'
                  ) : (
                    'SIGN UP'
                  )}
                </button>
              </div>

              {/* Bottom decorative underline lines */}
              <div className="space-y-3 pt-1">
                <div className="w-full border-t border-white/[0.30]" />
                <div className="w-full border-t border-white/[0.30]" />
              </div>
            </form>

            {/* Quick Demo Role Accounts (Instant 1-Click Testing) */}
            {DEMO_MODE && (
              <div className="mt-5 pt-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="block text-[10px] font-mono text-[var(--text-sec-80)] uppercase tracking-wider">
                    Demo Accounts
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/35">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Offline / Mock
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('super_admin')}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.16] text-left transition-colors cursor-pointer backdrop-blur-md"
                  >
                    <span className="block text-[11px] font-medium text-amber-300">
                      👑 Super Admin
                    </span>
                    <span className="block text-[9px] font-mono text-white/70 truncate">
                      dean.taylor@uni...
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('admin')}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.16] text-left transition-colors cursor-pointer backdrop-blur-md"
                  >
                    <span className="block text-[11px] font-medium text-purple-300">
                      🛡️ Admin
                    </span>
                    <span className="block text-[9px] font-mono text-white/70 truncate">
                      admin@uni...
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('student')}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.16] text-left transition-colors cursor-pointer backdrop-blur-md"
                  >
                    <span className="block text-[11px] font-medium text-[var(--primary-accent)]">
                      🎓 Student
                    </span>
                    <span className="block text-[9px] font-mono text-white/70 truncate">
                      student@uni...
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('guest')}
                    className="px-2 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.16] text-left transition-colors cursor-pointer backdrop-blur-md"
                  >
                    <span className="block text-[11px] font-medium text-cyan-300">
                      🌐 Guest
                    </span>
                    <span className="block text-[9px] font-mono text-white/70 truncate">
                      sarah.connor@...
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Toggle footer text */}
            <div className="mt-4 text-center">
              {authMode === 'signin' ? (
                <p className="font-inter text-xs text-white/80">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrors({});
                    }}
                    className="font-semibold text-white underline hover:text-[var(--primary-accent)] transition-colors cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="font-inter text-xs text-white/80">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrors({});
                    }}
                    className="font-semibold text-white underline hover:text-[var(--primary-accent)] transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {import.meta.env.DEV && (
      <BackendConnectionModal
        isOpen={showTunnelModal}
        onClose={() => setShowTunnelModal(false)}
      />
      )}
    </div>
  );
};
