'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scale, ArrowRight, Shield } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

export default function TermsConsentModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if terms have already been accepted
    const isAccepted = localStorage.getItem('labbuddies_terms_accepted');
    if (!isAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('labbuddies_terms_accepted', 'true');
    setIsOpen(false);
  };

  const handleDecline = () => {
    // Redirect to a safe exit page
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-[4px] flex items-center justify-center p-4 z-[9999] animate-fade-in select-none">
      <Card 
        variant="white" 
        className="max-w-md w-full p-6 sm:p-8 text-center flex flex-col items-center gap-6 border-[4px] border-neo-dark shadow-[8px_8px_0_0_#111111] max-h-[90vh] overflow-y-auto"
      >
        {/* Animated Scales/Shield Icon */}
        <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-neo-yellow flex items-center justify-center shadow-neo-sm animate-bounce">
          <Scale className="w-8 h-8 text-neo-dark" />
        </div>

        {/* Content Details */}
        <div className="flex flex-col gap-2">
          <h2 className="font-archivo text-xl uppercase text-neo-dark tracking-wide">
            Welcome to Lab Buddies
          </h2>
          <p className="text-xs font-bold text-neo-dark/75 leading-relaxed">
            Before entering our ephemeral study rooms, please read and accept our terms. We want to make sure your peer collaboration is secure and legally safe.
          </p>
        </div>

        {/* Highlighted Links Box */}
        <div className="w-full border-[2.5px] border-neo-dark bg-cream rounded-[12px] p-4 flex flex-col gap-2.5 text-left">
          <div className="flex items-start gap-2.5 text-xs font-bold text-neo-dark/85">
            <span className="w-4 h-4 rounded-full bg-neo-green/20 border-[1.5px] border-neo-dark flex items-center justify-center flex-shrink-0 text-neo-green font-black">✔</span>
            <span>All shared data is temporary and self-destructs on room expiry.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs font-bold text-neo-dark/85">
            <span className="w-4 h-4 rounded-full bg-neo-green/20 border-[1.5px] border-neo-dark flex items-center justify-center flex-shrink-0 text-neo-green font-black">✔</span>
            <span>You agree to uphold your school's Academic Integrity codes.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs font-bold text-neo-dark/85 border-t-[1.5px] border-neo-dark/20 pt-2.5 mt-0.5 justify-around w-full">
            <Link 
              href="/terms" 
              target="_blank"
              className="text-neo-blue underline font-black hover:text-neo-orange transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-neo-dark/40 font-black">|</span>
            <Link 
              href="/privacy" 
              target="_blank"
              className="text-neo-blue underline font-black hover:text-neo-orange transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleDecline} 
            className="flex-1 py-3 border-[2.5px] border-neo-dark rounded-[10px] bg-white font-archivo text-xs uppercase tracking-wider transition-all font-black text-neo-dark/60 hover:bg-cream active:translate-y-[1px]"
          >
            Decline
          </button>
          <Button 
            onClick={handleAccept} 
            variant="yellow" 
            size="sm" 
            className="flex-1 gap-2 font-archivo uppercase text-xs shadow-neo-sm py-3 justify-center"
          >
            <span>Accept & Proceed</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
