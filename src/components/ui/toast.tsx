'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from './card';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const bgColors = {
    success: 'bg-neo-green text-neo-dark border-neo-dark',
    error: 'bg-neo-red text-white border-neo-dark',
    info: 'bg-neo-blue text-white border-neo-dark',
    warning: 'bg-neo-yellow text-neo-dark border-neo-dark',
  };

  const Icons = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="mb-3 w-full pointer-events-auto"
    >
      <div
        className={`flex items-center gap-3 border-[3px] rounded-[12px] p-4 shadow-neo-sm font-semibold select-none ${bgColors[type]}`}
      >
        {Icons[type]}
        <div className="flex-1 text-xs sm:text-sm min-w-0 break-all leading-normal pr-1">{message}</div>
        <button
          onClick={() => onClose(id)}
          className="p-0.5 border-[2px] border-neo-dark bg-white/20 hover:bg-white/40 rounded transition-colors flex-shrink-0"
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
