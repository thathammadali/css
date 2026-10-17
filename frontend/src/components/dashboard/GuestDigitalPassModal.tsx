/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { RegistrantItem, SessionItem } from '../../types';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface GuestDigitalPassModalProps {
  isOpen: boolean;
  registrant: RegistrantItem;
  session?: SessionItem;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const GuestDigitalPassModal: React.FC<GuestDigitalPassModalProps> = ({
  isOpen,
  registrant,
  session,
  onClose,
  onNotify,
}) => {
  const [copied, setCopied] = React.useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const passId = `PASS-${registrant.id.toUpperCase()}-${(registrant.rollNumber || 'GUEST').replace(/[^a-zA-Z0-9]/g, '')}`;
  const isPaid = registrant.isPaid || (registrant.amount && !registrant.amount.toLowerCase().includes('free'));
  const isApproved = registrant.status === 'approved' || registrant.lifecycleStatus === 'CONFIRMED' || registrant.lifecycleStatus === 'ATTENDED';

  const copyPassId = () => {
    navigator.clipboard.writeText(passId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify('Pass Identifier copied to clipboard!');
  };

  const handleDownloadPassPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark sleek background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGrad.addColorStop(0, '#091824');
    bgGrad.addColorStop(0.5, '#0E2938');
    bgGrad.addColorStop(1, '#06151E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 700);

    // Cyan-emerald glowing border
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 640);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, 1120, 620);

    // Header
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText('SEMS — OFFICIAL DIGITAL EVENT PASS', 70, 90);

    // Pass Type Badge
    ctx.fillStyle = '#10B981';
    ctx.fillRect(940, 65, 190, 36);
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED ADMISSION', 1035, 88);
    ctx.textAlign = 'left';

    // Session Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Poppins", sans-serif';
    ctx.fillText(registrant.sessionTitle, 70, 170);

    // Attendee Name
    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('PASS HOLDER / ATTENDEE', 70, 230);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 32px "Poppins", sans-serif';
    ctx.fillText(registrant.name, 70, 275);

    // Roll / Identifier & Role
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px "Inter", monospace';
    ctx.fillText(`Identifier: ${registrant.rollNumber || 'GUEST ACCREDITED'}`, 70, 320);

    // Schedule details
    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('DATE & TIME', 70, 380);
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 20px "Inter", sans-serif';
    const sessionSchedule = session
      ? `${session.date}${session.time ? ` · ${session.time}` : ''}`
      : 'Scheduled Session Time';
    ctx.fillText(sessionSchedule, 70, 410);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText('VENUE / LOCATION', 420, 380);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText(session?.location || 'Main Auditorium & Virtual Pod Alpha', 420, 410);

    // Pass ID Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(70, 480, 600, 60);
    ctx.strokeRect(70, 480, 600, 60);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px "Inter", monospace';
    ctx.fillText(`PASS ID: ${passId}`, 90, 518);

    // Right side QR placeholder box
    const qrX = 860;
    const qrY = 170;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX, qrY, 240, 240);

    // Stylized QR pattern
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(qrX + 20, qrY + 20, 60, 60);
    ctx.fillRect(qrX + 160, qrY + 20, 60, 60);
    ctx.fillRect(qrX + 20, qrY + 160, 60, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX + 35, qrY + 35, 30, 30);
    ctx.fillRect(qrX + 175, qrY + 35, 30, 30);
    ctx.fillRect(qrX + 35, qrY + 175, 30, 30);

    // Matrix dots
    ctx.fillStyle = '#0F172A';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(qrX + 90 + c * 8, qrY + 90 + r * 8, 6, 6);
        }
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN FOR GATE ACCESS', qrX + 120, qrY + 270);
    ctx.textAlign = 'left';

    // Footer note
    ctx.fillStyle = '#64748B';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('SEMS Security Protocol • Non-transferable ticket • Validated upon physical entry', 70, 610);

    // Export & download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SEMS_Digital_Pass_${registrant.name.replace(/\s+/g, '_')}_${passId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onNotify('Digital Pass image downloaded successfully!');
      }
    }, 'image/png');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="w-full max-w-2xl p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] shadow-2xl space-y-5 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center border border-teal-200 dark:border-teal-800">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-base text-[#172B3A] dark:text-[#F1F5F9]">Digital Event Pass (E-Ticket)</h3>
              <p className="text-[11px] text-[#64748B] dark:text-[#A8B5C7] font-inter">
                Official contact-free admission pass for session check-in
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

        {/* The Digital Pass Card */}
        <div
          ref={cardRef}
          className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-[#0c2333] via-[#091824] to-[#04121a] p-6 shadow-2xl text-white space-y-5"
        >
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">
                SOCIETY EVENT MANAGEMENT SYSTEM
              </span>
              <h4 className="font-poppins text-lg sm:text-xl font-bold text-white mt-0.5">
                {registrant.sessionTitle}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isApproved ? 'CONFIRMED ADMISSION' : 'SEAT PENDING REVIEW'}</span>
              </span>
            </div>
          </div>

          {/* Attendee Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2 space-y-3">
              <div>
                <span className="text-[11px] text-white/50 block">Attendee Name</span>
                <span className="text-lg font-semibold text-cyan-300">{registrant.name}</span>
                <span className="text-xs font-mono text-white/70 block mt-0.5">
                  Roll / ID: {registrant.rollNumber || 'GUEST-001'} &bull; {registrant.email}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-white/50 block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-300" /> Date & Time
                  </span>
                  <span className="font-medium text-amber-200 block mt-0.5">
                    {session ? `${session.date}${session.time ? ` · ${session.time}` : ''}` : 'Oct 15, 2026 · 14:00'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-white/50 block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-300" /> Venue / Pod
                  </span>
                  <span className="font-medium text-white/90 block mt-0.5">
                    {session?.location || 'Main Auditorium A-102'}
                  </span>
                </div>
              </div>

              {/* Pass ID with copy button */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-white/50 block">Security Pass Code:</span>
                  <span className="font-bold text-cyan-300">{passId}</span>
                </div>
                <button
                  type="button"
                  onClick={copyPassId}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* QR Code Column */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-slate-900 text-center shadow-lg">
              <div className="p-2 bg-slate-900 rounded-xl text-white mb-2">
                <QrCode className="w-24 h-24" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-700">
                GATE SCANNER QR
              </span>
              <span className="text-[9px] text-slate-500">Contactless Check-in</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>Non-transferable digital credential</span>
            <span className="font-mono text-emerald-400">SEMS Gate Verified</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-[#64748B] dark:text-[#A8B5C7]">
            Present this pass on your mobile screen or bring a printout for entry.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPassPng}
              className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-xs font-semibold text-white cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG Pass</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-[#172B3A] dark:text-[#F1F5F9] border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-500" />
              <span>Print Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
