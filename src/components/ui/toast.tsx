'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const styles = {
    success: { bg: 'bg-[#22C55E]/15 border-[#22C55E]/30', icon: 'text-[#22C55E]', text: 'text-[#f4f4f5]' },
    error:   { bg: 'bg-[#EF4444]/15 border-[#EF4444]/30', icon: 'text-[#EF4444]', text: 'text-[#f4f4f5]' },
    info:    { bg: 'bg-[#4F7CFF]/15 border-[#4F7CFF]/30', icon: 'text-[#4F7CFF]', text: 'text-[#f4f4f5]' },
    warning: { bg: 'bg-[#FFD600]/15 border-[#FFD600]/30', icon: 'text-[#FFD600]', text: 'text-[#f4f4f5]' },
  };

  const Icons = {
    success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
    error:   <AlertCircle className="w-4 h-4 flex-shrink-0" />,
    info:    <Info className="w-4 h-4 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
  };

  const s = styles[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="mb-2 w-full pointer-events-auto"
    >
      <div
        className={`flex items-center gap-3 border rounded-2xl px-4 py-3 backdrop-blur-xl ${s.bg}`}
        style={{ background: 'rgba(15,15,16,0.85)' }}
      >
        <span className={s.icon}>{Icons[type]}</span>
        <div className={`flex-1 text-sm min-w-0 break-words leading-normal ${s.text}`}>{message}</div>
        <button
          onClick={() => onClose(id)}
          className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useRoomStore((state) => state.toasts);
  const removeToast = useRoomStore((state) => state.removeToast);

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 flex flex-col items-end pointer-events-none md:w-80 md:max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
export default ToastContainer;
