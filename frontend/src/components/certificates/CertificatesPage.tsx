import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CertificateItem, DashboardRole, RegistrantItem, UserRole } from '../../types';
import { CertificateRenderer } from './CertificateRenderer';
import { certificateApi } from '../../services/certificateApi';
import { eventService } from '../../services/eventService';

interface CertificatesPageProps {
  currentRole: DashboardRole;
  currentUser?: { name: string; email: string; role: UserRole; isLoggedIn?: boolean } | null;
  certificates: CertificateItem[];
  registrants: RegistrantItem[];
  targetCertificateId?: string | null;
  isVerifyMode?: boolean;
  onIssueNewCertificates?: (newCerts: CertificateItem[]) => void;
  onUpdateCertificates?: (updated: CertificateItem[]) => void;
  onUpdateRegistrants?: (updated: RegistrantItem[]) => void;
  onBack: () => void;
  onNotify: (msg: string) => void;
}

export const CertificatesPage: React.FC<CertificatesPageProps> = ({
  currentRole,
  currentUser,
  registrants,
  targetCertificateId,
  isVerifyMode = false,
  onIssueNewCertificates,
  onUpdateCertificates,
  onUpdateRegistrants,
  onBack,
  onNotify,
}) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const [items, setItems] = useState<CertificateItem[]>([]);
  const [active, setActive] = useState<CertificateItem | null>(null);
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<CertificateItem | null>(null);
  const [reason, setReason] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    recipient_name?: string;
    event_title?: string;
    category?: string;
    issued_at?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkEventId, setBulkEventId] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);
  const events = eventService.getEvents();

  const sync = (next: CertificateItem[]) => {
    setItems(next);
    setActive(next[0] || null);
    onUpdateCertificates?.(next);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loaded = isVerifyMode
          ? []
          : isAdmin
          ? (await Promise.all(events.map((event) => certificateApi.listForEvent(event.id)))).flat()
          : await certificateApi.mine();
        const unique = Array.from(
          new Map(loaded.map((item) => [item.id || item.verificationCode, item])).values()
        );
        if (mounted) sync(unique);
      } catch (loadError: any) {
        if (mounted && !isVerifyMode) onNotify(loadError?.message || 'Failed to load certificates.');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isAdmin, isVerifyMode]);

  useEffect(() => {
    if (!isVerifyMode || !targetCertificateId) return;
    certificateApi
      .verify(targetCertificateId)
      .then(setVerifyResult)
      .catch((verifyError: any) => setVerifyResult({ valid: false, ...(verifyError?.message ? {} : {}) }));
  }, [isVerifyMode, targetCertificateId]);

  const visibleItems = useMemo(() => {
    return items;
  }, [items]);

  const run = async (action: () => Promise<CertificateItem[] | CertificateItem>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      const additions = Array.isArray(result) ? result : [result];
      const next = [...additions, ...items.filter((item) => !additions.some((added) => added.id === item.id))];
      sync(next);
      onIssueNewCertificates?.(additions);
      onNotify('Certificate records updated.');
    } catch (actionError: any) {
      setError(actionError?.message || 'Certificate action failed.');
      onNotify(actionError?.message || 'Certificate action failed.');
    } finally {
      setBusy(false);
    }
  };

  const issueAll = (eventId: string) =>
    run(() => certificateApi.issueToAttended(eventId, category.trim() || null));

  const issueSelected = (eventId: string) =>
    run(() => certificateApi.issueTo(eventId, selected, category.trim() || null));

  const uploadBulk = async (eventId: string, file: File) => {
    if (file.size > 1_000_000 || !file.name.toLowerCase().endsWith('.csv')) {
      setError('Upload a CSV file up to 1 MB.');
      return;
    }
    await run(() => certificateApi.bulkUpload(eventId, file));
  };

  const revoke = async () => {
    if (!revokeTarget || reason.trim().length < 3 || reason.trim().length > 300) {
      setError('Revocation reason must be between 3 and 300 characters.');
      return;
    }
    await run(async () => {
      const updated = await certificateApi.revoke(revokeTarget.id, reason.trim());
      setRevokeTarget(null);
      setReason('');
      return updated;
    });
  };

  if (isVerifyMode) {
    return (
      <section className="glass-panel rounded-2xl p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-white">Certificate verification</h1>
        {!verifyResult ? (
          <p className="mt-4 text-white/70">Checking certificate code...</p>
        ) : verifyResult.valid ? (
          <div className="mt-4 space-y-2 text-sm text-white">
            <p className="text-emerald-300 font-semibold">Valid certificate</p>
            <p>Name: {verifyResult.recipient_name}</p>
            <p>Event: {verifyResult.event_title}</p>
            <p>Category: {verifyResult.category || 'Not specified'}</p>
            <p>Issued: {verifyResult.issued_at ? new Date(verifyResult.issued_at).toLocaleDateString() : 'Not specified'}</p>
          </div>
        ) : (
          <p className="mt-4 text-rose-300">This certificate is invalid or revoked.</p>
        )}
        <button type="button" onClick={onBack} className="mt-6 px-4 py-2 rounded-lg bg-white/10 text-white">
          Back
        </button>
      </section>
    );
  }

  return (
    <section id="certificates-page" className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Certificates</h1>
          <p className="text-sm text-white/60">Backend-issued certificates and public verification codes.</p>
        </div>
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-lg bg-white/10 text-white">Back</button>
      </div>

      {error && <p className="rounded-lg bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">{error}</p>}

      {isAdmin && (
        <div className="glass-panel rounded-2xl p-4 space-y-4">
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Certificate category (optional)"
            maxLength={100}
            className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white"
          />
          {events.map((event) => {
            const eventRegistrants = registrants.filter((reg) => reg.eventId === event.id && reg.backendStatus === 'CONFIRMED' && reg.attended);
            return (
              <div key={event.id} className="rounded-xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium text-white">{event.title}</h2>
                  <span className="text-xs text-white/60">{eventRegistrants.length} attended</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => issueAll(event.id)} className="px-3 py-2 rounded-lg bg-emerald-600/80 text-white disabled:opacity-50">
                    Issue to all attended
                  </button>
                  <button type="button" disabled={busy || selected.length === 0} onClick={() => issueSelected(event.id)} className="px-3 py-2 rounded-lg bg-cyan-600/80 text-white disabled:opacity-50">
                    Issue selected
                  </button>
                  <input
                    ref={csvRef}
                    type="file"
                    accept=".csv"
                    onChange={(input) => input.target.files?.[0] && uploadBulk(event.id, input.target.files[0])}
                    className="max-w-[220px] text-xs text-white/70"
                  />
                </div>
                <div className="space-y-1">
                  {eventRegistrants.map((reg) => (
                    <label key={reg.id} className="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={selected.includes(reg.backendUserId || reg.id)}
                        onChange={() => {
                          const userId = reg.backendUserId || reg.id;
                          setSelected((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
                        }}
                      />
                      {reg.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setActive(item)} className={`w-full text-left rounded-xl border p-3 ${active?.id === item.id ? 'border-cyan-400 bg-cyan-950/30' : 'border-white/10 bg-white/[0.03]'}`}>
              <p className="text-white font-medium">{item.recipientName}</p>
              <p className="text-xs text-white/60">{item.eventName || item.sessionTitle} · {item.verificationCode}</p>
              <p className={`text-xs ${item.isValid ? 'text-emerald-300' : 'text-rose-300'}`}>{item.isValid ? 'Issued' : 'Revoked'}</p>
            </button>
          ))}
          {visibleItems.length === 0 && <p className="text-sm text-white/60">No certificates found.</p>}
        </div>

        {active && (
          <div className="space-y-3">
            <div className="no-print flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-lg bg-cyan-600/80 text-white"
              >
                Print / Save as PDF
              </button>
            </div>
            <div id="printable-certificate">
              <CertificateRenderer certificate={active} />
            </div>
            <p className="text-sm text-white">Certificate code: <strong>{active.verificationCode}</strong></p>
            {isAdmin && (
              <div className="flex gap-2">
                {active.isValid ? (
                  <button type="button" onClick={() => setRevokeTarget(active)} className="px-3 py-2 rounded-lg bg-rose-600/80 text-white">Revoke</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => run(() => certificateApi.reinstate(active.id))} className="px-3 py-2 rounded-lg bg-emerald-600/80 text-white">Reinstate</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 p-5 space-y-3">
            <h2 className="text-white font-semibold">Revoke certificate</h2>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Reason (3 to 300 characters)" className="w-full min-h-24 rounded-lg bg-white/10 border border-white/15 p-3 text-white" />
            <p className="text-xs text-white/60">{reason.length}/300</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRevokeTarget(null)} className="px-3 py-2 rounded-lg bg-white/10 text-white">Cancel</button>
              <button type="button" onClick={revoke} disabled={busy} className="px-3 py-2 rounded-lg bg-rose-600/80 text-white disabled:opacity-50">Revoke</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
