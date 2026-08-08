'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Card from './card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#111111]/40 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`w-full ${sizeClasses[size]} z-10`}
          >
            <Card variant="white" hasShadow shadowSize="lg" className="w-full relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b-[3px] border-neo-dark p-4 bg-neo-yellow">
                <h3 className="font-archivo text-lg text-neo-dark uppercase tracking-wider">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 border-[2px] border-neo-dark bg-white rounded-md hover:bg-cream active:translate-y-[1px] active:translate-x-[1px] transition-all"
                >
                  <X className="w-5 h-5 text-neo-dark" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[75vh] overflow-y-auto bg-cream">
                {children}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default Modal;
