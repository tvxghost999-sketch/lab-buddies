'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Copy, LogOut, Menu, X, 
  MessageSquare, FolderOpen, Users, Activity, 
  Code, StickyNote, Settings, Search, Lock, 
  VolumeX, Trash2, Ban, QrCode, Calendar
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { Switch } from '@/components/ui/input';
import AdInterstitial from '@/components/AdInterstitial';
import Image from 'next/image';

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

  useEffect(() => {
    if (!pin || !currentUser || currentUser.role !== 'member') return;

    const tempKey = `temp_active_time_${pin}`;
    if (typeof window !== 'undefined' && !localStorage.getItem(tempKey)) {
      localStorage.setItem(tempKey, '0');
    }

    const interval = setInterval(() => {
      if (typeof window === 'undefined') return;

      const currentTemp = parseInt(localStorage.getItem(tempKey) || '0', 10);
      const newTemp = currentTemp + 1;
      localStorage.setItem(tempKey, newTemp.toString());

      const roll = localStorage.getItem('attendance_roll');
      if (roll) {
        const rollKey = `attendance_time_${pin}_${roll}`;
        const currentRollSec = parseInt(localStorage.getItem(rollKey) || '0', 10);
        const initialRollSec = currentRollSec > 0 ? currentRollSec : newTemp;
        const newRollSec = initialRollSec + 1;
        localStorage.setItem(rollKey, newRollSec.toString());

        socketService.sendAttendanceHeartbeat(pin, roll, newRollSec);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pin, currentUser]);

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

  // Host presence tracking states
  const isHostOnline = useMemo(() => {
    if (currentUser?.role === 'host') return true;
    return members.some(m => m.role === 'host' && m.isOnline);
  }, [members, currentUser]);

  const [wasHostOffline, setWasHostOffline] = useState(false);
  const [showHostLiveToast, setShowHostLiveToast] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'host') return;

    if (!isHostOnline) {
      setWasHostOffline(true);
      setShowHostLiveToast(false);
    } else {
      if (wasHostOffline) {
        setWasHostOffline(false);
        setShowHostLiveToast(true);
        const timer = setTimeout(() => {
          setShowHostLiveToast(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isHostOnline, wasHostOffline, currentUser]);

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
    { name: 'Code Snippets', path: `/room/${pin}/code`, icon: <Code className="w-4 h-4" /> },
    { name: 'Notes', path: `/room/${pin}/notes`, icon: <StickyNote className="w-4 h-4" /> },
    { name: 'Members', path: `/room/${pin}/members`, icon: <Users className="w-4 h-4" /> },
    { name: 'Attendance', path: `/room/${pin}/attendance`, icon: <Calendar className="w-4 h-4" /> },
    { name: 'QR Code', path: `/room/${pin}/qr`, icon: <QrCode className="w-4 h-4" /> },
    { name: 'Activity', path: `/room/${pin}/activity`, icon: <Activity className="w-4 h-4" /> },
    { name: 'Search', path: `/room/${pin}/search`, icon: <Search className="w-4 h-4" /> },
    { name: 'Settings', path: `/room/${pin}/settings`, icon: <Settings className="w-4 h-4" /> },
  ];

  const isSelected = (path: string) => {
    if (path === `/room/${pin}`) {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  if (!pin || !currentUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-20 select-none bg-[#050608]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#FFD600] rounded-full animate-spin" />
          <span className="text-xs text-[#a1a1aa] tracking-wide">Syncing Session...</span>
        </div>
      </div>
    );
  }

  if (!isSessionApproved && currentUser?.role === 'member') {
    return (
      <div className="fixed inset-0 bg-[#050608]/90 flex items-center justify-center p-4 z-50 select-none backdrop-blur-sm">
        {showPasswordPrompt ? (
          <div className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 flex items-center justify-center text-3xl animate-bounce">
              🔑
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-[#f4f4f5]">Enter Password</h2>
              <p className="text-xs text-[#71717a] max-w-xs leading-normal mx-auto">
                This room is password-protected. Please enter the password provided by the host.
              </p>
              {passwordError && (
                <span className="text-[10px] uppercase font-bold text-[#EF4444] mt-1">{passwordError}</span>
              )}
            </div>
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-3">
              <input
                type="password"
                required
                placeholder="Room Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="neo-input w-full text-sm text-center"
                autoFocus
              />
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleCancelPassword}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-xs font-medium text-[#a1a1aa] hover:bg-white/[0.06] transition-all"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="yellow"
                  size="sm"
                  className="flex-1 text-xs py-2.5 justify-center"
                >
                  Submit
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="max-w-md w-full p-8 text-center flex flex-col items-center gap-6 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/20 flex items-center justify-center text-3xl animate-bounce">
              🚪
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-[#f4f4f5] animate-pulse">Waiting for Approval...</h2>
              <p className="text-xs text-[#71717a] max-w-xs leading-normal mx-auto">
                Knocked on the door. The host has been notified of your request to join. Please wait.
              </p>
            </div>
            <div className="w-full flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 justify-center text-xs text-[#a1a1aa]">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-ping" />
              <span>Buddy Name: {currentUser.name} (Room #{pin})</span>
            </div>
            <Button 
              variant="red" 
              size="sm" 
              className="w-full text-xs justify-center"
              onClick={() => {
                socketService.disconnect();
                router.push('/join');
              }}
            >
              Leave Queue
            </Button>
          </div>
        )}
      </div>
    );
  }

  const isHost = currentUser?.role === 'host';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0f0f10] p-4 justify-between select-none">
      <div className="flex flex-col gap-6">
        {/* Navigation list */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const selected = isSelected(item.path);
            return (
              <Link 
                key={item.name} 
                href={item.path} 
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selected 
                    ? 'bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/20' 
                    : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button 
            onClick={handleLeaveRoom}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-[#EF4444]/10 border border-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/20 mt-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Room</span>
          </button>
        </nav>

        {/* Host Controls Panel */}
        {isHost ? (
          <div className="flex flex-col gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl flex flex-col gap-3.5">
              <span className="text-[10px] uppercase tracking-wider text-[#71717a] border-b border-white/[0.06] pb-1.5 font-medium">
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
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2 text-xs justify-center"
                  onClick={handleClearFeed}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  Clear Feed
                </Button>
                <Button 
                  variant="red" 
                  size="sm" 
                  className="w-full gap-2 text-xs justify-center"
                  onClick={handleDeleteRoom}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Room
                </Button>
              </div>
            </div>

            {/* Storage Progress Card */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] text-[#71717a] uppercase">
                <span>Storage</span>
                <span>{displayStr} / {limitMB} MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="bg-[#22C55E] h-full rounded-full transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Storage Progress Card */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] text-[#71717a] uppercase">
                <span>Storage</span>
                <span>{displayStr} / {limitMB} MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="bg-[#22C55E] h-full rounded-full transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Self-Destruct countdown timer */}
      <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/20 p-4 rounded-2xl flex flex-col items-center gap-1.5 mt-6">
        <span className="text-[10px] uppercase text-[#FF6A00] tracking-wider">
          Room will self-destruct in
        </span>
        <div className="flex gap-1.5 font-mono font-bold text-lg text-[#FF6A00]">
          <span>{String(timeLeft.hrs).padStart(2, '0')}</span>
          <span>:</span>
          <span>{String(timeLeft.mins).padStart(2, '0')}</span>
          <span>:</span>
          <span>{String(timeLeft.secs).padStart(2, '0')}</span>
        </div>
        <span className="text-[9px] text-[#FF6A00]/80 tracking-wider uppercase font-medium">
          hrs mins secs
        </span>
      </div>

      {/* Powered by Modi Studio */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
        <span className="text-[9px] uppercase text-white/30 tracking-wider">
          Powered by
        </span>
        <a 
          href="https://modistudio.online"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white rounded-full pl-1 pr-3 py-1 transition-all"
        >
          <Image 
            src="/modi-studio-logo.jpg" 
            alt="Modi Studio Logo" 
            width={20}
            height={20}
            className="w-5 h-5 rounded-full object-cover" 
          />
          <span className="text-[9.5px] font-medium tracking-wide">
            Modi Studio
          </span>
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050608] text-[#f4f4f5]">
      {/* Header navbar */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl h-16 sticky top-0 z-30 flex items-center justify-between">
        {/* Leftmost cell: Logo */}
        <div className="h-full hidden md:flex w-64 border-r border-white/[0.07] items-center px-4 select-none">
          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center h-full relative z-10">
            <Image src="/logo.png" alt="Lab Buddies Logo" width={140} height={40} className="h-14 w-auto object-contain scale-105 origin-left" />
          </Link>
        </div>

        {/* Center section: Room actions */}
        <div className="flex-1 flex items-center justify-start gap-3 px-3">
          {/* Mobile Hamburger toggle */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 border border-white/[0.1] bg-white/[0.05] rounded-xl text-white hover:bg-white/[0.08]"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Members online badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1 text-xs text-[#f4f4f5]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse flex-shrink-0" />
            <span>{members.length} Members Online</span>
          </div>
        </div>

        {/* Right side: Room Pin badge & Quick QR button */}
        <div className="pr-3 flex items-center gap-2">
          <Link href={`/room/${pin}/qr`}>
            <button 
              className="p-2 border border-white/[0.08] bg-white/[0.03] hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] rounded-xl transition-all flex items-center justify-center cursor-pointer text-[#a1a1aa]"
              title="View Room QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </Link>

          <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-xl pl-3 pr-2 py-1 select-none">
            <span className="text-[10px] uppercase text-[#71717a] mr-1.5 font-medium">Pin</span>
            <span className="font-mono text-sm font-bold mr-2 text-[#f4f4f5]">{pin}</span>
            <button 
              onClick={handleCopyPin}
              className="p-1 border border-white/[0.1] bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] rounded-lg transition-all flex items-center justify-center cursor-pointer text-[#a1a1aa]"
              title="Copy Room PIN"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout container */}
      <div className="flex-1 flex relative h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden md:block w-64 border-r border-white/[0.07] bg-[#0f0f10] h-full flex-shrink-0 overflow-y-auto custom-scrollbar">
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
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                style={{ top: '4rem' }}
              />
              {/* Drawer */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 bottom-0 top-16 z-40 w-64 border-r border-white/[0.07] bg-[#0f0f10] md:hidden overflow-y-auto"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Page Content area */}
        <main className="flex-1 p-0 md:p-6 overflow-y-auto overflow-x-hidden h-full bg-[#050608]">
          {children}
        </main>
      </div>

      {/* Floating Knocking Alerts for Host */}
      {knockingRequests.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm md:w-full z-50 flex flex-col gap-3 select-none">
          {knockingRequests.map((req) => (
            <div 
              key={req.socketId} 
              className="p-4 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4"
            >
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-[9px] text-[#71717a] uppercase tracking-wider font-medium">Knock Request</span>
                <span className="text-xs font-semibold text-[#f4f4f5] truncate">{req.name} wants to join</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  variant="yellow" 
                  size="sm" 
                  className="py-1 px-2.5 text-[10px]"
                  onClick={() => handleAcceptKnock(req.socketId)}
                >
                  Accept
                </Button>
                <Button 
                  variant="red" 
                  size="sm" 
                  className="py-1 px-2.5 text-[10px]"
                  onClick={() => handleRejectKnock(req.socketId)}
                >
                  Decline
                </Button>
              </div>
            </div>
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

      {/* Host Offline Status Banner */}
      {!isHostOnline && currentUser && currentUser.role !== 'host' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 duration-300 select-none">
          <div className="flex items-center gap-2 bg-[#EF4444]/15 border border-[#EF4444]/20 text-[#EF4444] px-4 py-2.5 rounded-full text-xs font-bold shadow-[0_8px_32px_rgba(239,68,68,0.15)] backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
            <span>Host is offline. Please wait for re-entry...</span>
          </div>
        </div>
      )}

      {/* Host Live Toast Notification */}
      {showHostLiveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4 duration-300 select-none">
          <div className="flex items-center gap-2 bg-[#22C55E]/15 border border-[#22C55E]/20 text-[#22C55E] px-4 py-2.5 rounded-full text-xs font-bold shadow-[0_8px_32px_rgba(34,197,94,0.15)] backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
            <span>Host is live now!</span>
          </div>
        </div>
      )}
    </div>
  );
}
