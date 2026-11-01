import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../services/apiClient';

const MIN_LENGTH = 8;
const inputClass =
  'w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.14] text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]';
const labelClass = 'block text-xs font-medium text-white mb-1.5';

export const ChangePasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsSaving(true);
    try {
      const message = await authApi.changePassword(currentPassword, newPassword);
      setSuccess(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Could not update the password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-4"
    >
      <h3 className="font-poppins font-semibold text-white text-sm flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-amber-300" />
        <span>Change password</span>
      </h3>

      <div>
        <label htmlFor="current-password" className={labelClass}>Current password</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="new-password" className={labelClass}>New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
        className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
};
