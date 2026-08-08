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

  // Read search parameters for PIN (e.g. from Google Lens scans or invite links)
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
              // Extract 6-digit PIN from the path segments (e.g. /room/580744)
              const segments = url.pathname.split('/').filter(Boolean);
              const pinSegment = segments.find(seg => seg.match(/^\d{6}$/));
              if (pinSegment) {
                pin = pinSegment;
              }
            }
          } catch (e) {
            // Fallback: match any standalone 6-digit number in raw text
            const match = decodedText.match(/\b\d{6}\b/);
            if (match) {
              pin = match[0];
            }
          }

          // Double check: if URL parsing succeeded but didn't set pin segment, fallback search the decoded text
          if (!pin) {
            const match = decodedText.match(/\b\d{6}\b/);
            if (match) {
              pin = match[0];
            }
          }
        }

        if (pin) {
          setPinDigits(pin.split(''));
          addToast(`Successfully scanned! Room PIN #${pin} loaded.`, 'success');
          setActiveTab('pin');
        } else {
          addToast('Scanned code, but no valid 6-digit room PIN found.', 'error');
        }
      };

      // Dynamically import html5-qrcode to prevent SSR reference errors
      import('html5-qrcode')
        .then((module) => {
          const Html5Qrcode = module.Html5Qrcode;
          html5QrCode = new Html5Qrcode('qr-reader-container');

          html5QrCode.start(
            { facingMode: 'environment' }, // Prefer back camera on mobile
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
            (errorMessage: string) => {
              // Ignore frame scan failures
            }
          ).catch((err: any) => {
            console.warn('Failed to start environment camera, trying fallback...', err);
            // Fallback to front camera (desktops, laptops)
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
            html5QrCode.stop().catch((err: any) => {
              // Ignore if already stopped
            });
          } catch (e) {
            // Ignore
          }
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
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newDigits = [...pinDigits];
      pasted.forEach((char, i) => {
        if (index + i < 6) newDigits[index + i] = char;
      });
      setPinDigits(newDigits);
      // Focus last pasted or end
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs[nextFocus].current?.focus();
      return;
    }

    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace auto-focus previous
    if (e.key === 'Backspace' && pinDigits[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Submit Pin Join
  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length < 6) {
      addToast('Please enter all 6 digits of the room PIN.', 'error');
      return;
    }
    
    triggerJoinWithAd(() => proceedWithJoinByPin(pin));
  };

  const proceedWithJoinByPin = async (pin: string) => {
    const nameToUse = guestName.trim() || `Buddy_${Math.floor(100 + Math.random() * 900)}`;
    setIsAdOpen(false);
    
    setIsShuffling(true);
    const interval = setInterval(() => {
      setShuffledDigits(Array(6).fill('').map(() => Math.floor(Math.random() * 10).toString()));
    }, 65);

    // Show slot-machine shuffle animation for 1.5 seconds
    await new Promise((resolve) => setTimeout(resolve, 1500));
    clearInterval(interval);
    setIsShuffling(false);

    setWaitingPin(pin);
    setWaitingName(nameToUse);
    setIsWaiting(true);

    // Connect socket and knock
    socketService.connectKnock(pin, nameToUse);
  };

  // Submit Room Name Join
  const handleJoinByName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim()) {
      addToast('Please enter a room name.', 'error');
      return;
    }
    
    const nameLower = roomNameInput.trim().toLowerCase();
    let targetPin = '408215';
    if (nameLower.includes('ds')) targetPin = '229104';
    if (nameLower.includes('cpp')) targetPin = '772199';

    triggerJoinWithAd(() => {
      const nameToUse = guestName.trim() || `Buddy_${Math.floor(100 + Math.random() * 900)}`;
      setIsAdOpen(false);
      setWaitingPin(targetPin);
      setWaitingName(nameToUse);
      setIsWaiting(true);

      // Connect socket and knock
      socketService.connectKnock(targetPin, nameToUse);
    });
  };

  // Click on a recent room to auto-join
  const handleQuickJoin = (pin: string, name: string) => {
    triggerJoinWithAd(() => {
      const nameToUse = guestName.trim() || `Buddy_${Math.floor(100 + Math.random() * 900)}`;
      setIsAdOpen(false);
      setWaitingPin(pin);
      setWaitingName(nameToUse);
      setIsWaiting(true);

      // Connect socket and knock
      socketService.connectKnock(pin, nameToUse);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      {/* Header */}
      <header className="border-b-[3px] border-neo-dark bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:scale-95 transition-all flex items-center h-full relative z-10">
            <img src="/logo.png" alt="Lab Buddies Logo" className="h-16 sm:h-20 w-auto object-contain max-h-none scale-105 origin-left" />
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 font-archivo text-xs uppercase tracking-wider text-neo-dark px-3 py-1.5 border-[3px] border-neo-dark rounded-[8px] bg-white shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Area - Form & Tabs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-archivo text-3xl sm:text-4xl uppercase text-neo-dark">
                Join a Room
              </h1>
              <p className="text-sm font-bold text-neo-dark/70">
                Enter your nickname and details below to connect with your buddies instantly.
              </p>
            </div>

            {/* Nickname Input Card (Crucial for buddy identity) */}
            <Card variant="white" className="p-5 flex flex-col gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-neo-dark bg-neo-yellow/30 self-start px-2 py-0.5 border-[2px] border-neo-dark rounded">
                Who are you?
              </span>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-neo-dark">Choose Buddy Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Aman, Priya, Rohit..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="neo-input w-full text-sm font-semibold"
                />
              </div>
            </Card>

            {/* Tabs Header */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('pin')}
                className={`flex-1 py-3 border-[3px] border-neo-dark rounded-[10px] font-archivo text-xs uppercase tracking-wider transition-all font-black shadow-neo-sm ${
                  activeTab === 'pin' ? 'bg-neo-yellow -translate-y-1 shadow-neo' : 'bg-white'
                }`}
              >
                By PIN
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-3 border-[3px] border-neo-dark rounded-[10px] font-archivo text-xs uppercase tracking-wider transition-all font-black shadow-neo-sm ${
                  activeTab === 'qr' ? 'bg-neo-yellow -translate-y-1 shadow-neo' : 'bg-white'
                }`}
              >
                Scan QR Code
              </button>
            </div>

            {/* Tabs Content */}
            <Card variant="white" className="p-6">
              {activeTab === 'pin' && (
                <form onSubmit={handleJoinByPin} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black uppercase text-neo-dark tracking-wide">Enter 6-digit Room PIN</label>
                    <div className="flex justify-between gap-1.5 sm:gap-2 max-w-md mx-auto w-full">
                      {pinDigits.map((digit, index) => {
                        let displayVal = digit;
                        if (isShuffling) {
                          displayVal = shuffledDigits[index] || '0';
                        }

                        let customClass = '';
                        if (isShuffling) {
                          customClass = 'bg-neo-yellow/20 border-neo-orange animate-pulse scale-95';
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
                            className={`w-9 h-11 sm:w-12 sm:h-14 border-[3px] border-neo-dark rounded-[8px] text-center font-archivo text-base sm:text-xl font-black text-neo-dark focus:bg-neo-yellow/10 focus:outline-none transition-all shadow-neo-sm ${customClass}`}
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
                    className="w-full gap-2"
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
                    <label className="text-xs font-black uppercase text-neo-dark tracking-wide">
                      Scan Room Invite QR Code
                    </label>
                    <p className="text-[10.5px] font-bold text-neo-dark/65 max-w-xs mx-auto">
                      Hold the QR code in front of your camera. On successful scan, the PIN will auto-fill.
                    </p>
                  </div>
                  
                  {/* Camera Scanner Viewport */}
                  <div className="w-full max-w-sm border-[3px] border-neo-dark rounded-[12px] overflow-hidden bg-[#111111] shadow-neo-sm relative min-h-[300px] flex flex-col items-center justify-center p-2">
                    <div id="qr-reader-container" className="w-full h-full" />
                    
                    {/* Target overlay indicator */}
                    <div className="absolute inset-8 border-2 border-dashed border-neo-yellow/30 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-neo-yellow absolute top-0 left-0" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-neo-yellow absolute top-0 right-0" />
                      <div className="w-4 h-4 border-b-2 border-l-2 border-neo-yellow absolute bottom-0 left-0" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-neo-yellow absolute bottom-0 right-0" />
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-neo-dark/50 select-none">
                    Requires camera browser access permission.
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Right Area - Tips & Illustration */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Playful Illustration Image */}
            <div className="border-[3px] border-neo-dark rounded-[16px] overflow-hidden bg-white shadow-[3px_3px_0_0_#111111] select-none">
              <img 
                src="/join-illustration.jpg" 
                alt="Let's Share Collaboration Illustration" 
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Tips Card */}
            <Card variant="white" className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b-[2px] border-neo-dark pb-2">
                <HelpCircle className="w-5 h-5 text-neo-orange" />
                <span className="font-archivo text-xs uppercase tracking-wider text-neo-dark">
                  Quick Tips
                </span>
              </div>
              <ul className="flex flex-col gap-3 font-semibold text-xs text-neo-dark/80">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-neo-green/20 border-[2.5px] border-neo-dark flex items-center justify-center flex-shrink-0 text-neo-green">
                    <Check className="w-3 h-3 stroke-[4]" />
                  </span>
                  <span>Anyone can join instantly using the 6-digit Room PIN or scanning the QR code.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-neo-green/20 border-[2.5px] border-neo-dark flex items-center justify-center flex-shrink-0 text-neo-green">
                    <Check className="w-3 h-3 stroke-[4]" />
                  </span>
                  <span>Rooms are temporary and will automatically self-destruct once the countdown timer expires.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-neo-green/20 border-[2.5px] border-neo-dark flex items-center justify-center flex-shrink-0 text-neo-green">
                    <Check className="w-3 h-3 stroke-[4]" />
                  </span>
                  <span>All shared files, code snippets, and chat messages synchronize in real-time.</span>
                </li>
              </ul>
            </Card>
          </div>

        </div>
      </main>

      {/* Knock Waiting Screen Overlay */}
      {isWaiting && (
        <div className="fixed inset-0 bg-neo-dark/85 flex items-center justify-center p-4 z-50 select-none">
          <Card variant="white" className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border-[4px] shadow-[6px_6px_0_0_#111111]">
            <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-neo-yellow flex items-center justify-center text-3xl animate-bounce shadow-neo-sm">
              🚪
            </div>
            <div className="flex flex-col gap-2 animate-pulse">
              <h2 className="font-archivo text-xl uppercase text-neo-dark">Waiting for Host...</h2>
              <p className="text-xs font-bold text-neo-dark/65 max-w-xs leading-normal mx-auto">
                Knocked on the door. The host has been notified of your request to join. Please wait.
              </p>
            </div>
            <div className="w-full flex items-center gap-2 border-[2.5px] border-neo-dark bg-cream rounded-[8px] p-2.5 justify-center text-[10px] font-black uppercase text-neo-dark">
              <span className="w-2.5 h-2.5 rounded-full bg-neo-orange animate-ping" />
              <span>Knocking as: {waitingName} (Room #{waitingPin})</span>
            </div>
            <Button 
              variant="red" 
              size="sm" 
              className="w-full border-[2.5px] text-xs font-archivo shadow-[2px_2px_0_0_#111111]"
              onClick={handleCancelWaiting}
            >
              Cancel Request
            </Button>
          </Card>
        </div>
      )}
      {/* Room Password Request Overlay */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-neo-dark/85 flex items-center justify-center p-4 z-50 select-none">
          <Card variant="white" className="max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border-[4px] shadow-[6px_6px_0_0_#111111]">
            <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-neo-orange flex items-center justify-center text-3xl animate-pulse shadow-neo-sm">
              🔒
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="font-archivo text-lg uppercase text-neo-dark">Password Required</h2>
              <p className="text-xs font-bold text-neo-dark/70 max-w-xs leading-normal mx-auto">
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
                  className="flex-1 border-[2.5px] text-xs font-archivo shadow-[2.5px_2.5px_0_0_#111111]"
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
                  className="flex-1 border-[2.5px] text-xs font-archivo shadow-[2.5px_2.5px_0_0_#111111]"
                >
                  Submit
                </Button>
              </div>
            </form>
          </Card>
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
