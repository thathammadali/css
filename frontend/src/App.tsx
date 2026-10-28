/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundGradients } from './components/BackgroundGradients';
import { Navigation } from './components/Navigation';
import { TopAppBar } from './components/TopAppBar';
import { HomeDashboard } from './components/HomeDashboard';
import { SessionsManager } from './components/sessions/SessionsManager';
import { LoginPage } from './components/LoginPage';
import { AboutAppPage } from './components/AboutAppPage';
import { SemsLogo } from './components/SemsLogo';
import { StatusToast } from './components/StatusToast';
import { FormBuilderPage } from './components/forms/FormBuilderPage';
import { PaymentReviewPage } from './components/reviews/PaymentReviewPage';
import { CertificatesPage } from './components/certificates/CertificatesPage';
import { UsersPage } from './components/users/UsersPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { parseHash, isRouteProtected, getRequiredRoleForRoute } from './utils/router';
import { useTheme } from './context/ThemeContext';
import {
  Screen,
  UserRole,
  AuthUser,
  DashboardRole,
  NavTab,
  SessionItem,
  EventItem,
  RegistrantItem,
  CertificateItem,
  RegistrationFormConfig,
} from './types';
import { INITIAL_REGISTRANTS } from './data/mockRegistrations';
import { INITIAL_CERTIFICATES } from './data/mockCertificates';
import { DEFAULT_REGISTRATION_FORM } from './data/mockForms';
import { getRoleDisplayName, identifyRoleFromEmail } from './utils/roleUtils';
import { DEMO_MODE } from './config';
import { userService } from './services/userService';
import { eventService } from './services/eventService';
import { formService } from './services/formService';
import { apiFetch, eventsApi, getStoredAuthToken, setStoredAuthToken } from './services/apiClient';

const STORAGE_LOGIN_KEY = 'sems_is_logged_in';
const STORAGE_REGISTRANTS_KEY = 'sems_registrants';
const STORAGE_CERTIFICATES_KEY = 'sems_certificates';
const STORAGE_ACTIVE_SESSION_KEY = 'sems_active_session';
const STORAGE_ACTIVE_TAB_KEY = 'sems_active_tab';
const STORAGE_ACTIVE_SCREEN_KEY = 'sems_active_screen';

export default function App() {
  // User auth state with lazy initializers from localStorage (F5 survival)
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
      const isLoggedIn = localStorage.getItem(STORAGE_LOGIN_KEY) === 'true';
      if (isLoggedIn && savedSession) {
        const parsedUser: AuthUser = JSON.parse(savedSession);
        if (parsedUser && (parsedUser.email || parsedUser.primaryEmail)) {
          if (!DEMO_MODE && !parsedUser.isBackendConnected) return null;
          if (parsedUser.isBackendConnected && !getStoredAuthToken()) return null;
          return parsedUser;
        }
      }
    } catch {
      // safe fallback
    }
    return null;
  });

  const [currentRole, setCurrentRole] = useState<DashboardRole>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
      const isLoggedIn = localStorage.getItem(STORAGE_LOGIN_KEY) === 'true';
      if (isLoggedIn && savedSession) {
        const parsedUser: AuthUser = JSON.parse(savedSession);
        if (parsedUser && (parsedUser.email || parsedUser.primaryEmail)) {
          if (!DEMO_MODE && !parsedUser.isBackendConnected) return 'guest';
          if (parsedUser.isBackendConnected) {
            return getStoredAuthToken() ? ((parsedUser.role as DashboardRole) || 'student') : 'guest';
          }
          const identified = identifyRoleFromEmail(parsedUser.primaryEmail || parsedUser.email);
          return identified.dashboardRole;
        }
      }
    } catch {
      // safe fallback
    }
    return 'guest';
  });

  // Main screen routing (Synchronized with window.location.hash)
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [targetEventId, setTargetEventId] = useState<string | null>(null);
  const [targetCertificateId, setTargetCertificateId] = useState<string | null>(null);
  const [isVerifyMode, setIsVerifyMode] = useState<boolean>(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global theme
  const { activeTheme, setTheme } = useTheme();

  // Authoritative Event hierarchy state: Event -> Multiple Sessions
  const [events, setEvents] = useState<EventItem[]>(() => eventService.getEvents());

  // Live events from the backend. Re-runs on login/logout, when the tab regains focus, and every 60 s.
  useEffect(() => {
    let isMounted = true;
    const load = () =>
      eventService.refreshFromBackend().then((ok) => {
        if (ok && isMounted) setEvents(eventService.getEvents());
      });
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);
    const timer = window.setInterval(load, 60000);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', load);
      window.clearInterval(timer);
    };
  }, [user?.primaryEmail]);

  // Derived visible events & sessions respecting Event lifecycle states
  const visibleEvents = useMemo(() => {
    return eventService.getVisibleEvents(currentRole);
  }, [events, currentRole]);

  const sessions = useMemo(() => {
    return visibleEvents.flatMap((e) => e.sessions);
  }, [visibleEvents]);

  // Shared registrations state with localStorage persistence
  const [registrants, setRegistrants] = useState<RegistrantItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REGISTRANTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load registrants from localStorage', e);
    }
    return DEMO_MODE ? INITIAL_REGISTRANTS : [];
  });

  // Shared certificates state with localStorage persistence
  const [certificates, setCertificates] = useState<CertificateItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CERTIFICATES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load certificates from localStorage', e);
    }
    return DEMO_MODE ? INITIAL_CERTIFICATES : [];
  });

  // Dynamic Registration Form Configuration configured by Head/Admin (Preserved across versions)
  const [formConfig, setFormConfig] = useState<RegistrationFormConfig>(() => formService.getActiveForm());

  // Auto-sync registrants to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REGISTRANTS_KEY, JSON.stringify(registrants));
    } catch (e) {
      console.warn('Failed to save registrants to localStorage', e);
    }
  }, [registrants]);

  // Auto-sync certificates to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify(certificates));
    } catch (e) {
      console.warn('Failed to save certificates to localStorage', e);
    }
  }, [certificates]);

  // Map navigation tabs to hash routes
  const tabToHash = (tab: NavTab): string => {
    switch (tab) {
      case 'home':
        return '#/home';
      case 'sessions':
        return '#/sessions';
      case 'registrants':
      case 'reviews':
        return '#/registrants';
      case 'form-builder':
        return '#/form-builder';
      case 'certificates':
        return targetCertificateId ? `#/certificates/${targetCertificateId}` : '#/certificates';
      case 'users':
        return '#/users';
      case 'profile':
        return '#/profile';
      case 'about':
        return '#/about';
      default:
        return '#/home';
    }
  };

  const navigate = (newHash: string) => {
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    } else {
      syncRouteFromHash(newHash);
    }
  };

  // Synchronize route state from URL hash
  const syncRouteFromHash = useCallback(
    (hashString?: string) => {
      const rawHash =
        hashString !== undefined
          ? hashString
          : typeof window !== 'undefined'
          ? window.location.hash
          : '';
      const route = parseHash(rawHash);
      const path = route.path;
      const isLoggedIn = Boolean(user?.isLoggedIn);

      // Root path '/' or empty hash
      if (path === '/' || path === '') {
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('home');
          if (window.location.hash !== '#/home' && window.location.hash !== '#/') {
            window.location.replace('#/home');
          }
        } else {
          setCurrentScreen('login');
          if (window.location.hash !== '#/login') {
            window.location.replace('#/login');
          }
        }
        return;
      }

      // Check protection for logged-out users: save return destination and send to login without history trap
      if (isRouteProtected(path) && !isLoggedIn) {
        try {
          sessionStorage.setItem('sems_return_url', rawHash || `/#${path}`);
        } catch {
          // Safe fallback
        }
        setCurrentScreen('login');
        if (window.location.hash !== '#/login') {
          window.location.replace('#/login');
        }
        return;
      }

      // Public routes
      if (path === '/login') {
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('home');
          window.location.replace('#/home');
        } else {
          setCurrentScreen('login');
        }
        return;
      }

      if (path === '/signup') {
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('home');
          window.location.replace('#/home');
        } else {
          setCurrentScreen('signup');
        }
        return;
      }

      if (path === '/about' || path === '/landing') {
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('about');
        } else {
          setCurrentScreen('about');
        }
        return;
      }

      if (path === '/events' || path.startsWith('/events/')) {
        const eId = route.params.eventId || null;
        setTargetEventId(eId);
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('sessions');
        } else {
          setCurrentScreen('sessions');
        }
        return;
      }

      if (path === '/sessions' || path.startsWith('/sessions/')) {
        const sId = route.params.sessionId || null;
        setTargetSessionId(sId);
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('sessions');
        } else {
          setCurrentScreen('sessions');
        }
        return;
      }

      if (path.startsWith('/verify/')) {
        const certCode = route.params.certificateId || null;
        setTargetCertificateId(certCode);
        setIsVerifyMode(true);
        if (isLoggedIn) {
          setCurrentScreen('dashboard');
          setCurrentTab('certificates');
        } else {
          setCurrentScreen('verify');
        }
        return;
      }

      // Authenticated Dashboard Routes
      setCurrentScreen('dashboard');

      // Enforce role-based access for privileged routes (preventing unauthorized tab access)
      const requiredRole = getRequiredRoleForRoute(path);
      if (requiredRole) {
        if (requiredRole === 'super_admin' && currentRole !== 'super_admin') {
          setCurrentTab('home');
          showNotification('Access Denied: Super Administrator privileges required.');
          window.location.replace('#/home');
          return;
        }
        if (requiredRole === 'admin' && currentRole !== 'admin' && currentRole !== 'super_admin') {
          setCurrentTab('home');
          showNotification('Access Denied: Administrator privileges required.');
          window.location.replace('#/home');
          return;
        }
      }

      if (path === '/home' || path === '/dashboard') {
        setCurrentTab('home');
        return;
      }

      if (path === '/certificates' || path.startsWith('/certificates/')) {
        const certId = route.params.certificateId || null;
        setTargetCertificateId(certId);
        setIsVerifyMode(false);
        setCurrentTab('certificates');
        return;
      }

      if (path === '/profile') {
        setCurrentTab('profile');
        return;
      }

      if (path === '/registrants') {
        setCurrentTab('registrants');
        return;
      }

      if (path === '/form-builder') {
        setCurrentTab('form-builder');
        return;
      }

      if (path === '/users') {
        setCurrentTab('users');
        return;
      }

      if (path === '/reviews') {
        setCurrentTab('registrants');
        window.location.replace('#/registrants');
        return;
      }

      // Fallback
      setCurrentTab('home');
    },
    [user?.isLoggedIn, currentRole]
  );

  // Listen to hashchange events for browser Back/Forward navigation and initial URL sync
  useEffect(() => {
    const handleHashChange = () => {
      syncRouteFromHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    syncRouteFromHash(window.location.hash);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [syncRouteFromHash]);

  // Track active tab and screen in localStorage for refresh preservation
  useEffect(() => {
    try {
      if (user?.isLoggedIn) {
        localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, currentTab);
        if (currentScreen !== 'login' && currentScreen !== 'signup') {
          localStorage.setItem(STORAGE_ACTIVE_SCREEN_KEY, currentScreen);
        }
      }
    } catch {
      // Safe fallback
    }
  }, [currentTab, currentScreen, user?.isLoggedIn]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
  };

  const handleLoginSuccess = (
    authUser: {
      name: string;
      email: string;
      primaryEmail?: string;
      secondaryEmail?: string;
      role?: UserRole;
      isBackendConnected?: boolean;
    },
    isNewSignup?: boolean
  ) => {
    const effectiveEmail = authUser.primaryEmail || authUser.email;
    // With a live backend the role from /auth/me is authoritative. The email lookup is only for offline mock accounts.
    const emailIdentified = identifyRoleFromEmail(effectiveEmail);
    const identified =
      authUser.isBackendConnected && authUser.role
        ? {
            userRole: authUser.role,
            dashboardRole: authUser.role as DashboardRole,
            roleDisplayName: getRoleDisplayName(authUser.role as DashboardRole),
          }
        : emailIdentified;
    const existingAccount = userService.findUserByEmail(effectiveEmail);
    const secondary = authUser.secondaryEmail || existingAccount?.secondaryEmail || undefined;

    const sessionUser: AuthUser = {
      name: authUser.name,
      email: effectiveEmail,
      primaryEmail: effectiveEmail,
      secondaryEmail: secondary,
      role: identified.userRole,
      isLoggedIn: true,
      rollNumber: existingAccount?.rollNumber || undefined,
      department: existingAccount?.department || undefined,
      isBackendConnected: Boolean(authUser.isBackendConnected),
      authMode: authUser.isBackendConnected ? 'remote' : 'offline_mock',
    };

    setUser(sessionUser);
    setCurrentRole(identified.dashboardRole);
    try {
      localStorage.setItem(STORAGE_LOGIN_KEY, 'true');
      localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(STORAGE_ACTIVE_SCREEN_KEY, 'dashboard');
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, 'home');
      localStorage.setItem('sems_user_email', effectiveEmail);
      localStorage.setItem('sems_auth_backend_connected', String(Boolean(authUser.isBackendConnected)));
      if (secondary) {
        localStorage.setItem('sems_user_secondary_email', secondary);
      } else {
        localStorage.removeItem('sems_user_secondary_email');
      }
      localStorage.setItem('sems_user_name', authUser.name);
    } catch {
      // Safe fallback
    }

    showNotification(
      isNewSignup
        ? `Account registered! Welcome, ${authUser.name}!`
        : `Signed in as ${authUser.name} (${identified.roleDisplayName})${
            authUser.isBackendConnected ? ' [Live Backend]' : ' [Offline / Mock Mode]'
          }`
    );

    // Return to preserved protected route if exists, otherwise #/home
    let target = '#/home';
    try {
      const returnUrl = sessionStorage.getItem('sems_return_url');
      if (returnUrl && returnUrl !== '#/login' && returnUrl !== '#/signup') {
        sessionStorage.removeItem('sems_return_url');
        target = returnUrl;
      }
    } catch {
      // Safe fallback
    }
    navigate(target);
  };

  const handleUpdateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, JSON.stringify(updatedUser));
      localStorage.setItem('sems_user_email', updatedUser.primaryEmail || updatedUser.email);
      if (updatedUser.secondaryEmail) {
        localStorage.setItem('sems_user_secondary_email', updatedUser.secondaryEmail);
      }
      localStorage.setItem('sems_user_name', updatedUser.name);
    } catch {
      // Safe fallback
    }
    showNotification('Profile & email credentials successfully saved.');
  };

  const handleLogout = () => {
    setStoredAuthToken(null);
    eventService.saveEvents([]);
    setEvents([]);
    setUser(null);
    setCurrentRole('guest');
    try {
      localStorage.removeItem(STORAGE_LOGIN_KEY);
      localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
      localStorage.removeItem(STORAGE_ACTIVE_TAB_KEY);
      localStorage.removeItem(STORAGE_ACTIVE_SCREEN_KEY);
      localStorage.removeItem('sems_user_email');
      localStorage.removeItem('sems_user_name');
      localStorage.removeItem('sems_user_secondary_email');
      localStorage.removeItem('sems_user_role');
      localStorage.removeItem('sems_auth_backend_connected');
      sessionStorage.removeItem('sems_return_url');
    } catch {
      // Safe fallback
    }
    showNotification('Logged out successfully. Please sign in to continue.');
    navigate('#/login');
  };

  // Token expired or revoked: apiFetch fires this event after a 401 on a logged-in request.
  useEffect(() => {
    const onUnauthorized = () => {
      handleLogout();
      showNotification('Your session expired. Please sign in again.');
    };
    window.addEventListener('sems:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sems:unauthorized', onUnauthorized);
  }, []);

  // Re-validate the saved backend session on startup: logs out deactivated users, refreshes the role.
  useEffect(() => {
    if (!user?.isBackendConnected) return;
    apiFetch('/auth/me')
      .then(async (res) => {
        if (!res.ok) return; // a 401 fires 'sems:unauthorized' inside apiFetch
        const me = await res.json();
        if (me?.role && me.role !== currentRole) setCurrentRole(me.role as DashboardRole);
      })
      .catch(() => {});
  }, [user?.primaryEmail]);

  const handleNavigateToSession = (sessionId: string) => {
    setTargetSessionId(sessionId);
    navigate(`#/sessions/${sessionId}`);
  };

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    try {
      const currentHash = window.location.hash;
      if (currentHash && currentHash !== '#/login' && currentHash !== '#/signup') {
        sessionStorage.setItem('sems_return_url', currentHash);
      }
    } catch {
      // Safe fallback
    }
    navigate(mode === 'signup' ? '#/signup' : '#/login');
  };

  // Registered session IDs for the active user (dynamically matched to user's identity)
  const registeredSessionIds = useMemo(() => {
    if (!user) return [];
    const userPrimary = (user.primaryEmail || user.email || '').toLowerCase().trim();
    const userSecondary = (user.secondaryEmail || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();
    const userRoll = (user.rollNumber || '').toLowerCase().trim();

    return registrants
      .filter((r) => {
        const regPrimary = (r.primaryEmail || r.email || '').toLowerCase().trim();
        const regSecondary = (r.secondaryEmail || '').toLowerCase().trim();
        const regName = (r.name || '').toLowerCase().trim();
        const regRoll = (r.rollNumber || '').toLowerCase().trim();

        const emailMatch =
          Boolean(userPrimary && (regPrimary === userPrimary || regSecondary === userPrimary)) ||
          Boolean(userSecondary && (regPrimary === userSecondary || regSecondary === userSecondary));
        const rollMatch = Boolean(userRoll && regRoll && regRoll === userRoll);
        const nameMatch = Boolean(userName && regName && regName === userName);

        return emailMatch || rollMatch || nameMatch;
      })
      .map((r) => r.sessionId);
  }, [registrants, user]);

  return (
    <div
      id="sems-application-root"
      className="relative min-h-[100dvh] w-full bg-[var(--bg-start)] text-white overflow-x-hidden font-inter selection:bg-[var(--primary-accent)] selection:text-white"
    >
      {/* Universal Background Gradients */}
      <BackgroundGradients />

      {/* 1. SCREEN: LOGIN & SIGNUP (Default First Page) */}
      {(currentScreen === 'login' || currentScreen === 'signup') && (
        <LoginPage
          initialMode={currentScreen === 'signup' ? 'signup' : 'signin'}
          onSuccessLogin={handleLoginSuccess}
          onNavigateToSignup={() => navigate('#/signup')}
          onNavigateToSessions={() => navigate('#/sessions')}
          onNavigateToAbout={() => navigate('#/about')}
          onForgotPassword={(email) =>
            showNotification(`Password reset link dispatched to ${email}`)
          }
        />
      )}

      {/* 2. SCREEN: STANDALONE SESSIONS (When user clicks "View Sessions") */}
      {currentScreen === 'sessions' && (
        <div className="relative min-h-[100dvh] w-full bg-[var(--bg-start)] text-white flex flex-col">
          <BackgroundGradients />
          {/* Standalone Top Bar with No Sidebar/Dashboard Clutter */}
          <header className="sticky top-0 z-30 w-full bg-[var(--bg-start)]/85 backdrop-blur-xl border-b border-white/[0.12] px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SemsLogo />
              <span className="hidden sm:inline text-xs text-[var(--text-sec-80)] border-l border-white/20 pl-3">
                Campus Sessions Catalog
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('#/about')}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.16] text-xs font-inter text-white transition-all cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="px-4 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-inter font-medium text-white transition-all shadow cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
            <SessionsManager
              currentRole="guest"
              events={visibleEvents}
              sessions={sessions}
              formConfig={formConfig}
              registeredSessionIds={[]}
              registrants={registrants}
              onUpdateEvents={() => {}}
              onRegisterNewParticipant={(newReg) => {
                setRegistrants((prev) => [newReg, ...prev]);
                showNotification(`Registration saved for ${newReg.sessionTitle}`);
              }}
              onNavigateHome={() => navigate('#/login')}
              onNavigateToAuth={(mode) => handleOpenAuth(mode)}
              onNotify={showNotification}
              initialSelectedSessionId={targetSessionId}
              initialSelectedEventId={targetEventId}
              initialSubScreen={targetEventId ? 'event-detail' : undefined}
            />
          </main>
        </div>
      )}

      {/* 3. SCREEN: STANDALONE ABOUT (When user clicks "About") */}
      {(currentScreen === 'about' || currentScreen === 'landing') && (
        <div className="relative min-h-[100dvh] w-full bg-[var(--bg-start)] text-white">
          <BackgroundGradients />
          <div className="relative z-10">
            <AboutAppPage
              onNavigateToLogin={() => navigate('#/login')}
              onNavigateToSignup={() => navigate('#/signup')}
              onExploreAsGuest={() => navigate('#/sessions')}
            />
          </div>
        </div>
      )}

      {/* 4. SCREEN: STANDALONE CERTIFICATE VERIFICATION (When opened via #/verify/:id without login) */}
      {currentScreen === 'verify' && (
        <div className="relative min-h-[100dvh] w-full bg-[var(--bg-start)] text-white flex flex-col">
          <BackgroundGradients />
          {/* Standalone Top Bar with No Sidebar/Dashboard Clutter */}
          <header className="sticky top-0 z-30 w-full bg-[var(--bg-start)]/85 backdrop-blur-xl border-b border-white/[0.12] px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SemsLogo />
              <span className="hidden sm:inline text-xs text-[var(--text-sec-80)] border-l border-white/20 pl-3">
                Credential Verification Ledger
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('#/sessions')}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.16] text-xs font-inter text-white transition-all cursor-pointer"
              >
                Browse Sessions
              </button>
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="px-4 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-inter font-medium text-white transition-all shadow cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
            <CertificatesPage
              currentRole="guest"
              currentUser={null}
              certificates={certificates}
              registrants={registrants}
              targetCertificateId={targetCertificateId}
              isVerifyMode={true}
              onBack={() => navigate('#/sessions')}
              onNotify={showNotification}
            />
          </main>
        </div>
      )}

      {/* 5. SCREEN: AUTHENTICATED DASHBOARD (ONLY WHEN USER LOGS IN) */}
      {currentScreen === 'dashboard' && (
        <div className="min-h-screen flex flex-col w-full">
          {/* Persistent Navigation (Desktop Left Sidebar & Mobile Bottom Bar) */}
          <Navigation
            currentTab={currentTab}
            onSelectTab={(tab) => {
              if (tab === 'sessions') {
                setTargetSessionId(null);
              }
              navigate(tabToHash(tab));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
            onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
            currentRole={currentRole}
            isLoggedIn={Boolean(user?.isLoggedIn)}
            onOpenAuthModal={(mode) => handleOpenAuth(mode || 'login')}
            onLogout={handleLogout}
          />

          {/* Main Layout Area: Adaptively shifts right by sidebar width on desktop */}
          <div
            id="sems-layout-wrapper"
            className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out ${
              isDesktopSidebarCollapsed ? 'lg:pl-[74px]' : 'lg:pl-[240px]'
            }`}
          >
            {/* Top App Bar with Notifications and Profile Shortcut */}
            <TopAppBar
              currentTab={currentTab}
              currentRole={currentRole}
              isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
              userName={
                user?.name ||
                (currentRole === 'guest'
                  ? 'Guest User'
                  : currentRole === 'student'
                  ? 'Jordan Lee'
                  : currentRole === 'super_admin'
                  ? 'Prof. Dean Taylor'
                  : 'Alex Morgan (President)')
              }
              userEmail={
                user?.primaryEmail ||
                user?.email ||
                (currentRole === 'student'
                  ? 'student@university.edu.pk'
                  : currentRole === 'super_admin'
                  ? 'dean.taylor@university.edu.pk'
                  : currentRole === 'admin'
                  ? 'admin@university.edu.pk'
                  : undefined)
              }
              isLoggedIn={user?.isLoggedIn ?? false}
              isBackendConnected={Boolean(user?.isBackendConnected)}
              onOpenProfile={() => navigate('#/profile')}
              onOpenAuth={() => handleOpenAuth('login')}
              onLogout={handleLogout}
              onNavigateTab={(tab) => navigate(tabToHash(tab))}
            />

            {/* Main Content Area */}
            <main
              id="sems-main-content"
              className="flex-1 w-full min-w-0 pb-24 lg:pb-12 px-3 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6"
            >
              <div className="w-full max-w-[1800px] mx-auto min-w-0">
                <AnimatePresence mode="wait">
          {/* TAB 1: HOME DASHBOARD (Adapts for Guest vs Student vs Head/Admin) */}
          {currentTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <HomeDashboard
                currentRole={currentRole}
                events={visibleEvents}
                sessions={sessions}
                registrants={registrants}
                certificates={certificates}
                currentUserEmail={user?.primaryEmail || user?.email}
                currentUserName={user?.name}
                onNotify={showNotification}
                onNavigateToAuth={handleOpenAuth}
                onNavigateToSession={handleNavigateToSession}
                onNavigateToSessionsList={() => navigate('#/sessions')}
                onNavigateToEvents={() => navigate('#/sessions')}
                onNavigateToFormBuilder={() => navigate('#/form-builder')}
                onNavigateToRegistrants={() => navigate('#/registrants')}
                onNavigateToCertificates={() => navigate('#/certificates')}
                onNavigateToUsers={() => navigate('#/users')}
                onNavigateToCreateSession={() => {
                  navigate('#/sessions');
                }}
                onUpdateRegistrants={(updated) => {
                  setRegistrants(updated);
                  showNotification('Registration records updated.');
                }}
                onApproveEvent={async (evtId) => {
                  if (currentRole !== 'super_admin') {
                    showNotification('Unauthorized: Only Super Admin can approve events for publication.');
                    return;
                  }

                  try {
                    const res = await eventsApi.publishEvent(evtId);
                    await eventService.refreshFromBackend();
                    setEvents(eventService.getEvents());
                    showNotification(`Event "${res.title}" approved & published to campus!`);
                  } catch (error: any) {
                    const message = error?.message || 'Failed to publish event.';
                    showNotification(message);
                    throw error;
                  }
                }}
              />
            </motion.div>
          )}

          {/* TAB 2: SESSIONS MODULE */}
          {currentTab === 'sessions' && (
            <motion.div
              key="tab-sessions"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <SessionsManager
                currentRole={currentRole}
                events={visibleEvents}
                sessions={sessions}
                formConfig={formConfig}
                registeredSessionIds={registeredSessionIds}
                currentUserEmail={user?.primaryEmail || user?.email}
                currentUserName={user?.name}
                registrants={registrants}
                onUpdateEvents={(updated) => {
                  setEvents(updated);
                  showNotification('Event repository synchronized.');
                }}
                onRegisterNewParticipant={(newReg) => {
                  setRegistrants((prev) => [newReg, ...prev]);
                  showNotification(`Registration saved for ${newReg.sessionTitle}`);
                }}
                onNavigateHome={() => navigate('#/home')}
                onNavigateToAuth={handleOpenAuth}
                onNotify={showNotification}
                initialSelectedSessionId={targetSessionId}
                initialSelectedEventId={targetEventId}
                initialSubScreen={targetEventId ? 'event-detail' : undefined}
              />
            </motion.div>
          )}

          {/* TAB 3: DYNAMIC FORM BUILDER (Head/Admin Role - Protected from Student/Guest) */}
          {currentTab === 'form-builder' && (
            <motion.div
              key="tab-form-builder"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {currentRole !== 'admin' && currentRole !== 'super_admin' ? (
                <AccessDeniedPage
                  currentRole={currentRole}
                  requiredRole="Administrator"
                  onNavigateHome={() => navigate('#/home')}
                  onNavigateSessions={() => navigate('#/sessions')}
                />
              ) : (
                <FormBuilderPage
                  currentRole={currentRole}
                  initialForm={formConfig}
                  onSaveForm={(newConfig: RegistrationFormConfig) => {
                    setFormConfig(newConfig);
                    showNotification(`Published form: "${newConfig.formName}" with ${newConfig.fields.length} fields.`);
                  }}
                  onBack={() => navigate('#/home')}
                  onNotify={showNotification}
                />
              )}
            </motion.div>
          )}

          {/* TAB 4: REGISTRANTS & PAYMENTS (Head/Admin Role or Student My Registrations) */}
          {currentTab === 'registrants' && (
            <motion.div
              key="tab-registrants"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <PaymentReviewPage
                currentRole={currentRole}
                registrants={registrants}
                currentUserEmail={user?.primaryEmail || user?.email}
                currentUserName={user?.name}
                onUpdateRegistrants={(updated) => {
                  setRegistrants(updated);
                  showNotification('Registrant records & payment status synchronized.');
                }}
                onBack={() => navigate('#/home')}
                onNotify={showNotification}
                onNavigateToSession={handleNavigateToSession}
              />
            </motion.div>
          )}

          {/* TAB: REVIEWS (Admin / Super Admin only route) */}
          {currentTab === 'reviews' && (
            <motion.div
              key="tab-reviews"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {currentRole !== 'admin' && currentRole !== 'super_admin' ? (
                <AccessDeniedPage
                  currentRole={currentRole}
                  requiredRole="Administrator"
                  onNavigateHome={() => navigate('#/home')}
                  onNavigateSessions={() => navigate('#/sessions')}
                />
              ) : (
                <PaymentReviewPage
                  currentRole={currentRole}
                  registrants={registrants}
                  currentUserEmail={user?.primaryEmail || user?.email}
                  currentUserName={user?.name}
                  onUpdateRegistrants={(updated) => {
                    setRegistrants(updated);
                    showNotification('Registrant records & payment status synchronized.');
                  }}
                  onBack={() => navigate('#/home')}
                  onNotify={showNotification}
                  onNavigateToSession={handleNavigateToSession}
                />
              )}
            </motion.div>
          )}

          {/* TAB 5: CERTIFICATES & VERIFICATION (All Roles, Monospace SEMS-XXXXXX) */}
          {currentTab === 'certificates' && (
            <motion.div
              key="tab-certificates"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <CertificatesPage
                currentRole={currentRole}
                currentUser={user}
                certificates={certificates}
                registrants={registrants}
                targetCertificateId={targetCertificateId}
                isVerifyMode={isVerifyMode}
                onIssueNewCertificates={(newCerts) => {
                  setCertificates((prev) => [...newCerts, ...prev]);
                  showNotification(`Issued ${newCerts.length} verified SEMS credentials.`);
                }}
                onUpdateCertificates={(updated) => setCertificates(updated)}
                onUpdateRegistrants={(updated) => setRegistrants(updated)}
                onBack={() => navigate('#/home')}
                onNotify={showNotification}
              />
            </motion.div>
          )}

          {/* TAB 6: ABOUT PAGE (System & Society Information) */}
          {currentTab === 'about' && (
            <motion.div
              key="tab-about"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <AboutAppPage
                onNavigateToLogin={() => handleOpenAuth('login')}
                onNavigateToSignup={() => handleOpenAuth('signup')}
                onExploreAsGuest={() => navigate('#/home')}
              />
            </motion.div>
          )}

          {/* TAB 7: PROFILE & APPEARANCE */}
          {currentTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <ProfilePage
                currentRole={currentRole}
                user={user}
                activeTheme={activeTheme}
                onSelectTheme={(th) => setTheme(th)}
                onBack={() => navigate('#/home')}
                onOpenAuthModal={() => handleOpenAuth('login')}
                onUpdateUser={handleUpdateUser}
                onLogout={handleLogout}
                onNotify={showNotification}
              />
            </motion.div>
          )}

          {/* TAB 8: USERS & ROLES GOVERNANCE (Super Admin Only - Protected) */}
          {currentTab === 'users' && (
            <motion.div
              key="tab-users"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {currentRole !== 'super_admin' ? (
                <AccessDeniedPage
                  currentRole={currentRole}
                  requiredRole="Super Administrator"
                  onNavigateHome={() => navigate('#/home')}
                  onNavigateSessions={() => navigate('#/sessions')}
                />
              ) : (
                <UsersPage
                  currentRole={currentRole}
                  currentUserEmail={user?.primaryEmail || user?.email || 'dean.taylor@university.edu.pk'}
                  onNotify={showNotification}
                  onBack={() => navigate('#/home')}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Global Status Toast */}
      {toastMessage && (
        <StatusToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
