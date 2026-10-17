import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StatusToastProps {
  message: string | null;
  onClose: () => void;
}

export const StatusToast: React.FC<StatusToastProps> = ({ message, onClose }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-auto z-50 flex items-center justify-center pointer-events-auto"
        >
          <div
            id="status-toast"
            role="status"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#062456]/90 border border-white/[0.18] shadow-lg backdrop-blur-md text-white font-inter text-[13px]"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#108E99]" />
            <span className="text-[#C9CAB6]">{message}</span>
            <button
              onClick={onClose}
              type="button"
              className="ml-2 text-white/60 hover:text-white transition-colors cursor-pointer text-xs"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
