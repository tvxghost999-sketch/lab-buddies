'use client';

import React from 'react';
import { useRoomStore } from '@/store/roomStore';
import Button from '@/components/ui/button';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal() {
  const confirmDialog = useRoomStore((state) => state.confirmDialog);

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const { title, message, onConfirm, onCancel } = confirmDialog;

  const isDestructive =
    message.toLowerCase().includes('delete') ||
    message.toLowerCase().includes('remove') ||
    message.toLowerCase().includes('clear') ||
    message.toLowerCase().includes('scrubbed') ||
    message.toLowerCase().includes('leave');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="max-w-sm w-full rounded-2xl border border-white/[0.08] bg-[#0f0f10] shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-6 flex flex-col items-center gap-5 text-center"
        >
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDestructive
                ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20'
                : 'bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/20'
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <HelpCircle className="w-6 h-6" />
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-[#f4f4f5]">
              {title || 'Confirm Action'}
            </h3>
            <p className="text-sm text-[#71717a] leading-relaxed">
              {message}
            </p>
          </div>

          {/* Buttons */}
          <div className="w-full flex gap-3 mt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-sm font-medium text-[#a1a1aa] hover:bg-white/[0.06] hover:text-[#f4f4f5] transition-all"
            >
              Cancel
            </button>
            <Button
              onClick={onConfirm}
              variant={isDestructive ? 'red' : 'yellow'}
              size="sm"
              className="flex-1 py-2.5 justify-center"
            >
              Confirm
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
