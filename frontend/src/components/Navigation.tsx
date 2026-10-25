import React, { useState } from 'react';
import {
  Home,
  Calendar,
  FileCheck2,
  Award,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LogIn,
  FileCode2,
  Users,
  Info,
  MoreHorizontal,
  X,
  ShieldCheck,
} from 'lucide-react';
import { NavTab, DashboardRole } from '../types';
import { SemsLogo } from './SemsLogo';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDesktopSidebarCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
  currentRole: DashboardRole;
  isLoggedIn?: boolean;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
  onLogout: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  isDesktopSidebarCollapsed,
  onToggleDesktopSidebar,
  currentRole,
  isLoggedIn = false,
  onOpenAuthModal,
  onLogout,
}) => {
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Determine tabs dynamically based on user role (strictly separated for Guest vs Student vs Admins)
  const getNavItems = (): NavItemConfig[] => {
    switch (currentRole) {
      case 'guest':
        if (isLoggedIn) {
          return [
            { id: 'home', label: 'Dashboard', icon: Home },
            { id: 'sessions', label: 'Sessions', icon: Calendar },
            { id: 'registrants', label: 'My Registrations', icon: FileCheck2 },
            { id: 'certificates', label: 'My Certificates', icon: Award },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'about', label: 'About', icon: Info },
          ];
        }
        return [
          { id: 'home', label: 'Dashboard', icon: Home },
          { id: 'sessions', label: 'Sessions', icon: Calendar },
          { id: 'certificates', label: 'Verify Credential', icon: Award },
          { id: 'about', label: 'About', icon: Info },
        ];

      case 'student':
        return [
          { id: 'home', label: 'Dashboard', icon: Home },
          { id: 'sessions', label: 'Sessions', icon: Calendar },
          { id: 'registrants', label: 'My Registrations', icon: FileCheck2 },
          { id: 'certificates', label: 'My Certificates', icon: Award },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'about', label: 'About', icon: Info },
        ];

      case 'admin':
        return [
          { id: 'home', label: 'Overview', icon: Home },
          { id: 'sessions', label: 'Sessions', icon: Calendar },
          { id: 'registrants', label: 'Registrants & Fees', icon: Users },
          { id: 'form-builder', label: 'Form Builder', icon: FileCode2 },
          { id: 'certificates', label: 'Certificates & Templates', icon: Award },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'about', label: 'About', icon: Info },
        ];

      case 'super_admin':
      default:
        return [
          { id: 'home', label: 'Overview', icon: Home },
          { id: 'sessions', label: 'Sessions', icon: Calendar },
          { id: 'registrants', label: 'Registrants & Fees', icon: Users },
          { id: 'form-builder', label: 'Form Builder', icon: FileCode2 },
          { id: 'certificates', label: 'Certificates & Templates', icon: Award },
          { id: 'users', label: 'Users & Roles', icon: ShieldCheck },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'about', label: 'About', icon: Info },
        ];
    }
  };

  const navItems = getNavItems();

  // Mobile navigation division: Primary 4 tabs + More drawer if > 5 items
  const isMobileCondensed = navItems.length > 5;
  const mobilePrimaryItems = isMobileCondensed ? navItems.slice(0, 4) : navItems;
  const mobileOverflowItems = isMobileCondensed ? navItems.slice(4) : [];
  const isOverflowItemActive = mobileOverflowItems.some((item) => item.id === currentTab);

  return (
    <>
      {/* ========================================================
          1. DESKTOP COLLAPSIBLE LEFT SIDEBAR (1024px and above)
         ======================================================== */}
      <aside
        id="sems-desktop-sidebar"
        aria-label="Sidebar navigation"
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
        }}
        className={`hidden lg:flex fixed top-0 bottom-0 left-0 z-40 flex-col justify-between transition-all duration-300 ease-in-out border-r select-none shadow-md ${
          isDesktopSidebarCollapsed ? 'w-[74px]' : 'w-[240px]'
        }`}
      >
        {/* Top Branding & Toggle */}
        <div className={`flex flex-col gap-4 ${isDesktopSidebarCollapsed ? 'p-3 items-center' : 'p-4'}`}>
          <div className={`flex items-center w-full ${isDesktopSidebarCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between'}`}>
            {!isDesktopSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => onSelectTab('home')}
                className="flex items-center gap-2 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary-accent)] rounded-lg p-1"
              >
                <SemsLogo />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab('home')}
                style={{
                  backgroundColor: 'var(--primary-accent-subtle)',
                  borderColor: 'var(--sidebar-border)',
                }}
                className="cursor-pointer p-2 rounded-xl border text-[var(--primary-accent)] hover:brightness-110 transition-colors flex items-center justify-center w-9 h-9"
                title="Session Management System Home"
              >
                <span className="font-poppins font-semibold text-sm">S</span>
              </button>
            )}

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              style={{ borderColor: 'var(--sidebar-border)' }}
              className="p-1.5 rounded-lg border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary-accent)] flex items-center justify-center"
              title={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-4 flex flex-col gap-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`desktop-nav-${item.id}`}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={isDesktopSidebarCollapsed ? item.label : undefined}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--primary-accent-subtle)',
                          borderColor: 'var(--primary-accent)',
                          color: 'var(--primary-accent)',
                        }
                      : {
                          borderColor: 'transparent',
                        }
                  }
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-inter transition-all duration-150 cursor-pointer text-left border ${
                    isActive
                      ? 'font-semibold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.06]'
                  } ${isDesktopSidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {/* Vertical active indicator bar when expanded */}
                  {isActive && !isDesktopSidebarCollapsed && (
                    <span
                      className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full"
                      style={{ backgroundColor: 'var(--primary-accent)' }}
                    />
                  )}
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  />
                  {!isDesktopSidebarCollapsed && (
                    <span className="truncate pl-0.5">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls (Auth & Active Role) */}
        <div
          className="p-3.5 border-t flex flex-col gap-2.5"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          {!isDesktopSidebarCollapsed ? (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl border"
              style={{
                backgroundColor: 'rgba(var(--primary-accent-rgb), 0.08)',
                borderColor: 'var(--sidebar-border)',
              }}
            >
              <div className="flex flex-col overflow-hidden min-w-0 pr-2">
                <span className="text-[10px] font-inter uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
                  Active Role
                </span>
                <span
                  className="text-[12px] font-inter font-semibold truncate capitalize"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : currentRole === 'student' ? 'Student' : 'Guest'}
                </span>
              </div>
              {!isLoggedIn && currentRole === 'guest' ? (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="p-1.5 rounded-lg text-[var(--primary-accent)] hover:bg-black/5 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Sign in"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              {!isLoggedIn && currentRole === 'guest' ? (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="p-2 rounded-xl text-[var(--primary-accent)] hover:bg-black/5 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Sign in"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================
          2. MOBILE MORE OVERFLOW SHEET (Below 1024px)
         ======================================================== */}
      {isMobileMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMoreOpen(false)}
          />

          {/* Sheet Container */}
          <div
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
            }}
            className="relative z-10 rounded-t-3xl border-t p-5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <span className="font-poppins font-semibold text-sm text-[var(--text-primary)]">
                  Additional Navigation
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-medium capitalize">
                  {currentRole.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-2">
              {mobileOverflowItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMobileMoreOpen(false);
                    }}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--primary-accent-subtle)',
                            borderColor: 'var(--primary-accent)',
                            color: 'var(--primary-accent)',
                          }
                        : {
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderColor: 'var(--panel-border)',
                          }
                    }
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isActive ? 'font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Auth button in sheet */}
            <div className="pt-3 border-t border-white/[0.08] mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Session Controls</span>
              {!isLoggedIn && currentRole === 'guest' ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    onOpenAuthModal('login');
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    onLogout();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. MOBILE & TABLET BOTTOM TAB BAR (below 1024px)
         ======================================================== */}
      <nav
        id="sems-mobile-bottom-bar"
        aria-label="Mobile Bottom Navigation"
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
        }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-[64px] border-t px-2 py-1 flex items-center justify-around select-none shadow-lg"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`mobile-tab-${item.id}`}
              type="button"
              onClick={() => {
                setIsMobileMoreOpen(false);
                onSelectTab(item.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer relative ${
                isActive
                  ? 'text-[var(--primary-accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {/* Active Indicator Pip */}
              {isActive && (
                <span
                  className="absolute -top-1 w-5 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--primary-accent)' }}
                />
              )}
              <Icon
                className={`w-5 h-5 mb-0.5 transition-colors ${
                  isActive ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)]'
                }`}
              />
              <span className="font-inter text-[10px] sm:text-[11px] leading-tight font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Button: More Drawer if condensed on mobile */}
        {isMobileCondensed && (
          <button
            id="mobile-tab-more"
            type="button"
            onClick={() => setIsMobileMoreOpen((prev) => !prev)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer relative ${
              isOverflowItemActive || isMobileMoreOpen
                ? 'text-[var(--primary-accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {(isOverflowItemActive || isMobileMoreOpen) && (
              <span
                className="absolute -top-1 w-5 h-1 rounded-full"
                style={{ backgroundColor: 'var(--primary-accent)' }}
              />
            )}
            <MoreHorizontal
              className={`w-5 h-5 mb-0.5 transition-colors ${
                isOverflowItemActive || isMobileMoreOpen
                  ? 'text-[var(--primary-accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            />
            <span className="font-inter text-[10px] sm:text-[11px] leading-tight font-medium truncate max-w-[64px]">
              More
            </span>
          </button>
        )}
      </nav>
    </>
  );
};
