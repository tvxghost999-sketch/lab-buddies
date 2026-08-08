'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Copy, LogOut, Menu, X, 
  MessageSquare, FolderOpen, Users, Activity, 
  Code, StickyNote, Settings, Search, Lock, 
  VolumeX, Trash2, Ban, QrCode 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { Switch } from '@/components/ui/input';
import AdInterstitial from '@/components/AdInterstitial';


export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const pin = params?.pin as string;

  // State elements
  const activeRoom = useRoomStore((state) => state.activeRoom);
  const currentUser = useRoomStore((state) => state.currentUser);
  const members = useRoomStore((state) => state.members);
  const feedItems = useRoomStore((state) => state.feedItems);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const toggleLockRoom = useRoomStore((state) => state.toggleLockRoom);
  const toggleMuteChat = useRoomStore((state) => state.toggleMuteChat);
  const clearFeed = useRoomStore((state) => state.clearFeed);
  const addToast = useRoomStore((state) => state.addToast);
  const enterRoom = useRoomStore((state) => state.enterRoom);
  const showConfirm = useRoomStore((state) => state.showConfirm);

  // Knocking requests waiting line
  const [knockingRequests, setKnockingRequests] = useState<{ name: string; socketId: string }[]>([]);
  const [isStorageAdOpen, setIsStorageAdOpen] = useState(false);

  // Password Prompt modal states
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError('Password cannot be empty.');
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('room_password_' + pin, passwordInput);
    }
    if (currentUser) {
      socketService.connectKnock(pin, currentUser.name, passwordInput);
    }
    setShowPasswordPrompt(false);
    setPasswordError('');
  };

  const handleCancelPassword = () => {
    setShowPasswordPrompt(false);
    socketService.disconnect();
    router.push('/join');
  };

  // Calculate real storage usage from uploaded feed files
  const calculateStorage = () => {
    let totalBytes = 0;
    feedItems.forEach((item) => {
      if (item.type === 'file' && item.fileSize) {
        const match = item.fileSize.match(/([\d.]+)\s*(KB|MB|GB|Bytes|B)/i);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          if (unit === 'KB') totalBytes += val * 1024;
          else if (unit === 'MB') totalBytes += val * 1024 * 1024;
          else if (unit === 'GB') totalBytes += val * 1024 * 1024 * 1024;
          else totalBytes += val;
        }
      }
    });

    const limitBytes = activeRoom?.storageLimit || (25 * 1024 * 1024);
    const limitMB = Math.round(limitBytes / (1024 * 1024));
    const percentage = Math.min((totalBytes / limitBytes) * 100, 100);

    let displayStr = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    if (totalBytes < 1024 * 1024 && totalBytes > 0) {
      displayStr = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else if (totalBytes === 0) {
      displayStr = '0.00 MB';
    }

    return { displayStr, percentage, limitMB };
  };

  const { displayStr, percentage, limitMB } = calculateStorage();

  const [isSessionApproved, setIsSessionApproved] = useState(false);

  useEffect(() => {
    if (pin) {
      enterRoom(pin);
    }
  }, [pin, enterRoom]);

  const knockedRef = useRef(false);
  const seenKnockIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pin) return;
    if (!currentUser) return;
    if (isSessionApproved) return;

    // Check if they recently navigated from the join flow
    const approved = sessionStorage.getItem('knock_approved_' + pin) === 'true';
    if (approved || currentUser.role === 'host') {
      setIsSessionApproved(true);
      if (approved) {
        // Delay removal so React StrictMode's double-invoke can also read the key
        setTimeout(() => {
          sessionStorage.removeItem('knock_approved_' + pin);
        }, 1000);
      }
      socketService.connect(pin, currentUser.name, currentUser.role);
    } else {
      // Never reset to false — it starts false already
      // Only knock once per mount
      if (!knockedRef.current) {
        knockedRef.current = true;
        const storedPassword = typeof window !== 'undefined' ? (sessionStorage.getItem('room_password_' + pin) || undefined) : undefined;
        socketService.connectKnock(pin, currentUser.name, storedPassword);
      }
    }
  }, [pin, currentUser, isSessionApproved]);

  useEffect(() => {
    socketService.onKnockResult((data) => {
      if (data.status === 'accepted') {
        const targetPin = data.pin || pin;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('knock_approved_' + targetPin, 'true');
        }
        setIsSessionApproved(true);
        if (currentUser) {
          socketService.connect(targetPin, currentUser.name, 'member');
        }
      } else if (data.status === 'rejected') {
        addToast('Request to join room rejected by host.', 'error');
        socketService.disconnect();
        router.push('/join');
      } else if (data.status === 'error') {
        if (data.requiresPassword) {
          setShowPasswordPrompt(true);
          setPasswordError(data.message || 'Room is password protected.');
          // Allow re-knocking if password failed
          knockedRef.current = false;
        } else {
          addToast(data.message || 'Error occurred.', 'error');
          socketService.disconnect();
          router.push('/join');
        }
      }
    });
  }, [pin, currentUser, router, addToast]);

  useEffect(() => {
    if (currentUser?.role === 'host') {
      socketService.onMemberKnocking((req) => {
        // Use a ref-based set to deduplicate — immune to stale closures and StrictMode double-invoke
        if (seenKnockIds.current.has(req.socketId)) return;
        seenKnockIds.current.add(req.socketId);
        setKnockingRequests((prev) => [...prev, req]);
        setTimeout(() => {
          addToast(`${req.name} wants to join!`, 'info');
        }, 0);
      });
    }
  }, [currentUser, addToast, pin]);

  // Listen for storage expansion ads and notifications
  useEffect(() => {
    if (currentUser?.role === 'host') {
      socketService.onHostStorageAlert((data) => {
        showConfirm(
          "Storage Limit Reached",
          `Member "${data.name}" tried to upload a file but the room storage capacity has been reached. Watch a 5-second advertisement on all connected devices to add 25MB limits?`,
          () => {
            socketService.emitTriggerStorageAdRequest(pin);
          }
        );
      });
    }

    socketService.onPlayStorageAd(() => {
      setIsStorageAdOpen(true);
      addToast("Playing synced ad to expand room storage...", "info");
    });

    socketService.onStopStorageAd(() => {
      setIsStorageAdOpen(false);
      addToast("Room storage capacity successfully expanded by 25MB!", "success");
    });
  }, [currentUser, pin, addToast, showConfirm]);

  const handleAcceptKnock = (targetSocketId: string) => {
    seenKnockIds.current.delete(targetSocketId);
    socketService.acceptKnock(pin, targetSocketId);
    setKnockingRequests((prev) => prev.filter((r) => r.socketId !== targetSocketId));
    addToast('Request approved.', 'success');
  };

  const handleRejectKnock = (targetSocketId: string) => {
    seenKnockIds.current.delete(targetSocketId);
    socketService.rejectKnock(pin, targetSocketId);
    setKnockingRequests((prev) => prev.filter((r) => r.socketId !== targetSocketId));
    addToast('Request declined.', 'warning');
  };

  // Mobile menu control
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Countdown timer simulation (starts at 1 hour 45 minutes 22 seconds and decreases)
  const [timeLeft, setTimeLeft] = useState({ hrs: 1, mins: 45, secs: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.secs > 0) {
          return { ...prev, secs: prev.secs - 1 };
        } else if (prev.mins > 0) {
          return { hrs: prev.hrs, mins: prev.mins - 1, secs: 59 };
        } else if (prev.hrs > 0) {
          return { hrs: prev.hrs - 1, mins: 59, secs: 59 };
        } else {
          clearInterval(timer);
          addToast('Room has expired and self-destructed!', 'error');
          router.push('/');
          return { hrs: 0, mins: 0, secs: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, addToast]);

  // Copy PIN to clipboard
  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    addToast(`Room PIN #${pin} copied to clipboard!`, 'success');
  };

  // Leave room action
  const handleLeaveRoom = () => {
    showConfirm(
      'Leave Room',
      'Are you sure you want to leave the room?',
      () => {
        leaveRoom();
        router.push('/');
      }
    );
  };

  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const handleDeleteRoom = () => {
    showConfirm(
      'Delete Room',
      'WARNING: This will permanently delete the room and self-destruct all shared files, code, and notes. Proceed?',
      () => {
        deleteRoom();
        router.push('/');
      }
    );
  };

  const handleClearFeed = () => {
    showConfirm(
      'Clear Feed',
      'Are you sure you want to clear the feed? All messages, files and code snippets will be deleted.',
      () => clearFeed()
    );
  };

  const handleToggleLock = (val: boolean) => {
    showConfirm(
      val ? 'Lock Room' : 'Unlock Room',
      val 
        ? 'Are you sure you want to lock the room? New members will not be able to join.' 
        : 'Are you sure you want to unlock the room? This will allow new members to knock and join.',
      () => toggleLockRoom()
    );
  };

  const handleToggleMute = (val: boolean) => {
    showConfirm(
      val ? 'Mute Members' : 'Unmute Members',
      val 
        ? 'Are you sure you want to mute all members? Nobody will be able to send messages, snippets, or files.' 
        : 'Are you sure you want to unmute all members? This will restore their chat composer access.',
      () => toggleMuteChat()
    );
  };

  const menuItems = [
    { name: 'Live Feed', path: `/room/${pin}`, icon: <MessageSquare className="w-4 h-4" /> },
    { name: 'Files', path: `/room/${pin}/files`, icon: <FolderOpen className="w-4 h-4" /> },
    { name: 'Members', path: `/room/${pin}/members`, icon: <Users className="w-4 h-4" /> },
    { name: 'QR Code', path: `/room/${pin}/qr`, icon: <QrCode className="w-4 h-4" /> },
    { name: 'Activity', path: `/room/${pin}/activity`, icon: <Activity className="w-4 h-4" /> },
    { name: 'Code Snippets', path: `/room/${pin}/code`, icon: <Code className="w-4 h-4" /> },
    { name: 'Notes', path: `/room/${pin}/notes`, icon: <StickyNote className="w-4 h-4" /> },
    { name: 'Search', path: `/room/${pin}/search`, icon: <Search className="w-4 h-4" /> },
    { name: 'Settings', path: `/room/${pin}/settings`, icon: <Settings className="w-4 h-4" /> },
  ];

  // Helper to check if item path matches pathname
  const isSelected = (path: string) => {
    if (path === `/room/${pin}`) {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  if (!pin || !currentUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-20 select-none bg-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3.5px] border-neo-dark border-t-neo-yellow rounded-full animate-spin" />
          <span className="text-xs font-black uppercase text-neo-dark tracking-wide">Syncing Session...</span>
        </div>
      </div>
    );
  }

  if (!isSessionApproved && currentUser?.role === 'member') {
    return (
      <div className="fixed inset-0 bg-neo-dark/85 flex items-center justify-center p-4 z-50 select-none bg-cream">
        {showPasswordPrompt ? (
          <Card variant="white" className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border-[4px] shadow-[6px_6px_0_0_#111111]">
            <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-neo-yellow flex items-center justify-center text-3xl animate-bounce shadow-neo-sm">
              🔑
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-archivo text-xl uppercase text-neo-dark">Enter Password</h2>
              <p className="text-xs font-bold text-neo-dark/65 max-w-xs leading-normal mx-auto">
                This room is password-protected. Please enter the password provided by the host.
              </p>
              {passwordError && (
                <span className="text-[10px] font-black uppercase text-neo-red mt-1">{passwordError}</span>
              )}
            </div>
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-3">
              <input
                type="password"
                required
                placeholder="Room Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="neo-input w-full text-sm font-semibold text-center"
                autoFocus
              />
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleCancelPassword}
                  className="flex-1 py-2.5 border-[2.5px] border-neo-dark rounded-[10px] bg-white font-archivo text-xs uppercase tracking-wider transition-all font-black text-neo-dark/60 hover:bg-cream"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="yellow"
                  size="sm"
                  className="flex-1 font-archivo uppercase text-xs shadow-neo-sm py-2.5 justify-center"
                >
                  Submit
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card variant="white" className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border-[4px] shadow-[6px_6px_0_0_#111111]">
            <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-neo-yellow flex items-center justify-center text-3xl animate-bounce shadow-neo-sm">
              🚪
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-archivo text-xl uppercase text-neo-dark animate-pulse">Waiting for Approval...</h2>
              <p className="text-xs font-bold text-neo-dark/65 max-w-xs leading-normal mx-auto">
                Knocked on the door. The host has been notified of your request to join. Please wait.
              </p>
            </div>
            <div className="w-full flex items-center gap-2 border-[2.5px] border-neo-dark bg-cream rounded-[8px] p-2.5 justify-center text-[10px] font-black uppercase text-neo-dark">
              <span className="w-2.5 h-2.5 rounded-full bg-neo-orange animate-ping" />
              <span>Buddy Name: {currentUser.name} (Room #{pin})</span>
            </div>
            <Button 
              variant="red" 
              size="sm" 
              className="w-full border-[2.5px] text-xs font-archivo shadow-[2px_2px_0_0_#111111]"
              onClick={() => {
                socketService.disconnect();
                router.push('/join');
              }}
            >
              Leave Queue
            </Button>
          </Card>
        )}
      </div>
    );
  }

  const isHost = currentUser?.role === 'host';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFF9F1] md:bg-white p-4 justify-between select-none">
      <div className="flex flex-col gap-6">
        {/* Navigation list */}
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const selected = isSelected(item.path);
            return (
              <Link 
                key={item.name} 
                href={item.path} 
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 border-[3px] border-neo-dark rounded-[10px] font-archivo text-xs uppercase tracking-wider transition-all font-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo ${
                  selected 
                    ? 'bg-neo-yellow -translate-x-[2px] -translate-y-[2px] shadow-neo' 
                    : 'bg-white'
                }`}
              >
                {item.icon}
                <span className={selected ? 'underline decoration-[2.5px] decoration-neo-dark underline-offset-4' : ''}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button 
            onClick={handleLeaveRoom}
            className="flex items-center gap-3 px-4 py-3 border-[3px] border-neo-dark rounded-[10px] font-archivo text-xs uppercase tracking-wider transition-all font-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo bg-neo-red hover:bg-[#ff5555] text-white mt-1 active:scale-95"
          >
            <LogOut className="w-4 h-4 text-white" />
            <span>Leave Room</span>
          </button>
        </nav>

        {/* Host Controls Panel */}
        {isHost ? (
          <div className="flex flex-col gap-3">
            <Card variant="white" className="p-4 flex flex-col gap-3.5">
              <span className="font-archivo text-[10.5px] uppercase tracking-wider text-neo-dark border-b-[2px] border-neo-dark pb-1.5 font-black">
                Host Controls
              </span>
              <div className="flex flex-col gap-3">
                <Switch
                  label="Lock Room"
                  checked={activeRoom?.isLocked || false}
                  onCheckedChange={handleToggleLock}
                />
                <Switch
                  label="Mute Members"
                  checked={activeRoom?.isMuted || false}
                  onCheckedChange={handleToggleMute}
                />
                <Button 
                  variant="white" 
                  size="sm" 
                  className="w-full gap-2 border-[2px] text-xs font-archivo"
                  onClick={handleClearFeed}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  Clear Feed
                </Button>
                <Button 
                  variant="red" 
                  size="sm" 
                  className="w-full gap-2 border-[2px] text-xs font-archivo"
                  onClick={handleDeleteRoom}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Room
                </Button>
              </div>
            </Card>

            {/* Storage Progress Card */}
            <Card variant="white" className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-neo-dark">
                <span>Storage</span>
                <span>{displayStr} / {limitMB} MB</span>
              </div>
              <div className="w-full h-3 border-[2.5px] border-neo-dark rounded-full bg-cream overflow-hidden">
                <div 
                  className="bg-neo-green h-full rounded-full transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </Card>
          </div>
        ) : (
          /* Normal User widgets (Promo / Storage status) */
          <div className="flex flex-col gap-3">
            {/* Storage Progress Card */}
            <Card variant="white" className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-neo-dark">
                <span>Storage</span>
                <span>{displayStr} / {limitMB} MB</span>
              </div>
              <div className="w-full h-3 border-[2.5px] border-neo-dark rounded-full bg-cream overflow-hidden">
                <div 
                  className="bg-neo-green h-full rounded-full transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Self-Destruct countdown timer */}
      <Card variant="orange" className="p-4 flex flex-col items-center gap-1 shadow-neo-sm border-[3px] mt-6">
        <span className="text-[9.5px] font-black uppercase text-neo-dark tracking-wide">
          Room will self-destruct in
        </span>
        <div className="flex gap-1.5 font-archivo font-black text-sm text-neo-dark">
          <span>{String(timeLeft.hrs).padStart(2, '0')}</span>
          <span>:</span>
          <span>{String(timeLeft.mins).padStart(2, '0')}</span>
          <span>:</span>
          <span>{String(timeLeft.secs).padStart(2, '0')}</span>
        </div>
        <span className="text-[8px] font-bold text-neo-dark/70 tracking-wider uppercase">
          hrs mins secs
        </span>
      </Card>

      {/* Powered by Modi Studio */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t-[2.5px] border-neo-dark/10">
        <span className="text-[9px] font-black uppercase text-neo-dark/50 tracking-wider">
          Powered by
        </span>
        <a 
          href="https://modistudio.online"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-neo-dark text-white rounded-full pl-1 pr-3 py-1 shadow-neo-sm hover:translate-y-[-1px] transition-all cursor-pointer active:translate-y-0 active:shadow-neo-sm"
        >
          <img 
            src="/modi-studio-logo.jpg" 
            alt="Modi Studio Logo" 
            className="w-5 h-5 rounded-full object-cover border border-white/20" 
          />
          <span className="font-archivo text-[9.5px] uppercase font-black tracking-wide text-white">
            Modi Studio
          </span>
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      {/* Header navbar */}
      <header className="border-b-[3px] border-neo-dark bg-white h-16 sticky top-0 z-30 flex items-center justify-between">
        {/* Leftmost cell: Logo (aligned with sidebar width on desktop) */}
        <div className="h-full hidden md:flex w-64 border-r-[3px] border-neo-dark items-center px-4 bg-white select-none">
          <Link href="/" className="hover:scale-95 transition-all flex items-center h-full relative z-10">
            <img src="/logo.png" alt="Lab Buddies Logo" className="h-16 w-auto object-contain max-h-none scale-105 origin-left" />
          </Link>
        </div>

        {/* Center section: Room actions */}
        <div className="flex-1 flex items-center justify-start gap-3 px-3">
          {/* Mobile Hamburger toggle */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 border-[2px] border-neo-dark bg-white rounded-md hover:bg-cream"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Members online badge (Desktop only) */}
          <div className="hidden md:flex items-center gap-1.5 bg-white border-[2.5px] border-neo-dark rounded-full px-3 py-1 text-xs font-black text-neo-dark">
            <span className="w-2.5 h-2.5 rounded-full bg-neo-green animate-pulse flex-shrink-0" />
            <span>{members.length} Members Online</span>
          </div>
        </div>

        {/* Right side: Room Pin badge & Quick QR button */}
        <div className="pr-3 flex items-center gap-2">
          <Link href={`/room/${pin}/qr`}>
            <button 
              className="p-1.5 sm:p-2 border-[2px] border-neo-dark bg-white hover:bg-neo-yellow rounded-[8px] transition-all shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-y-0 active:translate-x-0 flex items-center justify-center"
              title="View Room QR Code"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neo-dark" />
            </button>
          </Link>

          <div className="flex items-center bg-white border-[2px] sm:border-[2.5px] border-neo-dark rounded-[8px] pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 py-0.5 sm:py-1 shadow-neo-sm select-none">
            <span className="text-[10px] font-black uppercase text-neo-dark/50 mr-1.5">Pin</span>
            <span className="font-archivo text-xs sm:text-sm font-black mr-1.5 sm:mr-2 text-neo-dark">{pin}</span>
            <button 
              onClick={handleCopyPin}
              className="p-0.5 sm:p-1 border-[1.5px] border-neo-dark bg-cream hover:bg-neo-yellow rounded transition-all active:translate-y-[0.5px] flex items-center justify-center"
              title="Copy Room PIN"
            >
              <Copy className="w-3 sm:w-3.5 sm:h-3.5 text-neo-dark" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout container */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar (Desktop: visible, fixed width) */}
        <aside className="hidden md:block w-64 border-r-[3px] border-neo-dark bg-white min-h-[calc(100dvh-4rem)] flex-shrink-0">
          {sidebarContent}
        </aside>

        {/* Mobile/Tablet Sidebar (Slideover) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-neo-dark/40 backdrop-blur-[1px] md:hidden"
                style={{ top: '4rem' }}
              />
              {/* Drawer */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 bottom-0 top-16 z-40 w-64 border-r-[3px] border-neo-dark bg-white md:hidden overflow-y-auto"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Page Content area */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden min-h-[calc(100dvh-4rem)]">
          {children}
        </main>
      </div>

      {/* Floating Knocking Alerts for Host */}
      {knockingRequests.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm md:w-full z-50 flex flex-col gap-3 select-none">
          {knockingRequests.map((req) => (
            <Card 
              key={req.socketId} 
              variant="white" 
              className="p-4 border-[3px] shadow-[4px_4px_0_0_#111111] flex items-center justify-between gap-4"
            >
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-[9px] font-black text-neo-dark/50 uppercase tracking-wide">Knock Request</span>
                <span className="text-xs font-black text-neo-dark truncate">{req.name} wants to join</span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button 
                  variant="yellow" 
                  size="sm" 
                  className="border-[2px] py-1 px-2.5 font-archivo text-[10px] uppercase shadow-[1.5px_1.5px_0_0_#111111] hover:translate-y-0 active:translate-y-0.5 active:shadow-none"
                  onClick={() => handleAcceptKnock(req.socketId)}
                >
                  Accept
                </Button>
                <Button 
                  variant="red" 
                  size="sm" 
                  className="border-[2px] py-1 px-2.5 font-archivo text-[10px] uppercase shadow-[1.5px_1.5px_0_0_#111111] hover:translate-y-0 active:translate-y-0.5 active:shadow-none"
                  onClick={() => handleRejectKnock(req.socketId)}
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdInterstitial 
        isOpen={isStorageAdOpen}
        onComplete={() => {
          if (currentUser?.role === 'host') {
            socketService.emitHostAdCompleted(pin);
          }
        }}
        onClose={() => {
          if (currentUser?.role === 'host') {
            setIsStorageAdOpen(false);
          }
        }}
        actionLabel="Expanding Storage Limit"
        showCloseButton={currentUser?.role === 'host'}
      />
    </div>
  );
}
