'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, ShieldAlert, User, Mail, Globe, MapPin, 
  LogOut, Send, KeyRound, MailOpen, ArrowLeft, Home 
} from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';
import Image from 'next/image';

export default function ProfilePage() {
  const router = useRouter();
  const addToast = useRoomStore((state) => state.addToast);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);
  const logoutUser = useRoomStore((state) => state.logoutUser);

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom 6-digit OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [shuffledDigits, setShuffledDigits] = useState<string[]>(Array(6).fill(''));
  const [verificationResult, setVerificationResult] = useState<'idle' | 'success' | 'failed'>('idle');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (isMounted && !loggedInUser) {
      router.push('/login');
    }
  }, [isMounted, loggedInUser, router]);

  if (!isMounted || !loggedInUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-20 select-none bg-[#050608]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#FFD600] rounded-full animate-spin" />
          <span className="text-xs text-[#a1a1aa] tracking-wide">Syncing Session...</span>
        </div>
      </div>
    );
  }

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : `http://${window.location.hostname}:5000`);
      const res = await fetch(`${backendUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInUser.email })
      });

      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpDigits(Array(6).fill(''));
        addToast('Verification OTP code sent to your email!', 'success');
        
        // Focus first input box
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        addToast(data.error || 'Failed to send OTP.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Server connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (val: string, index: number) => {
    if (val && !/^\d$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else if (otpDigits[index]) {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(text)) {
      const chars = text.split('');
      setOtpDigits(chars);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      addToast('Please enter all 6 digits of the OTP.', 'warning');
      return;
    }

    setIsVerifying(true);
    setVerificationResult('idle');
    setLoading(true);

    // Start shuffling animation
    const interval = setInterval(() => {
      setShuffledDigits(Array(6).fill('').map(() => Math.floor(Math.random() * 10).toString()));
    }, 65);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : `http://${window.location.hostname}:5000`);
      
      const delayPromise = new Promise(resolve => setTimeout(resolve, 1500));
      const apiPromise = fetch(`${backendUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loggedInUser.email,
          otp: enteredOtp
        })
      });

      const [_, res] = await Promise.all([delayPromise, apiPromise]);
      clearInterval(interval);

      const data = await res.json();
      if (res.ok) {
        setVerificationResult('success');
        setTimeout(() => {
          setLoggedInUser(data.user);
          setOtpSent(false);
          setVerificationResult('idle');
          setIsVerifying(false);
          setOtpDigits(Array(6).fill(''));
          addToast('Account verified successfully!', 'success');
        }, 1200);
      } else {
        setVerificationResult('failed');
        addToast(data.error || 'Invalid verification code.', 'error');
        setTimeout(() => {
          setVerificationResult('idle');
          setIsVerifying(false);
        }, 1200);
      }
    } catch (err) {
      clearInterval(interval);
      setVerificationResult('failed');
      addToast('Verification request failed.', 'error');
      setTimeout(() => {
        setVerificationResult('idle');
        setIsVerifying(false);
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    addToast('Logged out successfully.', 'info');
    router.push('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#f4f4f5] px-4 py-2 border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-all">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Button variant="red" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex flex-col items-center justify-center">
        
        {/* Profile Details Card */}
        <div className="w-full p-8 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 select-none">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FFD600]/15 border border-[#FFD600]/25 rounded-full flex items-center justify-center text-lg font-bold text-[#FFD600]">
                {loggedInUser.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-[#f4f4f5]">{loggedInUser.name}</span>
                <span className="text-[10px] text-[#71717a]">{loggedInUser.email}</span>
              </div>
            </div>

            {/* Verification Status Badge */}
            {loggedInUser.isVerified ? (
              <div className="flex items-center gap-1 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 text-[10px] font-medium px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20 text-[10px] font-medium px-2.5 py-1 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Not Verified</span>
              </div>
            )}
          </div>

          {/* Details Rows */}
          <div className="flex flex-col gap-3 text-xs text-[#a1a1aa] text-left">
            <div className="flex items-center justify-between p-2.5 border border-white/[0.06] bg-white/[0.02] rounded-xl">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-white/30" />
                <span>Country</span>
              </div>
              <span className="font-semibold text-[#f4f4f5]">{loggedInUser.country}</span>
            </div>
            
            <div className="flex items-center justify-between p-2.5 border border-white/[0.06] bg-white/[0.02] rounded-xl">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/30" />
                <span>State</span>
              </div>
              <span className="font-semibold text-[#f4f4f5]">{loggedInUser.state}</span>
            </div>
          </div>

          {/* Verification Actions */}
          {!loggedInUser.isVerified && (
            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-4">
              
              {!otpSent ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-[#71717a] leading-relaxed text-left">
                    Your profile is not verified. Click the button below to generate a 6-digit verification code sent to your email.
                  </p>
                  <Button 
                    variant="orange" 
                    size="md" 
                    onClick={handleSendOtp} 
                    className="w-full gap-2 justify-center"
                    disabled={loading}
                  >
                    <Send className="w-4 h-4" />
                    <span>Verify Email via OTP</span>
                  </Button>
                  <Link href="/" className="text-center mt-2 flex justify-center">
                    <span className="text-[10px] uppercase text-[#71717a] hover:text-[#FFD600] cursor-pointer transition-all">
                      Skip for Now
                    </span>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 items-center w-full">
                  <style>{`
                    @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      20%, 60% { transform: translateX(-4px); }
                      40%, 80% { transform: translateX(4px); }
                    }
                    .animate-shake {
                      animation: shake 0.25s ease-in-out;
                      border-color: #EF4444 !important;
                    }
                    .bg-success-scale {
                      background-color: rgba(34,197,94,0.15) !important;
                      color: #22C55E !important;
                      transform: scale(1.03);
                      border-color: rgba(34,197,94,0.3) !important;
                    }
                    .bg-failed-scale {
                      background-color: rgba(239,68,68,0.15) !important;
                      color: #EF4444 !important;
                      transform: scale(0.97);
                      border-color: rgba(239,68,68,0.3) !important;
                    }
                  `}</style>
                  
                  <div className="flex flex-col gap-1 w-full text-center">
                    <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">
                      Enter 6-Digit OTP Code
                    </label>
                  </div>

                  {/* 6 Seperate Boxes */}
                  <div className="flex justify-center gap-2 w-full my-1">
                    {Array(6).fill(null).map((_, idx) => {
                      let displayVal = otpDigits[idx] || '';
                      if (isVerifying && verificationResult === 'idle') {
                        displayVal = shuffledDigits[idx] || '0';
                      } else if (verificationResult === 'success') {
                        displayVal = '✓';
                      } else if (verificationResult === 'failed') {
                        displayVal = '✗';
                      }

                      let customClass = '';
                      if (verificationResult === 'success') {
                        customClass = 'bg-success-scale';
                      } else if (verificationResult === 'failed') {
                        customClass = 'animate-shake bg-failed-scale';
                      } else if (isVerifying) {
                        customClass = 'bg-[#FFD600]/10 border-[#FF6A00]/50';
                      }

                      return (
                        <input
                          key={idx}
                          type="text"
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          value={displayVal}
                          onChange={(e) => handleDigitChange(e.target.value, idx)}
                          onKeyDown={(e) => handleDigitKeyDown(e, idx)}
                          onPaste={idx === 0 ? handleDigitPaste : undefined}
                          className={`w-10 h-12 border border-white/[0.1] bg-white/[0.03] rounded-xl font-mono text-lg font-bold text-center transition-all outline-none uppercase select-all ${customClass}`}
                          maxLength={1}
                          disabled={loading || isVerifying || verificationResult !== 'idle'}
                        />
                      );
                    })}
                  </div>

                  <Button 
                    type="submit" 
                    variant="yellow" 
                    size="md" 
                    className="w-full justify-center shadow-[0_0_20px_rgba(255,214,0,0.15)]"
                    disabled={loading || isVerifying || verificationResult !== 'idle'}
                  >
                    <span>{isVerifying ? 'Verifying...' : 'Verify Code'}</span>
                  </Button>

                  <div className="flex gap-3 items-center justify-center mt-2 text-[10px] uppercase">
                    <button 
                      type="button" 
                      onClick={handleSendOtp} 
                      className="text-[#FF6A00] hover:underline"
                      disabled={loading || isVerifying}
                    >
                      Resend Code
                    </button>
                    <span className="text-white/10">|</span>
                    <Link href="/" className="text-[#71717a] hover:text-[#FF6A00] hover:underline">
                      Skip for Now
                    </Link>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
