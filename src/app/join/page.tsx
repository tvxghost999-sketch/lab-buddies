'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, HelpCircle, ArrowRight, Clock, Users, ArrowLeft, QrCode, Check } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import AdInterstitial from '@/components/AdInterstitial';
import Image from 'next/image';

export default function JoinRoomPage() {
  const router = useRouter();
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const addToast = useRoomStore((state) => state.addToast);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);

  const [isAdOpen, setIsAdOpen] = useState(false);
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);

  const triggerJoinWithAd = (callback: () => void) => {
    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    if (!isPremium) {
      setAdCallback(() => callback);
      setIsAdOpen(true);
    } else {
      callback();
    }
  };


  const [activeTab, setActiveTab] = useState<'pin' | 'qr'>('pin');
  const [guestName, setGuestName] = useState('');

  // Waiting room knocking states
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingPin, setWaitingPin] = useState('');
  const [waitingName, setWaitingName] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordPrompt(false);
    setIsWaiting(true);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('room_password_' + waitingPin, passwordInput);
    }

    socketService.connectKnock(waitingPin, waitingName, passwordInput);
  };

  // Autofill guest name if logged in
  useEffect(() => {
    if (loggedInUser?.name) {
      setGuestName(loggedInUser.name);
    }
  }, [loggedInUser]);

  // Read search parameters for PIN
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const pinParam = searchParams.get('pin');
      if (pinParam && pinParam.match(/^\d{6}$/)) {
        const digits = pinParam.split('');
        setPinDigits(digits);
        addToast(`Prefilled Room PIN: ${pinParam} from scan/link`, 'info');
      }
    }
  }, [addToast]);

  // HTML5 QR Code scanning implementation
  useEffect(() => {
    if (activeTab === 'qr') {
      let html5QrCode: any = null;

      const handleScanSuccess = (decodedText: string) => {
        let pin = '';
        if (decodedText.match(/^\d{6}$/)) {
          pin = decodedText;
        } else {
          try {
            const url = new URL(decodedText);
            const pinParam = url.searchParams.get('pin');
            if (pinParam && pinParam.match(/^\d{6}$/)) {
              pin = pinParam;
            } else {
              const segments = url.pathname.split('/').filter(Boolean);
              const pinSegment = segments.find(seg => seg.match(/^\d{6}$/));
              if (pinSegment) {
                pin = pinSegment;
              }
            }
          } catch (e) {
            const match = decodedText.match(/\b\d{6}\b/);
            if (match) {
              pin = match[0];
            }
          }

          if (!pin) {
            const match = decodedText.match(/\b\d{6}\b/);
            if (match) {
              pin = match[0];
            }
          }
        }

        if (pin) {
          setPinDigits(pin.split(''));
          if (!guestName.trim()) {
            addToast(`Room PIN #${pin} loaded! Please enter your buddy name.`, 'info');
          } else {
            addToast(`Room PIN #${pin} loaded.`, 'success');
          }
          setActiveTab('pin');
        } else {
          addToast('Scanned code, but no valid 6-digit room PIN found.', 'error');
        }
      };

      import('html5-qrcode')
        .then((module) => {
          const Html5Qrcode = module.Html5Qrcode;
          html5QrCode = new Html5Qrcode('qr-reader-container');

          html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText: string) => {
              html5QrCode.stop()
                .then(() => {
                  handleScanSuccess(decodedText);
                })
                .catch((err: any) => {
                  console.error('Failed to stop camera scan', err);
                  handleScanSuccess(decodedText);
                });
            },
            (errorMessage: string) => {}
          ).catch((err: any) => {
            console.warn('Failed to start environment camera, trying fallback...', err);
            html5QrCode.start(
              { facingMode: 'user' },
              {
                fps: 10,
                qrbox: { width: 220, height: 220 }
              },
              (decodedText: string) => {
                html5QrCode.stop()
                  .then(() => {
                    handleScanSuccess(decodedText);
                  })
                  .catch(() => {
                    handleScanSuccess(decodedText);
                  });
              },
              () => {}
            ).catch((err2: any) => {
              console.error('Camera access failed', err2);
              addToast('Camera access failed. Please ensure camera permission is granted.', 'error');
            });
          });
        })
        .catch((err: any) => {
          console.error('Failed to import html5-qrcode dynamically', err);
          addToast('Could not load camera scanner.', 'error');
        });

      return () => {
        if (html5QrCode) {
          try {
            html5QrCode.stop().catch((err: any) => {});
          } catch (e) {}
        }
      };
    }
  }, [activeTab, addToast]);

  useEffect(() => {
    socketService.onKnockResult((data) => {
      if (data.status === 'accepted') {
        const targetPin = data.pin || waitingPin;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('knock_approved_' + targetPin, 'true');
        }
        joinRoom(targetPin, waitingName);
        addToast(data.autoJoin ? 'Joined room successfully!' : 'Request accepted! Entering room.', 'success');
        router.push(`/room/${targetPin}`);
      } else if (data.status === 'rejected') {
        setIsWaiting(false);
        addToast('Your request to join was declined by the host.', 'error');
        socketService.disconnect();
      } else if (data.status === 'error') {
        setIsWaiting(false);
        if (data.requiresPassword) {
          setShowPasswordPrompt(true);
          addToast(data.message || 'Room is password protected.', 'info');
        } else {
          addToast(data.message || 'Error occurred while joining.', 'error');
          socketService.disconnect();
        }
      }
    });
  }, [waitingPin, waitingName, joinRoom, addToast, router]);

  const handleCancelWaiting = () => {
    setIsWaiting(false);
    socketService.disconnect();
    addToast('Join request cancelled.', 'info');
  };
  
  // PIN Input State: 6 digits
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledDigits, setShuffledDigits] = useState<string[]>(Array(6).fill(''));

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Room Name State
  const [roomNameInput, setRoomNameInput] = useState('');

  // Handle digit inputs
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      const newDigits = [...pinDigits];
      pasted.forEach((char, i) => {
        if (index + i < 6) newDigits[index + i] = char;
      });
      setPinDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs[nextFocus].current?.focus();
      return;
    }

    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);

    if (value !== '' && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pinDigits[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Submit Pin Join
  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = guestName.trim();
    if (!trimmedName) {
      addToast('Please enter your buddy name. Name is compulsory.', 'error');
      return;
    }
    if (trimmedName.length < 2) {
      addToast('Buddy name must be at least 2 characters long.', 'error');
      return;
    }

    const pin = pinDigits.join('');
    if (pin.length < 6) {
      addToast('Please enter all 6 digits of the room PIN.', 'error');
      return;
    }
    
    triggerJoinWithAd(() => proceedWithJoinByPin(pin));
  };

  const proceedWithJoinByPin = async (pin: string) => {
    const nameToUse = guestName.trim();
    if (!nameToUse) {
      addToast('Please enter your buddy name. Name is compulsory.', 'error');
      return;
    }
    setIsAdOpen(false);
    
    setIsShuffling(true);
    const interval = setInterval(() => {
      setShuffledDigits(Array(6).fill('').map(() => Math.floor(Math.random() * 10).toString()));
    }, 65);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    clearInterval(interval);
    setIsShuffling(false);

    setWaitingPin(pin);
    setWaitingName(nameToUse);
    setIsWaiting(true);

    socketService.connectKnock(pin, nameToUse);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center h-full relative z-10">
            <Image src="/logo.png?v=5" alt="Lab Buddies Logo" width={150} height={48} className="h-12 sm:h-14 w-auto object-contain my-auto" />
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-[#a1a1aa] hover:text-[#f4f4f5] px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Area - Form & Tabs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#f4f4f5]">
                Join a Room
              </h1>
              <p className="text-sm text-[#71717a]">
                Enter your buddy name and room details below to connect with your peers.
              </p>
            </div>

            {/* Nickname Input Card */}
            <div className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#FFD600] bg-[#FFD600]/10 px-2.5 py-1 rounded-full border border-[#FFD600]/20">
                  Step 1: Your Identity
                </span>
                <span className="text-[11px] text-[#EF4444] font-medium">* Required</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider flex items-center gap-1">
                  <span>Enter Your Buddy Name</span>
                  <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman, Priya, Rohit (Cannot be empty)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={`neo-input w-full text-sm ${!guestName.trim() ? 'border-[#EF4444]/40 focus:border-[#EF4444]' : 'border-white/[0.1] focus:border-[#FFD600]'}`}
                />
                {!guestName.trim() && (
                  <span className="text-[10.5px] text-[#EF4444] font-medium">
                    * Name is compulsory to enter the room.
                  </span>
                )}
              </div>
            </div>

            {/* Tabs Header */}
            <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.08] rounded-xl">
              <button
                onClick={() => setActiveTab('pin')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pin' ? 'bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/20' : 'text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                By PIN
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'qr' ? 'bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/20' : 'text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                Scan QR Code
              </button>
            </div>

            {/* Tabs Content */}
            <div className="glass-card p-6">
              {activeTab === 'pin' && (
                <form onSubmit={handleJoinByPin} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider text-center">Enter 6-digit Room PIN</label>
                    <div className="flex justify-between gap-1.5 sm:gap-2 max-w-md mx-auto w-full">
                      {pinDigits.map((digit, index) => {
                        let displayVal = digit;
                        if (isShuffling) {
                          displayVal = shuffledDigits[index] || '0';
                        }

                        let customClass = '';
                        if (isShuffling) {
                          customClass = 'bg-[#FFD600]/10 border-[#FF6A00]/50 animate-pulse scale-95';
                        }

                        return (
                          <input
                            key={index}
                            ref={inputRefs[index]}
                            type="text"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={6}
                            value={displayVal}
                            onChange={(e) => handleDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className={`w-9 h-11 sm:w-12 sm:h-14 border border-white/[0.1] bg-white/[0.03] rounded-xl text-center font-mono text-base sm:text-xl font-bold text-[#f4f4f5] focus:bg-[#FFD600]/10 focus:border-[#FFD600]/40 focus:outline-none transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${customClass}`}
                            disabled={isShuffling}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="yellow" 
                    size="lg" 
                    className="w-full gap-2 shadow-[0_0_20px_rgba(255,214,0,0.2)]"
                    disabled={isShuffling}
                  >
                    <span>{isShuffling ? 'Checking Room...' : 'Join Room'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </form>
              )}

              {activeTab === 'qr' && (
                <div className="flex flex-col gap-5 items-center text-center">
                  <div className="flex flex-col gap-1.5 select-none w-full">
                    <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
                      Scan Room Invite QR Code
                    </label>
                    <p className="text-xs text-[#71717a] max-w-xs mx-auto">
                      Hold the QR code in front of your camera. On successful scan, the PIN will auto-fill.
                    </p>
                  </div>
                  
                  {/* Camera Scanner Viewport */}
                  <div className="w-full max-w-sm border border-white/[0.08] rounded-2xl overflow-hidden bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative min-h-[300px] flex flex-col items-center justify-center p-2">
                    <div id="qr-reader-container" className="w-full h-full" />
                    
                    {/* Target overlay indicator */}
                    <div className="absolute inset-8 border border-dashed border-[#FFD600]/25 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-[#FFD600] absolute top-0 left-0" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-[#FFD600] absolute top-0 right-0" />
                      <div className="w-4 h-4 border-b-2 border-l-2 border-[#FFD600] absolute bottom-0 left-0" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-[#FFD600] absolute bottom-0 right-0" />
                    </div>
                  </div>

                  <span className="text-[10px] text-[#52525b] select-none">
                    Requires camera browser access permission.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Area - Tips & Illustration */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Playful Illustration Image */}
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10] shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none">
              <img 
                src="/join-illustration.jpg" 
                alt="Let's Share Collaboration Illustration" 
                className="w-full h-auto object-cover opacity-85"
              />
            </div>

            {/* Tips Card */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <HelpCircle className="w-5 h-5 text-[#FF6A00]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">
                  Quick Tips
                </span>
              </div>
              <ul className="flex flex-col gap-3.5 text-xs text-[#a1a1aa]">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center flex-shrink-0 text-[#22C55E]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Anyone can join instantly using the 6-digit Room PIN or scanning the QR code.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center flex-shrink-0 text-[#22C55E]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>Rooms are temporary and will automatically self-destruct once the countdown timer expires.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center flex-shrink-0 text-[#22C55E]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>All shared files, code snippets, and chat messages synchronize in real-time.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* Knock Waiting Screen Overlay */}
      {isWaiting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 flex items-center justify-center text-3xl animate-bounce">
              🚪
            </div>
            <div className="flex flex-col gap-2 animate-pulse">
              <h2 className="text-xl font-bold text-[#f4f4f5]">Waiting for Host...</h2>
              <p className="text-xs text-[#71717a] max-w-xs leading-normal mx-auto">
                Knocked on the door. The host has been notified of your request to join. Please wait.
              </p>
            </div>
            <div className="w-full flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 justify-center text-xs text-[#a1a1aa]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A00] animate-ping" />
              <span>Knocking as: {waitingName} (Room #{waitingPin})</span>
            </div>
            <Button 
              variant="red" 
              size="sm" 
              className="w-full justify-center text-xs"
              onClick={handleCancelWaiting}
            >
              Cancel Request
            </Button>
          </div>
        </div>
      )}

      {/* Room Password Request Overlay */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center text-3xl animate-pulse">
              🔒
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-[#f4f4f5]">Password Required</h2>
              <p className="text-xs text-[#71717a] max-w-xs leading-normal mx-auto">
                This study room is password-protected. Enter the password below to request joining.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-4 mt-2">
              <input
                type="password"
                placeholder="Enter Room Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="neo-input w-full text-center text-sm font-semibold"
                style={{ paddingLeft: '1rem', paddingRight: '1rem' }}
                required
              />

              <div className="flex gap-3 w-full mt-1">
                <Button 
                  type="button"
                  variant="white" 
                  size="sm" 
                  className="flex-1 justify-center text-xs"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setWaitingPin('');
                    setWaitingName('');
                    setPasswordInput('');
                    socketService.disconnect();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="yellow" 
                  size="sm" 
                  className="flex-1 justify-center text-xs"
                >
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdInterstitial 
        isOpen={isAdOpen} 
        onComplete={() => {
          if (adCallback) adCallback();
        }} 
        onClose={() => {
          setIsAdOpen(false);
          setAdCallback(null);
        }} 
        actionLabel="Joining Room" 
      />
    </div>
  );
}
