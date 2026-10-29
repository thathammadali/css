import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Check,
  Shield,
  ArrowRight,
  Palette,
  Sun,
  Moon,
  LogOut,
  Server,
} from 'lucide-react';
import { SemsLogo } from './SemsLogo';
import { DashboardRole, NavTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { BackendConnectionModal } from './BackendConnectionModal';
import { THEME_SWATCHES, applyThemeToDocument, THEME_STORAGE_KEY } from '../data/themes';

interface TopAppBarProps {
  currentTab: NavTab;
  currentRole: DashboardRole;
  isDesktopSidebarCollapsed?: boolean;
  userName?: string;
  userEmail?: string;
  isLoggedIn?: boolean;
  isBackendConnected?: boolean;
  onOpenProfile: () => void;
  onSelectRole?: (role: DashboardRole) => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentTab,
  currentRole,
  isDesktopSidebarCollapsed = false,
  userName = 'Jordan Lee',
  userEmail,
  isLoggedIn = false,
  isBackendConnected = false,
  onOpenProfile,
  onOpenAuth,
  onLogout,
}) => {
  const { activeTheme, setTheme, isLightMode, toggleColorMode } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showTunnelModal, setShowTunnelModal] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowProfileMenu(false);
        setShowThemePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        return 'Dashboard Overview';
      case 'sessions':
        return 'Events & Sessions';
      case 'form-builder':
        return 'Dynamic Form Builder';
      case 'registrants':
        return (currentRole === 'student' || currentRole === 'guest') ? 'My Registrations' : 'Registrants & Fees';
      case 'certificates':
        return (currentRole === 'student' || currentRole === 'guest') ? 'My Certificates' : 'Certificates & Templates';
      case 'users':
        return 'Users & Roles';
      case 'about':
        return 'About Session Management System';
      case 'profile':
        return 'Profile & Account';
      default:
        return 'Dashboard';
    }
  };

  return (
    <>
    <header
      id="sems-top-app-bar"
      style={{
        backgroundColor: 'var(--topbar-bg)',
        borderColor: 'var(--topbar-border)',
      }}
      className="sticky top-0 z-30 w-full h-[64px] sm:h-[70px] backdrop-blur-md border-b px-3 sm:px-6 lg:px-8 xl:px-10 flex items-center transition-all duration-300 ease-in-out shadow-xs relative"
    >
      {/* Subtle colored accent strip along the bottom border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--primary-accent) 50%, transparent 100%)',
          opacity: 0.55,
        }}
      />

      <div className="w-full max-w-[1800px] mx-auto flex items-center justify-between min-w-0">
      {/* Left side: Compact SEMS logo on mobile, and Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <div className="lg:hidden flex items-center shrink-0">
          <SemsLogo compact={true} />
        </div>

        {/* Separator on mobile */}
        <div
          className="lg:hidden h-5 w-px shrink-0"
          style={{ backgroundColor: 'var(--topbar-border)' }}
        />

        {/* Page Title */}
        <div className="flex flex-col min-w-0">
          <h1
            id="app-bar-title"
            className="font-poppins font-semibold text-[17px] sm:text-[19px] leading-tight truncate capitalize"
            style={{ color: 'var(--text-primary)' }}
          >
            {getPageTitle(currentTab)}
          </h1>
          <span
            className="hidden sm:inline font-inter text-[11px] leading-none mt-0.5 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            SEMS Campus Platform
          </span>
        </div>

        {/* Offline / Mock Mode vs Live Backend Badge */}
        {isLoggedIn && (
          <div className="hidden sm:flex items-center ml-1 sm:ml-3 shrink-0">
            {!isBackendConnected ? (
              <span
                id="badge-offline-mock-mode"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs"
                title="Offline / Mock Mode: Authenticated using local prototype data fallback"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Offline / Mock Mode</span>
              </span>
            ) : (
              <span
                id="badge-backend-live"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs"
                title="Live Backend: Authenticated with live Cloudflare tunnel"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Backend Live</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Quick Theme Switcher, Notifications bell and Profile Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Quick Daylight / Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleColorMode}
          style={{ borderColor: 'var(--topbar-border)' }}
          className="p-2 sm:px-2.5 rounded-xl border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
          aria-label={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode (Daylight)'}
        >
          {isLightMode ? (
            <Moon className="w-4 h-4 text-amber-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-300" />
          )}
          <span className="hidden xl:inline text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {isLightMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Backend Tunnel & Origin Button */}
        <button
          type="button"
          onClick={() => setShowTunnelModal(true)}
          style={{ borderColor: 'var(--topbar-border)' }}
          className="p-2 sm:px-2.5 rounded-xl border text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
          aria-label="Backend Tunnel & Origin"
          title="Backend Tunnel & CORS Origin Config"
        >
          <Server className="w-4 h-4 text-cyan-500" />
          <span className="hidden xl:inline text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Tunnel
          </span>
        </button>

        {/* Quick Theme Switcher */}
        <div className="relative" ref={themeRef}>
          <button
            id="btn-quick-theme-picker"
            type="button"
            onClick={() => {
              setShowThemePicker(!showThemePicker);
              setShowProfileMenu(false);
            }}
            style={{
              borderColor: showThemePicker ? 'var(--primary-accent)' : 'var(--topbar-border)',
              backgroundColor: showThemePicker ? 'var(--primary-accent-subtle)' : undefined,
            }}
            className="p-2 sm:px-2.5 rounded-xl border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            aria-label="Theme Palette"
            title="Switch Curated Theme"
          >
            <Palette className="w-4.5 h-4.5 text-[var(--primary-accent)]" />
            <span className="hidden md:inline text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Theme
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5 border"
              style={{
                backgroundColor: 'var(--primary-accent-subtle)',
                borderColor: 'var(--primary-accent)',
                color: 'var(--primary-accent)',
              }}
            >
              5
            </span>
          </button>

          {/* Theme Dropdown Popover */}
          {showThemePicker && (
            <div
              id="theme-picker-panel"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
              }}
              className="absolute right-0 mt-2 w-[310px] sm:w-[370px] rounded-2xl border shadow-2xl p-3.5 z-50 text-left animate-fadeIn max-h-[460px] overflow-y-auto"
            >
              <div
                className="flex items-center justify-between pb-2 mb-2.5 border-b px-1"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--primary-accent)]" />
                  <span
                    className="font-poppins font-semibold text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Curated Themes
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono border px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: 'var(--primary-accent-subtle)',
                    borderColor: 'var(--primary-accent)',
                    color: 'var(--primary-accent)',
                  }}
                >
                  5 Themes
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] mb-3 px-1 leading-relaxed">
                Click any of the 5 curated university themes to update the interface in real time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 group ${
                        isActive
                          ? 'shadow-xs ring-1 ring-[var(--primary-accent)]'
                          : 'bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center -space-x-1">
                          {(swatch.swatchColors || [swatch.bgStart, swatch.primary, swatch.accent, swatch.secondary]).map(
                            (c, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                                style={{ backgroundColor: c }}
                              />
                            )
                          )}
                        </div>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                        )}
                      </div>
                      <div>
                        <span
                          className="block font-poppins font-semibold text-xs truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {swatch.number}. {swatch.name}
                        </span>
                        <span className="block text-[10px] text-[var(--text-secondary)] truncate">
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

        <div className="relative" ref={profileRef}>
          <button
            id="btn-profile-avatar"
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowThemePicker(false);
            }}
            style={{ borderColor: 'var(--topbar-border)' }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            aria-label="Profile and account menu"
          >
            <div
              className="w-7 h-7 rounded-full text-white font-inter font-semibold text-xs flex items-center justify-center shadow-xs"
              style={{
                background: 'linear-gradient(135deg, var(--primary-accent) 0%, rgba(var(--primary-accent-rgb), 0.7) 100%)',
              }}
            >
              {currentRole === 'guest' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <span
              className="hidden sm:inline font-inter text-xs font-medium capitalize"
              style={{ color: 'var(--text-primary)' }}
            >
              {currentRole === 'super_admin' ? 'Super Admin' : currentRole}
            </span>
          </button>

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <div
              id="profile-dropdown-panel"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
              }}
              className="absolute right-0 mt-2 w-[240px] rounded-2xl border shadow-2xl p-3 z-50 text-left animate-fadeIn"
            >
              <div
                className="pb-2 mb-2 border-b px-1"
                style={{ borderColor: 'var(--panel-border)' }}
              >
                <div
                  className="font-inter font-semibold text-sm truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentRole === 'guest' ? 'Guest Visitor' : userName}
                </div>
                <div className="font-inter text-xs text-[var(--text-secondary)] capitalize">
                  Current role: {currentRole === 'super_admin' ? 'Super Admin' : currentRole}
                </div>
                {userEmail && (
                  <div className="font-mono text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                    {userEmail}
                  </div>
                )}
                {isLoggedIn && (
                  <div className="mt-1.5 pt-1 border-t border-white/[0.08]">
                    {!isBackendConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/35">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Offline / Mock Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Live Tunnel Account
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-inter text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <span>View profile settings</span>
                  <ArrowRight className="w-3 h-3 text-[var(--primary-accent)]" />
                </button>

                {!isLoggedIn && currentRole === 'guest' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-inter text-[var(--primary-accent)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer font-medium"
                  >
                    <span>Sign in / Register</span>
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else {
                        onOpenAuth();
                      }
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-inter text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer font-medium"
                  >
                    <span>Sign out</span>
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>

    <BackendConnectionModal
      isOpen={showTunnelModal}
      onClose={() => setShowTunnelModal(false)}
    />
  </>
  );
};
