'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scale, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function TermsConsentModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isAccepted = localStorage.getItem('labbuddies_terms_accepted');
    if (!isAccepted) setIsOpen(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('labbuddies_terms_accepted', 'true');
    setIsOpen(false);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#0f0f10] shadow-[0_32px_80px_rgba(0,0,0,0.9)] p-6 sm:p-8 flex flex-col items-center gap-6 text-center max-h-[90vh] overflow-y-auto"
        >
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#FFD600]/15 border border-[#FFD600]/25 flex items-center justify-center">
            <Scale className="w-7 h-7 text-[#FFD600]" />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-[#f4f4f5]">
              Welcome to Lab Buddies
            </h2>
            <p className="text-sm text-[#71717a] leading-relaxed">
              Before entering our ephemeral study rooms, please read and accept our terms to ensure safe and secure collaboration.
            </p>
          </div>

          {/* Points */}
          <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 text-left">
            {[
              'All shared data is temporary and self-destructs on room expiry.',
              "You agree to uphold your school's Academic Integrity codes.",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-[#a1a1aa]">
                <CheckCircle className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/[0.06]">
              <Link href="/terms" target="_blank" className="text-xs text-[#4F7CFF] hover:text-[#7aa5ff] transition-colors underline">
                Terms of Service
              </Link>
              <span className="text-white/20">|</span>
              <Link href="/privacy" target="_blank" className="text-xs text-[#4F7CFF] hover:text-[#7aa5ff] transition-colors underline">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDecline}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-sm font-medium text-[#71717a] hover:bg-white/[0.06] hover:text-[#a1a1aa] transition-all"
            >
              Decline
            </button>
            <Button
              onClick={handleAccept}
              variant="yellow"
              size="sm"
              className="flex-1 gap-2 py-2.5 justify-center"
            >
              <span>Accept &amp; Proceed</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
