'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Image from 'next/image';

interface AdInterstitialProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
  actionLabel?: string;
  showCloseButton?: boolean;
}

export default function AdInterstitial({
  isOpen,
  onComplete,
  onClose,
  actionLabel = 'Proceeding',
  showCloseButton = true
}: AdInterstitialProps) {
  const [countdown, setCountdown] = useState(5);
  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    setCountdown(5);
    setHasFinished(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleProceed = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const percentage = ((5 - countdown) / 5) * 100;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-5 flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 text-[#f4f4f5]">
            <Sparkles className="w-4 h-4 text-[#FFD600] animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">
              Sponsor Advertisement
            </span>
          </div>
          {showCloseButton && (
            <button 
              type="button" 
              onClick={onClose}
              className="text-[#EF4444] hover:bg-white/[0.06] p-1.5 rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Ad Container Box */}
        <a 
          href="https://modistudio.online" 
          target="_blank" 
          rel="noopener noreferrer"
          className="border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-4 flex flex-col items-center gap-3 transition-all group text-center"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.05] flex items-center justify-center flex-shrink-0">
            <Image 
              src="/modi-studio-logo.jpg" 
              alt="Modi Studio Logo" 
              width={56}
              height={56}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="text-center flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF6A00] group-hover:underline">
              Modi Studio
            </span>
            <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-[280px]">
              Need a modern Web App, Custom E-commerce, or Mobile App built? Contact Modi Studio for premium, custom digital solutions.
            </p>
          </div>
          <span className="text-[10px] text-white/40 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
            Sponsor Banner • Visit Site
          </span>
        </a>

        {/* Progress Bar & Timer */}
        <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
          <span className="text-[10px] uppercase text-[#a1a1aa] tracking-wider">
            {hasFinished ? 'Ready to proceed!' : `${actionLabel} in ${countdown}s...`}
          </span>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div 
              className="bg-[#FF6A00] h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          <Button 
            variant="yellow" 
            size="md" 
            onClick={handleProceed}
            className="w-full shadow-[0_0_20px_rgba(255,214,0,0.2)] uppercase text-xs py-2.5 justify-center"
            disabled={!hasFinished}
          >
            <span>Proceed to {hasFinished ? 'Action' : `(${countdown}s)`}</span>
          </Button>
        </div>

        {/* Bottom Banner */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/30 uppercase select-none">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Secure Ad Space</span>
        </div>
      </div>
    </div>
  );
}
