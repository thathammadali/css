import React from 'react';
import {
  Calendar,
  CreditCard,
  Award,
  Users,
  Palette,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LogIn,
  UserPlus,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { SemsLogo } from './SemsLogo';

interface AboutAppPageProps {
  onNavigateToLogin: () => void;
  onNavigateToSignup: () => void;
  onExploreAsGuest: () => void;
}

export const AboutAppPage: React.FC<AboutAppPageProps> = ({
  onNavigateToLogin,
  onNavigateToSignup,
  onExploreAsGuest,
}) => {
  return (
    <div
      id="about-app-page"
      className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl xl:max-w-[1500px] mx-auto flex flex-col justify-between transition-colors duration-300"
    >
      {/* Top Header Navigation */}
      <header className="w-full flex items-center justify-between pb-6 border-b border-white/[0.12] mb-8">
        <SemsLogo />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onExploreAsGuest}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] text-xs font-inter text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
          >
            <span>Guest Catalog</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.16] text-xs font-inter text-white transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToSignup}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-inter font-medium text-white transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign up</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="space-y-16">
        {/* ========================================================
            HERO SECTION (Includes authoritative Landing Page data)
           ======================================================== */}
        <section className="text-center max-w-4xl mx-auto pt-2 sm:pt-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.16] text-[12px] font-inter text-[var(--primary-accent)] backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Society Portal • Term 2024–2025</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-poppins font-semibold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.15]">
              Your sessions & events, <br className="hidden sm:inline" />
              <span className="text-[var(--primary-accent)]">all in one place.</span>
            </h1>

            <p className="font-inter text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Discover upcoming campus sessions, register easily, submit fee slips, and stay connected with verified digital credentials.
            </p>
          </div>

          {/* Action Button CTA Group */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
            <button
              id="landing-btn-get-started"
              type="button"
              onClick={onNavigateToSignup}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-inter font-semibold text-sm transition-all shadow-lg shadow-[var(--primary-accent)]/20 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Get started / Sign up</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="landing-btn-sign-in"
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.16] text-white font-inter font-medium text-sm transition-all backdrop-blur-sm cursor-pointer active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </button>

            <button
              type="button"
              onClick={onExploreAsGuest}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-[var(--text-secondary)] hover:text-white font-inter font-medium text-sm transition-all cursor-pointer active:scale-95"
            >
              <span>Explore as Guest</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            KEY IMPACT METRICS BANNER
           ======================================================== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-panel p-5 rounded-2xl text-center">
            <span className="block font-poppins font-bold text-2xl sm:text-3xl text-white">4</span>
            <span className="block font-inter text-xs text-[var(--text-secondary)] mt-1">Authoritative Roles</span>
            <span className="block font-inter text-[11px] text-[var(--text-sec-70)] mt-0.5">Super Admin, Admin, Student, Guest</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-center">
            <span className="block font-poppins font-bold text-2xl sm:text-3xl text-[var(--primary-accent)]">24+</span>
            <span className="block font-inter text-xs text-[var(--text-secondary)] mt-1">Active Campus Events</span>
            <span className="block font-inter text-[11px] text-[var(--text-sec-70)] mt-0.5">Workshops, Hackathons & Seminars</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-center">
            <span className="block font-poppins font-bold text-2xl sm:text-3xl text-white">500+</span>
            <span className="block font-inter text-xs text-[var(--text-secondary)] mt-1">Enrolled Students</span>
            <span className="block font-inter text-[11px] text-[var(--text-sec-70)] mt-0.5">Verified university IDs</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-center">
            <span className="block font-poppins font-bold text-2xl sm:text-3xl text-[var(--primary-accent)]">100%</span>
            <span className="block font-inter text-xs text-[var(--text-secondary)] mt-1">Tamper-Proof Certificates</span>
            <span className="block font-inter text-[11px] text-[var(--text-sec-70)] mt-0.5">Unique QR verification code</span>
          </div>
        </section>

        {/* ========================================================
            CENTRAL GLASSMORPHIC SPOTLIGHT (from Landing Card)
           ======================================================== */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/[0.18] relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--accent-20)] text-[var(--primary-accent)] text-xs font-medium">
              <Layers className="w-3.5 h-3.5" />
              <span>Complete Session Lifecycle</span>
            </div>
            <h2 className="font-poppins font-semibold text-2xl sm:text-3xl text-white leading-tight">
              Eliminate chaotic groups, lost registration forms, and unverifiable certificates.
            </h2>
            <p className="font-inter text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Session Management System replaces fragmented spreadsheets with a single authoritative portal. From dynamic field forms to manual fee slip audit, real-time virtual rooms, attendance logging, and verifiable PDF credential issuance, everything runs seamlessly.
            </p>
          </div>
        </section>

        {/* ========================================================
            HOW SESSION MANAGEMENT SYSTEM WORKS (4-Step Student & Organizer Journey)
           ======================================================== */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="font-poppins font-semibold text-2xl text-white">
              How Session Management System Works
            </h2>
            <p className="font-inter text-sm text-[var(--text-secondary)]">
              Four streamlined steps from discovery to official credential verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex flex-col justify-between space-y-3">
              <div>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-20)] text-[var(--primary-accent)] font-bold font-mono text-sm mb-3">
                  01
                </span>
                <h3 className="font-poppins font-medium text-base text-white mb-1">
                  Sign In & Authenticate
                </h3>
                <p className="font-inter text-xs text-[var(--text-secondary)] leading-relaxed">
                  Sign in with your university credentials or registered account to browse verified workshops, symposiums, and access your personalized dashboard.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-sec-70)]">Authenticated members only</span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex flex-col justify-between space-y-3">
              <div>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-20)] text-[var(--primary-accent)] font-bold font-mono text-sm mb-3">
                  02
                </span>
                <h3 className="font-poppins font-medium text-base text-white mb-1">
                  Submit Registration & Slip
                </h3>
                <p className="font-inter text-xs text-[var(--text-secondary)] leading-relaxed">
                  Fill dynamic registration fields and upload proof of payment (EasyPaisa, JazzCash, or bank slip) for quick admin audit.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-sec-70)]">Instant tracking receipt</span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex flex-col justify-between space-y-3">
              <div>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-20)] text-[var(--primary-accent)] font-bold font-mono text-sm mb-3">
                  03
                </span>
                <h3 className="font-poppins font-medium text-base text-white mb-1">
                  Attend & Submit Tasks
                </h3>
                <p className="font-inter text-xs text-[var(--text-secondary)] leading-relaxed">
                  Participate in live sessions, mark attendance, complete hands-on lab assignments, and access presentation slides.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-sec-70)]">Attendance requirement tracked</span>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex flex-col justify-between space-y-3">
              <div>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-20)] text-[var(--primary-accent)] font-bold font-mono text-sm mb-3">
                  04
                </span>
                <h3 className="font-poppins font-medium text-base text-white mb-1">
                  Claim Verified Certificate
                </h3>
                <p className="font-inter text-xs text-[var(--text-secondary)] leading-relaxed">
                  Download high-resolution certificates stamped with unique cryptographic hashes and QR codes verifiable by employers anywhere.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-sec-70)]">Permanent personal email sync</span>
            </div>
          </div>
        </section>

        {/* ========================================================
            CORE SYSTEM MODULES
           ======================================================== */}
        <section className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="font-poppins font-semibold text-2xl text-white">
              Core System Modules
            </h2>
            <p className="font-inter text-sm text-[var(--text-secondary)]">
              Engineered specifically for university societies, clubs, and campus administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Session & Event Catalog
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Live listings of technical hackathons, guest speaker seminars, and cultural festivals with real-time seat availability, schedules, and venue details.
              </p>
            </div>

            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Registration & Fee Approvals
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Streamlined enrollment with bank/EasyPaisa/JazzCash slip submission. Dedicated administrator review queue for auditing receipts and approving tickets.
              </p>
            </div>

            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Verified Digital Certificates
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Instantly generate and download tamper-evident digital certificates with unique verification codes, distinction grades, and student roll numbers.
              </p>
            </div>

            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Role-Based Workspaces
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Dedicated workspaces for Super Admins (governance & roles), Admins (sessions & verification), Students (enrollments & credentials), and Guests (open catalog).
              </p>
            </div>

            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Signature Color Themes
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Personalized high-contrast themes including Midnight Emerald, Obsidian Gold, Cyber Indigo, Arctic Cyan, and Monochrome Luxury configurable in Profile.
              </p>
            </div>

            <div className="glass-panel-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-[var(--primary-accent)] mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-poppins font-medium text-base text-white mb-1.5">
                Privacy & Data Security
              </h3>
              <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Secure student credential storage, role validation, receipt verification logs, and dual email architecture (university ID + permanent Gmail recovery).
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            AUTHORITATIVE 4-ROLE ARCHITECTURE
           ======================================================== */}
        <section className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="font-poppins font-semibold text-2xl text-white">
              Who Can Use Session Management System?
            </h2>
            <p className="font-inter text-sm text-[var(--text-secondary)]">
              Four tailored permission tiers designed to keep session governance transparent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-inter">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] space-y-3">
              <span className="inline-block px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold">
                👑 Super Admin
              </span>
              <p className="text-white/80 text-[11px] leading-relaxed">
                Deans, Faculty Advisors, and Head of Student Affairs with global authority.
              </p>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Full system & user governance</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Promote / demote account roles</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Final event publishing approvals</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] space-y-3">
              <span className="inline-block px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-semibold">
                🛡️ Admin
              </span>
              <p className="text-white/80 text-[11px] leading-relaxed">
                Society Presidents, Event Directors, and Lead Coordinators.
              </p>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Create & schedule campus sessions</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Review & approve payment slips</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Issue & bulk-generate certificates</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] space-y-3">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                🎓 Student
              </span>
              <p className="text-white/80 text-[11px] leading-relaxed">
                Undergraduate & graduate students across all campus departments.
              </p>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Enroll with roll number & uni ID</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Upload fee vouchers & track status</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Claim & download verified certs</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] space-y-3">
              <span className="inline-block px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                🌐 Guest
              </span>
              <p className="text-white/80 text-[11px] leading-relaxed">
                Alumni, industry participants, and campus visitors.
              </p>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Explore open session schedules</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Guest registration with personal email</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Verify public certificate credentials</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ========================================================
            APPLICATION SPECIFICATIONS
           ======================================================== */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--primary-accent)]" />
            <h3 className="font-poppins font-medium text-base text-white">
              Application Specifications & Platform Info
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-inter">
            <div className="space-y-1">
              <p className="text-[var(--text-secondary)]">Application Name</p>
              <p className="font-medium text-white">Session Management System</p>
            </div>
            <div className="space-y-1">
              <p className="text-[var(--text-secondary)]">Version & Status</p>
              <p className="font-medium text-white">v2.4.0 (Production Stable)</p>
            </div>
            <div className="space-y-1">
              <p className="text-[var(--text-secondary)]">Security Level</p>
              <p className="font-medium text-white">Dual-Email Architecture & RBAC</p>
            </div>
            <div className="space-y-1">
              <p className="text-[var(--text-secondary)]">Active Academic Term</p>
              <p className="font-medium text-white">Fall / Spring 2024–2025</p>
            </div>
          </div>
        </section>

        {/* ========================================================
            CALL TO ACTION FOOTER BANNER
           ======================================================== */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-white/[0.08] to-white/[0.02] border border-white/[0.16] text-center space-y-4">
          <h2 className="font-poppins font-semibold text-2xl sm:text-3xl text-white">
            Ready to participate in sessions?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            Join participants and explore technical symposiums, hands-on workshops, and certified sessions today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onNavigateToSignup}
              className="px-6 py-3 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="px-6 py-3 rounded-xl bg-white/[0.10] hover:bg-white/[0.16] text-white font-medium text-xs transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onExploreAsGuest}
              className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/[0.06] border border-white/20 text-white/90 text-xs transition-all cursor-pointer"
            >
              Browse Catalog as Guest
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 pt-6 border-t border-white/[0.12] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-inter text-[var(--text-secondary)]">
        <p>© 2024–2025 Session Management System. All rights reserved.</p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onNavigateToSignup}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={onExploreAsGuest}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Guest View
          </button>
        </div>
      </footer>
    </div>
  );
};
