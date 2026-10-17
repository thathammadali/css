/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CertificateItem, CertificateTemplateStyle, CertificateTemplateFormat } from '../../types';

interface CertificateRendererProps {
  certificate: CertificateItem;
  style?: CertificateTemplateStyle;
  format?: CertificateTemplateFormat;
  customTitle?: string;
  customSubtitle?: string;
  customAccentColor?: string;
  backgroundImageUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  adminSignatoryName?: string;
  adminSignatoryTitle?: string;
  watermarkPending?: boolean;
  customSignatureDataUrl?: string;
  customAdminSignatureDataUrl?: string;
  customSealText?: string;
}

/**
 * High-fidelity cursive signature SVG path for Alex Morgan
 */
const AlexMorganSignature: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-36 h-10',
  color = '#2563EB',
}) => (
  <svg
    viewBox="0 0 200 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M15 42C25 20 40 10 52 14C60 17 55 35 45 44C38 50 32 45 42 32C55 15 80 18 90 28C96 34 85 45 78 40C72 35 88 18 105 20C120 22 118 42 128 35C136 29 148 15 162 25C170 32 155 45 145 42C138 40 160 22 178 30C190 35 195 42 188 45"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M30 48C70 46 120 44 175 43"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

/**
 * High-fidelity cursive signature SVG path for Dean Taylor
 */
const DeanTaylorSignature: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-36 h-10',
  color = '#7C3AED',
}) => (
  <svg
    viewBox="0 0 200 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M18 15C18 35 22 50 24 52C26 54 35 25 55 22C72 19 65 48 50 45C40 43 55 20 75 18C92 16 95 38 102 44C110 50 120 28 135 25C148 22 150 42 162 38C172 35 185 24 192 30"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M60 48C95 46 140 43 180 40"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.65"
    />
  </svg>
);

/**
 * Official Gold Foil Medallion Stamp
 */
const GoldSealBadge: React.FC<{ size?: string }> = ({ size = 'w-16 h-16' }) => (
  <div className={`relative ${size} flex items-center justify-center shrink-0`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
      {/* Outer 24-point star seal */}
      <circle cx="50" cy="50" r="46" fill="#D97706" opacity="0.3" />
      <polygon
        points="50,4 59,16 74,11 78,26 93,28 90,43 100,50 90,57 93,72 78,74 74,89 59,84 50,96 41,84 26,89 22,74 7,72 10,57 0,50 10,43 7,28 22,26 26,11 41,16"
        fill="url(#goldGradient)"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      <circle cx="50" cy="50" r="34" fill="#78350F" stroke="#FDE68A" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#FBBF24" strokeWidth="1" strokeDasharray="3 2" />
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#D97706" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-200">
      <Award className="w-6 h-6 text-amber-300 drop-shadow" />
      <span className="text-[7px] font-mono tracking-widest font-bold uppercase text-amber-100">SEMS</span>
    </div>
  </div>
);

export const CertificateRenderer: React.FC<CertificateRendererProps> = ({
  certificate,
  style = certificate.templateStyle || 'classic_ivory',
  format = certificate.templateFormat || 'html',
  customTitle,
  customSubtitle,
  customAccentColor,
  backgroundImageUrl,
  signatoryName = 'Alex Morgan',
  signatoryTitle = 'Lead Session Administrator',
  adminSignatoryName = 'Prof. Dean Taylor',
  adminSignatoryTitle = 'Faculty Advisor & Institutional Dean',
  watermarkPending = certificate.status === 'pending_approval',
  customSignatureDataUrl,
  customAdminSignatureDataUrl,
}) => {
  const isApproved = certificate.status === 'approved';
  const isPending = certificate.status === 'pending_approval';

  const titleToDisplay = customTitle || certificate.title || 'Certificate of Technical Excellence';
  const subtitleToDisplay =
    customSubtitle ||
    'In recognition of active participation, commendable dedication, and technical merit demonstrated during university society proceedings.';

  // Unified Signature Rendering with Digital Pad & Image upload support
  const renderSignature1 = (color = '#0F766E', className = 'w-36 h-10') => {
    if (!isApproved) {
      return (
        <span className="text-xs font-mono text-amber-700/60 italic flex items-center gap-1 justify-center">
          <Clock className="w-3.5 h-3.5" /> Pending signature
        </span>
      );
    }
    if (customSignatureDataUrl) {
      return (
        <img
          src={customSignatureDataUrl}
          alt={signatoryName}
          className="max-h-11 max-w-[150px] object-contain mx-auto"
        />
      );
    }
    return <AlexMorganSignature color={color} className={`${className} mx-auto`} />;
  };

  const renderSignature2 = (color = '#7C3AED', className = 'w-36 h-10') => {
    if (!isApproved) {
      return (
        <span className="text-xs font-mono text-amber-700/60 italic flex items-center gap-1 justify-center">
          <Clock className="w-3.5 h-3.5" /> Pending signature
        </span>
      );
    }
    if (customAdminSignatureDataUrl) {
      return (
        <img
          src={customAdminSignatureDataUrl}
          alt={adminSignatoryName}
          className="max-h-11 max-w-[150px] object-contain mx-auto"
        />
      );
    }
    return <DeanTaylorSignature color={color} className={`${className} mx-auto`} />;
  };

  // -------------------------------------------------------------
  // TEMPLATE 1: CLASSIC IVORY & GOLD (HTML PARCHMENT)
  // -------------------------------------------------------------
  if (style === 'classic_ivory') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-amber-600/40 bg-[#FAF7EE] text-[#1E293B] p-6 sm:p-10 select-none">
        {/* Ornate Gold Border lines */}
        <div className="absolute inset-2.5 sm:inset-3.5 border-2 border-amber-600/30 rounded-xl pointer-events-none" />
        <div className="absolute inset-4 sm:inset-5 border border-amber-600/20 rounded-lg pointer-events-none" />

        {/* Corner rosettes */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-700 pointer-events-none" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-700 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-700 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-700 pointer-events-none" />

        {/* Watermark if pending */}
        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-25deg] border-4 border-amber-500/40 px-8 py-3 rounded-2xl bg-amber-100/60 backdrop-blur-[2px]">
              <span className="font-poppins font-bold text-2xl sm:text-4xl text-amber-700/60 uppercase tracking-widest">
                Pending Approval
              </span>
            </div>
          </div>
        )}

        {/* Certificate Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-900/15 pb-6">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-white shadow-md shrink-0">
              <Award className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <span className="text-[11px] font-inter font-bold tracking-[0.2em] uppercase text-amber-900 block">
                Official SEMS Accreditation
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {certificate.societyWing || 'University Society Executive Council'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GoldSealBadge />
            <div className="text-right hidden sm:block">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-inter font-semibold ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isApproved ? 'Verified Credential' : 'Awaiting Signatures'}</span>
              </span>
              <span className="block text-[10px] font-mono text-slate-500 mt-1">
                ID: {certificate.verificationCode}
              </span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-serif italic text-sm sm:text-base text-slate-600">
            This official credential is proudly presented to
          </p>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-slate-900 tracking-tight leading-tight py-1 border-b-2 border-amber-600/30 inline-block px-6">
            {certificate.recipientName}
          </h1>
          <p className="font-inter text-xs sm:text-sm text-slate-600 font-medium pt-1">
            Student Roll ID: <span className="font-mono font-bold text-slate-800">{certificate.recipientRoll}</span>
            {certificate.grade && (
              <>
                {' '}· Grade / Distinction: <span className="font-semibold text-amber-800">{certificate.grade}</span>
              </>
            )}
          </p>

          <div className="pt-4 max-w-xl mx-auto space-y-1">
            <p className="font-serif italic text-xs sm:text-sm text-slate-600">
              for meritorious participation and successful completion of
            </p>
            <h3 className="font-serif font-bold text-base sm:text-xl text-amber-900 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-slate-500 leading-relaxed pt-1">
              {subtitleToDisplay}
            </p>
            <p className="font-inter text-xs text-slate-600 font-medium pt-2">
              Issued on: <span className="font-semibold text-slate-800">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        {/* Signatures & Security Stamp Section */}
        <div className="relative z-10 pt-6 border-t border-amber-900/15 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          {/* Signatory 1: Admin */}
          <div className="flex flex-col items-center">
            <div className="h-12 flex items-center justify-center">
              {renderSignature1('#0F766E', 'w-36 h-10')}
            </div>
            <div className="w-36 border-t border-slate-400 pt-1 mt-1" />
            <span className="font-serif font-bold text-xs sm:text-sm text-slate-900 block">
              {signatoryName}
            </span>
            <span className="text-[10px] font-inter text-slate-500 block">
              {signatoryTitle}
            </span>
          </div>

          {/* Central Security & QR Code */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/70 border border-amber-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-slate-700">
                SEMS PKI Secured
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-slate-900 tracking-wider">
              {certificate.verificationCode}
            </span>
            <span className="text-[8px] font-mono text-slate-500 mt-0.5">
              Instant Public Verification
            </span>
          </div>

          {/* Signatory 2: Faculty Dean / Admin */}
          <div className="flex flex-col items-center">
            <div className="h-12 flex items-center justify-center">
              {renderSignature2('#7E22CE', 'w-36 h-10')}
            </div>
            <div className="w-36 border-t border-slate-400 pt-1 mt-1" />
            <span className="font-serif font-bold text-xs sm:text-sm text-slate-900 block">
              {adminSignatoryName}
            </span>
            <span className="text-[10px] font-inter text-slate-500 block">
              {adminSignatoryTitle}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE 2: MODERN TECH & CYBER DARK (HTML)
  // -------------------------------------------------------------
  if (style === 'modern_tech') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border border-emerald-500/30 bg-[#071317] text-white p-6 sm:p-10 select-none">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#10B981 1px, transparent 1px), radial-gradient(#10B981 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Glow corners */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Watermark if pending */}
        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-2 border-amber-400/50 px-8 py-3 rounded-2xl bg-black/70 backdrop-blur-md">
              <span className="font-mono font-bold text-2xl sm:text-3xl text-amber-300 uppercase tracking-widest">
                Awaiting RBAC Approval
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/[0.12] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 border border-emerald-400/40 flex items-center justify-center text-white shadow-lg shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-semibold block">
                Official Digital Credential // SEMS-v3
              </span>
              <h2 className="font-poppins text-lg sm:text-xl font-semibold text-white">
                {certificate.societyWing || 'Robotics & AI Society'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 ${
                isApproved
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/60'
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isApproved ? 'VERIFIED' : 'PENDING'}</span>
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="relative z-10 my-8 text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/80">
            Participant Accreditation
          </span>
          <h1 className="font-poppins font-bold text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-200 tracking-tight leading-tight">
            {certificate.recipientName}
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.10] text-xs font-mono text-emerald-300">
            <span>Roll ID: {certificate.recipientRoll}</span>
            {certificate.grade && (
              <>
                <span>•</span>
                <span>Distinction: {certificate.grade}</span>
              </>
            )}
          </div>

          <div className="pt-4 max-w-xl mx-auto space-y-1.5">
            <p className="font-inter text-xs text-white/60">has satisfactorily participated and completed</p>
            <h3 className="font-poppins font-semibold text-base sm:text-xl text-emerald-400">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-white/60 pt-1">
              Issued: <span className="font-mono text-white/90">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="relative z-10 pt-6 border-t border-white/[0.12] grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#34D399', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-white/20 pt-1" />
            <span className="font-poppins text-xs font-medium text-white">{signatoryName}</span>
            <span className="text-[10px] font-inter text-white/60">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.04] border border-emerald-500/20">
            <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              {certificate.verificationCode}
            </span>
            <span className="text-[9px] font-mono text-white/40 mt-0.5">Tamper-Evident SHA-256 Hash</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#38BDF8', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-white/20 pt-1" />
            <span className="font-poppins text-xs font-medium text-white">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-white/60">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE 3: ROYAL NAVY ACADEMIC (HTML)
  // -------------------------------------------------------------
  if (style === 'royal_navy') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-amber-500/40 bg-gradient-to-br from-[#0B1E38] via-[#09172B] to-[#040C17] text-white p-6 sm:p-10 select-none">
        <div className="absolute inset-3 border border-amber-400/25 rounded-xl pointer-events-none" />
        <div className="absolute inset-4.5 border border-amber-400/15 rounded-lg pointer-events-none" />

        {/* Watermark if pending */}
        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-2 border-amber-400/50 px-8 py-3 rounded-2xl bg-black/70 backdrop-blur-md">
              <span className="font-serif font-bold text-2xl sm:text-3xl text-amber-300 uppercase tracking-widest">
                Pending Approval
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-400/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-serif tracking-widest uppercase text-amber-300/90 font-medium block">
                SEMS Institutional Registry
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                {certificate.societyWing || 'University Society Executive Directorate'}
              </h2>
            </div>
          </div>
          <GoldSealBadge />
        </div>

        {/* Body */}
        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-serif italic text-xs sm:text-sm text-amber-200/80">
            This formal certificate is conferred upon
          </p>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-amber-100 tracking-wide leading-tight">
            {certificate.recipientName}
          </h1>
          <p className="font-mono text-xs text-amber-300/80">
            Roll No: {certificate.recipientRoll} · {certificate.grade || 'Merit Honors'}
          </p>

          <div className="pt-3 max-w-xl mx-auto space-y-1">
            <p className="font-serif italic text-xs text-slate-300">
              in appreciation of meritorious participation in
            </p>
            <h3 className="font-serif font-bold text-base sm:text-xl text-amber-300 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-slate-300/70 pt-1 leading-relaxed">
              {subtitleToDisplay}
            </p>
            <p className="font-inter text-xs text-slate-300 pt-2">
              Conferred on <span className="text-white font-medium">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 border-t border-amber-400/20 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#FDE68A', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-amber-400/30 pt-1" />
            <span className="font-serif text-xs font-bold text-white">{signatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.04] border border-amber-400/20">
            <span className="font-mono text-[11px] text-amber-300 font-bold">{certificate.verificationCode}</span>
            <span className="text-[8px] font-mono text-slate-400">Public Blockchain Anchor</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#FDE68A', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-amber-400/30 pt-1" />
            <span className="font-serif text-xs font-bold text-white">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE: MINIMALIST SLATE & SILVER (HTML)
  // -------------------------------------------------------------
  if (style === 'minimal_monochrome') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-slate-400/40 bg-gradient-to-b from-[#0F172A] to-[#020617] text-white p-6 sm:p-10 select-none">
        <div className="absolute inset-3 border border-slate-500/20 rounded-xl pointer-events-none" />
        <div className="absolute inset-5 border border-slate-500/10 rounded-lg pointer-events-none" />

        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-2 border-slate-400/50 px-8 py-3 rounded-2xl bg-black/75 backdrop-blur-md">
              <span className="font-poppins font-semibold text-2xl sm:text-3xl text-slate-300 uppercase tracking-widest">
                Pending Approval
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-200 shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 block">
                SEMS Minimalist Registry
              </span>
              <h2 className="font-poppins text-lg sm:text-xl font-semibold text-white">
                {certificate.societyWing || 'Executive Student Chapter'}
              </h2>
            </div>
          </div>
          <GoldSealBadge />
        </div>

        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-inter text-xs uppercase tracking-wider text-slate-400">
            This Certificate is Conferred To
          </p>
          <h1 className="font-poppins font-bold text-2xl sm:text-4xl text-white tracking-tight leading-tight">
            {certificate.recipientName}
          </h1>
          <p className="font-mono text-xs text-slate-400">
            Roll: {certificate.recipientRoll} · {certificate.grade || 'Commended Distinction'}
          </p>

          <div className="pt-3 max-w-xl mx-auto space-y-1">
            <p className="font-inter text-xs text-slate-400">
              for verified active attendance and participation in
            </p>
            <h3 className="font-poppins font-semibold text-base sm:text-xl text-slate-200 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-slate-400 pt-1 leading-relaxed">
              {subtitleToDisplay}
            </p>
            <p className="font-mono text-xs text-slate-400 pt-2">
              Issued: <span className="text-white font-medium">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#CBD5E1', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-slate-600 pt-1" />
            <span className="font-poppins text-xs font-medium text-white">{signatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.03] border border-slate-700">
            <span className="font-mono text-[10px] text-slate-300 font-bold">{certificate.verificationCode}</span>
            <span className="text-[8px] font-mono text-slate-500">Cryptographic Seal</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#CBD5E1', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-slate-600 pt-1" />
            <span className="font-poppins text-xs font-medium text-white">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE: EMERALD EXECUTIVE DISTINCTION (HTML)
  // -------------------------------------------------------------
  if (style === 'emerald_executive') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-emerald-500/40 bg-gradient-to-br from-[#062419] via-[#041B13] to-[#010D08] text-white p-6 sm:p-10 select-none">
        <div className="absolute inset-3 border border-emerald-500/30 rounded-xl pointer-events-none" />
        <div className="absolute inset-5 border border-emerald-500/15 rounded-lg pointer-events-none" />

        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-2 border-emerald-400/50 px-8 py-3 rounded-2xl bg-black/75 backdrop-blur-md">
              <span className="font-serif font-bold text-2xl sm:text-3xl text-emerald-300 uppercase tracking-widest">
                Pending Approval
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-emerald-500/25 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-emerald-600/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-serif tracking-widest uppercase text-emerald-300/90 block">
                Executive Leadership Registry
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                {certificate.societyWing || 'Society Executive Directorate'}
              </h2>
            </div>
          </div>
          <GoldSealBadge />
        </div>

        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-serif italic text-xs sm:text-sm text-emerald-200/80">
            Certificate of High Distinction Awarded To
          </p>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-emerald-100 tracking-wide leading-tight">
            {certificate.recipientName}
          </h1>
          <p className="font-mono text-xs text-emerald-300/90">
            Roll: {certificate.recipientRoll} · {certificate.grade || 'Executive Honors'}
          </p>

          <div className="pt-3 max-w-xl mx-auto space-y-1">
            <p className="font-serif italic text-xs text-emerald-300/70">
              in formal commendation of exceptional leadership in
            </p>
            <h3 className="font-serif font-bold text-base sm:text-xl text-emerald-300 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-emerald-100/70 pt-1 leading-relaxed">
              {subtitleToDisplay}
            </p>
            <p className="font-inter text-xs text-emerald-300/90 pt-2">
              Conferred on <span className="text-white font-medium">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-emerald-500/25 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#6EE7B7', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-emerald-500/30 pt-1" />
            <span className="font-serif text-xs font-bold text-white">{signatoryName}</span>
            <span className="text-[10px] font-inter text-emerald-200/70">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.04] border border-emerald-500/30">
            <span className="font-mono text-[11px] text-emerald-300 font-bold">{certificate.verificationCode}</span>
            <span className="text-[8px] font-mono text-emerald-400/60">SEMS Executive Ledger</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#6EE7B7', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-emerald-500/30 pt-1" />
            <span className="font-serif text-xs font-bold text-white">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-emerald-200/70">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE: CRIMSON HERITAGE SCROLL (IMAGE CANVAS FORMAT)
  // -------------------------------------------------------------
  if (style === 'crimson_heritage') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-rose-700/50 bg-[#FFF7F7] text-slate-900 p-6 sm:p-10 select-none">
        <div className="absolute inset-3 border-2 border-rose-800/30 rounded-xl pointer-events-none" />
        <div className="absolute inset-5 border border-rose-800/20 rounded-lg pointer-events-none" />

        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-4 border-rose-700/40 px-8 py-3 rounded-2xl bg-rose-100/80 backdrop-blur-sm">
              <span className="font-serif font-bold text-2xl sm:text-3xl text-rose-900 uppercase tracking-widest">
                Pending RBAC Approval
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-rose-900/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-rose-800 to-rose-950 flex items-center justify-center text-rose-100 shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-serif font-bold tracking-[0.25em] uppercase text-rose-900 block">
                Heritage & Honors Fellowship
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                {certificate.societyWing || 'University Society Heritage Assembly'}
              </h2>
            </div>
          </div>
          <GoldSealBadge />
        </div>

        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-serif italic text-xs sm:text-sm text-slate-600">
            By formal decree of the Assembly, this certificate is presented to
          </p>
          <h1 className="font-serif font-bold text-2xl sm:text-4xl text-rose-950 tracking-tight leading-tight border-b-2 border-rose-800/30 inline-block px-8 py-1">
            {certificate.recipientName}
          </h1>
          <p className="font-mono text-xs text-rose-900 font-semibold pt-1">
            Roll: {certificate.recipientRoll} · {certificate.grade || 'First Class Distinction'}
          </p>

          <div className="pt-4 max-w-xl mx-auto space-y-1">
            <p className="font-serif italic text-xs text-slate-600">
              in appreciation of meritorious participation and dedicated service to
            </p>
            <h3 className="font-serif font-bold text-base sm:text-xl text-rose-900 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-slate-600 pt-1 leading-relaxed">
              {subtitleToDisplay}
            </p>
            <p className="font-inter text-xs text-slate-700 font-semibold pt-2">
              Conferred: <span>{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-rose-900/20 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#881337', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-rose-800/30 pt-1" />
            <span className="font-serif font-bold text-xs text-slate-900">{signatoryName}</span>
            <span className="text-[10px] font-inter text-slate-500">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/90 border border-rose-800/30 shadow-sm">
            <span className="font-mono text-[11px] font-bold text-rose-950 tracking-wider">
              {certificate.verificationCode}
            </span>
            <span className="text-[8px] font-mono text-slate-500 mt-0.5">Heritage Seal Verified</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#881337', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-rose-800/30 pt-1" />
            <span className="font-serif font-bold text-xs text-slate-900">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-slate-500">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE: SAPPHIRE TECH SPRINT (HTML)
  // -------------------------------------------------------------
  if (style === 'sapphire_vector') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-blue-500/40 bg-gradient-to-br from-[#061838] via-[#05132B] to-[#020A17] text-white p-6 sm:p-10 select-none">
        <div className="absolute inset-3 border border-blue-400/25 rounded-xl pointer-events-none" />
        <div className="absolute inset-5 border border-cyan-400/15 rounded-lg pointer-events-none" />

        {watermarkPending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="rotate-[-20deg] border-2 border-cyan-400/50 px-8 py-3 rounded-2xl bg-black/75 backdrop-blur-md">
              <span className="font-mono font-bold text-2xl sm:text-3xl text-cyan-300 uppercase tracking-widest">
                Pending Approval
              </span>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-blue-500/30 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-cyan-300 shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 block">
                Technical Sprint Accreditation
              </span>
              <h2 className="font-poppins text-lg sm:text-xl font-bold text-white">
                {certificate.societyWing || 'Technology & Engineering Council'}
              </h2>
            </div>
          </div>
          <GoldSealBadge />
        </div>

        <div className="relative z-10 my-8 text-center space-y-3">
          <p className="font-mono text-xs uppercase tracking-wider text-cyan-300/80">
            Verified Credentials Issued To
          </p>
          <h1 className="font-poppins font-bold text-2xl sm:text-4xl text-white tracking-tight leading-tight">
            {certificate.recipientName}
          </h1>
          <p className="font-mono text-xs text-cyan-300">
            Roll: {certificate.recipientRoll} · {certificate.grade || 'Code Sprint Merit'}
          </p>

          <div className="pt-3 max-w-xl mx-auto space-y-1">
            <p className="font-inter text-xs text-slate-300">
              for exemplary engineering performance and participation in
            </p>
            <h3 className="font-poppins font-bold text-base sm:text-xl text-cyan-300 leading-snug">
              {certificate.sessionTitle}
            </h3>
            <p className="font-inter text-xs text-slate-300/80 pt-1 leading-relaxed">
              {subtitleToDisplay}
            </p>
            <p className="font-mono text-xs text-slate-300 pt-2">
              Timestamp: <span className="text-white font-medium">{certificate.issueDate}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-blue-500/30 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature1('#38BDF8', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-cyan-400/30 pt-1" />
            <span className="font-poppins text-xs font-bold text-white">{signatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{signatoryTitle}</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.04] border border-cyan-500/30">
            <span className="font-mono text-[11px] text-cyan-300 font-bold">{certificate.verificationCode}</span>
            <span className="text-[8px] font-mono text-slate-400">SHA-256 Validated</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-10 flex items-center justify-center">
              {renderSignature2('#38BDF8', 'w-32 h-8')}
            </div>
            <div className="w-32 border-t border-cyan-400/30 pt-1" />
            <span className="font-poppins text-xs font-bold text-white">{adminSignatoryName}</span>
            <span className="text-[10px] font-inter text-slate-400">{adminSignatoryTitle}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE 4 & 5: ORNATE IMAGE FRAME / GRAPHIC CANVAS (IMAGE FORMAT)
  // Authentic Graphic Certificate Frame with Dynamic Text Superimposed
  // -------------------------------------------------------------
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all border-4 border-[#C5A059] bg-[#FAF8F5] text-[#1E293B] p-6 sm:p-10 select-none">
      {/* Background Graphic Watermark Pattern */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="guilloche" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="28" fill="none" stroke="#854D0E" strokeWidth="0.8" />
            <circle cx="30" cy="30" r="18" fill="none" stroke="#854D0E" strokeWidth="0.5" />
            <path d="M0 30 Q 15 10 30 30 T 60 30" fill="none" stroke="#854D0E" strokeWidth="0.5" />
            <path d="M30 0 Q 10 15 30 30 T 30 60" fill="none" stroke="#854D0E" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#guilloche)" />
      </svg>

      {/* Ornate Frame Border SVG Overlay */}
      <div className="absolute inset-3 border-2 border-[#C5A059] rounded-xl pointer-events-none" />
      <div className="absolute inset-5 border border-[#854D0E]/30 rounded-lg pointer-events-none" />

      {/* Corner Ornate Flourishes */}
      <div className="absolute top-4 left-4 text-[#854D0E] font-serif text-lg pointer-events-none">⚜</div>
      <div className="absolute top-4 right-4 text-[#854D0E] font-serif text-lg pointer-events-none">⚜</div>
      <div className="absolute bottom-4 left-4 text-[#854D0E] font-serif text-lg pointer-events-none">⚜</div>
      <div className="absolute bottom-4 right-4 text-[#854D0E] font-serif text-lg pointer-events-none">⚜</div>

      {/* Watermark if pending */}
      {watermarkPending && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="rotate-[-20deg] border-4 border-amber-600/40 px-8 py-3 rounded-2xl bg-amber-50/70 backdrop-blur-sm">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-amber-800 uppercase tracking-widest">
              Pending RBAC Approval
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#C5A059]/40 pb-5">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#854D0E] to-[#B45309] flex items-center justify-center text-amber-200 shadow-md shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-serif font-bold tracking-[0.25em] uppercase text-[#854D0E] block">
              Image Graphic Canvas Accreditation
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {certificate.societyWing || 'University Society Accreditation Board'}
            </h2>
          </div>
        </div>
        <GoldSealBadge />
      </div>

      {/* Superimposed Dynamic Data on Graphic Template */}
      <div className="relative z-10 my-8 text-center space-y-3">
        <p className="font-serif italic text-xs sm:text-sm text-slate-600">
          This certificate is officially and dynamically awarded to
        </p>
        <h1 className="font-serif font-bold text-2xl sm:text-4xl text-[#1E293B] tracking-tight leading-tight border-b-2 border-[#C5A059]/40 inline-block px-8 py-1">
          {certificate.recipientName}
        </h1>
        <p className="font-mono text-xs text-slate-700 font-semibold pt-1">
          Roll Identifier: {certificate.recipientRoll} · {certificate.grade || 'First Class Distinction'}
        </p>

        <div className="pt-4 max-w-xl mx-auto space-y-1">
          <p className="font-serif italic text-xs text-slate-600">
            for exemplary accomplishment and technical excellence in
          </p>
          <h3 className="font-serif font-bold text-base sm:text-xl text-[#854D0E] leading-snug">
            {certificate.sessionTitle}
          </h3>
          <p className="font-inter text-xs text-slate-600 pt-1 leading-relaxed">
            {subtitleToDisplay}
          </p>
          <p className="font-inter text-xs text-slate-700 font-semibold pt-2">
            Dated: <span>{certificate.issueDate}</span>
          </p>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="relative z-10 pt-6 border-t border-[#C5A059]/40 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
        <div className="flex flex-col items-center">
          <div className="h-10 flex items-center justify-center">
            {renderSignature1('#854D0E', 'w-32 h-8')}
          </div>
          <div className="w-32 border-t border-slate-400 pt-1" />
          <span className="font-serif font-bold text-xs text-slate-900">{signatoryName}</span>
          <span className="text-[10px] font-inter text-slate-500">{signatoryTitle}</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/80 border border-[#C5A059] shadow-sm">
          <span className="font-mono text-[11px] font-bold text-slate-900 tracking-wider">
            {certificate.verificationCode}
          </span>
          <span className="text-[8px] font-mono text-slate-500 mt-0.5">
            Tamper-Evident Graphic Template
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-10 flex items-center justify-center">
            {renderSignature2('#854D0E', 'w-32 h-8')}
          </div>
          <div className="w-32 border-t border-slate-400 pt-1" />
          <span className="font-serif font-bold text-xs text-slate-900">{adminSignatoryName}</span>
          <span className="text-[10px] font-inter text-slate-500">{adminSignatoryTitle}</span>
        </div>
      </div>
    </div>
  );
};
