/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useCallback } from 'react';

interface UseModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  preventScroll?: boolean;
}

/**
 * Universal hook to handle Escape key dismissal, backdrop click dismissal,
 * and background scroll lock for all modal dialogs in SEMS.
 */
export function useModalDismiss({
  isOpen,
  onClose,
  preventScroll = true,
}: UseModalDismissOptions) {
  // Handle Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (!isOpen || !preventScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, preventScroll]);

  // Click on modal backdrop helper (ensures clicks on the outer container dismiss, but inner content clicks don't)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return { handleBackdropClick };
}
