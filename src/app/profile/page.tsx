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
      <div className="w-full min-h-screen flex items-center justify-center p-20 select-none bg-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3.5px] border-neo-dark border-t-neo-yellow rounded-full animate-spin" />
          <span className="text-xs font-black uppercase text-neo-dark tracking-wide">Syncing Session...</span>
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
    // Only allow single digit integers
    if (val && !/^\d$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Focus next box if filled
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Clear previous box and shift focus back
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else if (otpDigits[index]) {
        // Clear current box
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
      
      // Delay for 1.5 seconds to show the slot machine shuffle animation
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
    <div className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      {/* Header */}
      <header className="border-b-[3px] border-neo-dark bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 bg-neo-orange text-neo-dark px-4 py-2 border-[3px] border-neo-dark rounded-[10px] shadow-neo-sm font-archivo font-black uppercase text-sm sm:text-base hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo transition-all">
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
        <Card variant="white" className="w-full p-8 border-[4px] shadow-[6px_6px_0_0_#111111] flex flex-col gap-6">
          <div className="flex items-center justify-between border-b-[2.5px] border-neo-dark pb-4 select-none">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neo-yellow border-[2.5px] border-neo-dark rounded-full flex items-center justify-center text-lg font-archivo font-black">
                {loggedInUser.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black text-neo-dark">{loggedInUser.name}</span>
                <span className="text-[10px] font-bold text-neo-dark/60">{loggedInUser.email}</span>
              </div>
            </div>

            {/* Verification Status Badge */}
            {loggedInUser.isVerified ? (
              <div className="flex items-center gap-1 bg-neo-green text-neo-dark border-[2px] border-neo-dark text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-neo-sm">
                <ShieldCheck className="w-3.5 h-3.5 fill-neo-dark/10" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-neo-red text-white border-[2px] border-neo-dark text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-neo-sm">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Not Verified</span>
              </div>
            )}
          </div>

          {/* Details Rows */}
          <div className="flex flex-col gap-3 text-xs font-semibold text-neo-dark/80 text-left">
            <div className="flex items-center justify-between p-2.5 border-[2px] border-neo-dark/5 bg-cream/30 rounded-md">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-neo-dark/60" />
                <span>Country</span>
              </div>
              <span className="font-black text-neo-dark">{loggedInUser.country}</span>
            </div>
            
            <div className="flex items-center justify-between p-2.5 border-[2px] border-neo-dark/5 bg-cream/30 rounded-md">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neo-dark/60" />
                <span>State</span>
              </div>
              <span className="font-black text-neo-dark">{loggedInUser.state}</span>
            </div>
          </div>

          {/* Verification Actions */}
          {!loggedInUser.isVerified && (
            <div className="border-t-[2.5px] border-neo-dark/10 pt-4 flex flex-col gap-4">
              
              {!otpSent ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-neo-dark/70 leading-relaxed text-left">
                    Your profile is not verified. Click the button below to generate a 6-digit verification code sent to your email.
                  </p>
                  <Button 
                    variant="orange" 
                    size="md" 
                    onClick={handleSendOtp} 
                    className="w-full border-[2px] font-archivo uppercase shadow-[2.5px_2.5px_0_0_#111111]"
                    disabled={loading}
                  >
                    <Send className="w-4 h-4" />
                    <span>Verify Email via OTP</span>
                  </Button>
                  <Link href="/" className="text-center mt-2 flex justify-center">
                    <span className="text-[10px] font-black uppercase text-neo-dark/50 hover:text-neo-orange hover:underline cursor-pointer transition-all">
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
                      border-color: #FF5A5F !important;
                    }
                    .bg-success-scale {
                      background-color: #22C55E !important;
                      color: #111111 !important;
                      transform: scale(1.05);
                      border-color: #111111 !important;
                    }
                    .bg-failed-scale {
                      background-color: #FF5A5F !important;
                      color: #ffffff !important;
                      transform: scale(0.98);
                      border-color: #111111 !important;
                    }
                  `}</style>
                  
                  <div className="flex flex-col gap-1 w-full text-center">
                    <label className="text-[10px] font-black uppercase text-neo-dark/80 tracking-wider">
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
                        customClass = 'bg-success-scale text-neo-dark';
                      } else if (verificationResult === 'failed') {
                        customClass = 'animate-shake bg-failed-scale';
                      } else if (isVerifying) {
                        customClass = 'bg-neo-yellow/20 border-neo-orange';
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
                          className={`w-10 h-12 border-[3px] border-neo-dark rounded-[8px] font-archivo text-lg font-black text-center shadow-neo-sm focus:bg-neo-yellow/10 focus:shadow-neo transition-all outline-none uppercase select-all ${customClass}`}
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
                    className="w-full border-[2px] shadow-[2.5px_2.5px_0_0_#111111] uppercase font-archivo mt-1"
                    disabled={loading || isVerifying || verificationResult !== 'idle'}
                  >
                    <span>{isVerifying ? 'Verifying...' : 'Verify Code'}</span>
                  </Button>

                  <div className="flex gap-3 items-center justify-center mt-2 text-[10px] font-black uppercase">
                    <button 
                      type="button" 
                      onClick={handleSendOtp} 
                      className="text-neo-orange hover:underline"
                      disabled={loading || isVerifying}
                    >
                      Resend Code
                    </button>
                    <span className="text-neo-dark/20">|</span>
                    <Link href="/" className="text-neo-dark/50 hover:text-neo-orange hover:underline">
                      Skip for Now
                    </Link>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>

      </main>
    </div>
  );
}
