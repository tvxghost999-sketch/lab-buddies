'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

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
    <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <Card 
        variant="white" 
        className="w-full max-w-md border-[3.5px] border-neo-dark shadow-[6px_6px_0_0_#111111] p-5 flex flex-col gap-5 relative bg-[#FFFDF9] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-neo-dark pb-3">
          <div className="flex items-center gap-2 text-neo-dark">
            <Sparkles className="w-4 h-4 text-neo-yellow fill-neo-yellow/30 animate-pulse" />
            <span className="font-archivo text-xs sm:text-sm font-black uppercase tracking-wider">
              Sponsor Advertisement
            </span>
          </div>
          {showCloseButton && (
            <button 
              type="button" 
              onClick={onClose}
              className="text-neo-red hover:bg-neo-dark/5 p-1 rounded transition-colors"
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
          className="border-[3px] border-neo-dark bg-white rounded-[12px] p-4 flex flex-col items-center gap-3 shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo transition-all group"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border-[2.5px] border-neo-dark bg-[#FFF5E6] flex items-center justify-center flex-shrink-0">
            <img 
              src="/modi-studio-logo.jpg" 
              alt="Modi Studio Logo" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div className="text-center flex flex-col gap-1">
            <span className="font-archivo text-xs font-black uppercase tracking-wide text-neo-orange group-hover:underline">
              Modi Studio
            </span>
            <p className="text-[10.5px] font-bold text-neo-dark leading-tight max-w-[280px]">
              Need a modern Web App, Custom E-commerce, or Mobile App built? Contact Modi Studio for premium, custom digital solutions.
            </p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-neo-dark/40 bg-neo-dark/5 px-2 py-0.5 rounded-full border border-neo-dark/10">
            Sponsor Banner • Visit Site
          </span>
        </a>

        {/* Progress Bar & Timer */}
        <div className="flex flex-col gap-2 bg-[#FFF9F1] border-[2.5px] border-neo-dark rounded-[10px] p-3 text-center">
          <span className="text-[10px] font-black uppercase text-neo-dark/80">
            {hasFinished ? 'Ready to proceed!' : `${actionLabel} in ${countdown}s...`}
          </span>
          <div className="w-full h-3 border-[2px] border-neo-dark rounded-full bg-white overflow-hidden">
            <div 
              className="bg-neo-orange h-full rounded-full transition-all duration-1000 ease-linear"
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
            className="w-full border-[2.5px] shadow-[3px_3px_0_0_#111111] uppercase font-archivo font-black py-2.5 disabled:opacity-50 text-xs sm:text-sm"
            disabled={!hasFinished}
          >
            <span>Proceed to {hasFinished ? 'Action' : `(${countdown}s)`}</span>
          </Button>
        </div>

        {/* Bottom Banner */}
        <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-neo-dark/40">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Secure Ad Space</span>
        </div>
      </Card>
    </div>
  );
}
