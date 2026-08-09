'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, AlertTriangle, Info, Bell } from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';

export default function BroadcastBanner() {
  const systemBroadcast = useRoomStore((state) => state.systemBroadcast);
  const dismissBroadcast = useRoomStore((state) => state.dismissBroadcast);

  if (!systemBroadcast) return null;

  const isAlert = systemBroadcast.type === 'alert';
  const isWarning = systemBroadcast.type === 'warning';

  const bgColor = isAlert
    ? 'bg-[#EF4444] text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
    : isWarning
    ? 'bg-[#FFD600] text-black shadow-[0_0_30px_rgba(255,214,0,0.4)]'
    : 'bg-[#3B82F6] text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]';

  const iconColor = isAlert ? 'text-white' : isWarning ? 'text-black' : 'text-white';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 flex items-center justify-between gap-3 ${bgColor}`}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-1.5 rounded-lg bg-black/15">
              <Radio className={`w-4 h-4 animate-pulse ${iconColor}`} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs">
              <span className="font-black uppercase tracking-wider text-[11px] underline">
                {systemBroadcast.title || 'System Announcement'}:
              </span>
              <span className="font-semibold">{systemBroadcast.message}</span>
              {systemBroadcast.timestamp && (
                <span className="opacity-75 text-[10px] font-mono sm:ml-2">
                  ({systemBroadcast.timestamp})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={dismissBroadcast}
            className="p-1 rounded-lg hover:bg-black/15 transition-all flex-shrink-0 cursor-pointer"
            title="Dismiss Announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
