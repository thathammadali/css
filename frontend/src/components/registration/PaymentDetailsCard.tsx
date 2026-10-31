import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PaymentDetails } from '../../types';

interface PaymentDetailsCardProps {
  details?: PaymentDetails;
  isPaid?: boolean;
}

export const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({ details, isPaid = true }) => {
  const [copied, setCopied] = useState(false);

  if (!isPaid || !details || (!details.accountTitle && !details.accountNumber)) return null;

  const handleCopy = async () => {
    if (!details.accountNumber) return;
    try {
      await navigator.clipboard.writeText(details.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-left space-y-2">
      <p className="text-xs font-semibold text-white">Send your payment to</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {details.method && (
          <>
            <dt className="text-white/50">Method</dt>
            <dd className="text-white">{details.method}</dd>
          </>
        )}
        {details.accountTitle && (
          <>
            <dt className="text-white/50">Account title</dt>
            <dd className="text-white">{details.accountTitle}</dd>
          </>
        )}
        {details.accountNumber && (
          <>
            <dt className="text-white/50">Account number</dt>
            <dd className="text-white font-mono flex items-center gap-2 flex-wrap">
              <span>{details.accountNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.08] border border-white/[0.12] text-[11px] text-white/80 hover:bg-white/[0.14]"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </dd>
          </>
        )}
      </dl>
      {details.instructions && (
        <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">{details.instructions}</p>
      )}
    </div>
  );
};
