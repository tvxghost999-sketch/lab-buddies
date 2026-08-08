'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Paperclip, Code, Send, File, Download, Copy, 
  Sparkles, Crown, Terminal, MessageSquare, MoreVertical,
  FileText, ShieldCheck, HelpCircle, Check, X,
  FileArchive, FileCode, FileImage, Lock, Users, Activity, Smile
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';

export default function RoomDashboard() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const members = useRoomStore((state) => state.members);
  const activities = useRoomStore((state) => state.activities);
  const currentUser = useRoomStore((state) => state.currentUser);
  const addFeedItem = useRoomStore((state) => state.addFeedItem);
  const addToast = useRoomStore((state) => state.addToast);
  const showConfirm = useRoomStore((state) => state.showConfirm);
  const activeRoom = useRoomStore((state) => state.activeRoom);

  // Composer mode: 'message' | 'code' | 'file'
  const [composerMode, setComposerMode] = useState<'message' | 'code' | 'file'>('message');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of the feed container when new messages arrive
  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [feedItems]);

  // Click outside handler for attachment & reaction menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
        setIsReactionMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cooldown rate limiting state
  const [isCooldownActive, setIsCooldownActive] = useState(false);

  // Input states
  const [textContent, setTextContent] = useState('');
  
  // Code block states
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('JavaScript');

  // File upload states
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedFileUrl, setSelectedFileUrl] = useState('');
  const [selectedFileCloudinaryId, setSelectedFileCloudinaryId] = useState('');
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ fileName: string; fileUrl?: string } | null>(null);

  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '👏', '🚀', '💯', '🤔'];
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const justOpenedRef = useRef(false);

  const startLongPress = (itemId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActivePickerId(itemId);
      justOpenedRef.current = true;
    }, 500); // 500ms long press duration
  };

  const endLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    function closePicker() {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      setActivePickerId(null);
    }
    document.addEventListener('click', closePicker);
    return () => {
      document.removeEventListener('click', closePicker);
    };
  }, []);

  const triggerFloatingEmoji = (emoji: string, name: string) => {
    const container = chatFeedRef.current;
    if (!container) return;

    // Create container
    const wrapper = document.createElement('div');
    wrapper.className = 'absolute bottom-16 flex flex-col items-center select-none pointer-events-none z-50 floating-emoji-animate';

    // Emoji element
    const emojiEl = document.createElement('span');
    emojiEl.className = 'text-3xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
    emojiEl.innerText = emoji;
    wrapper.appendChild(emojiEl);

    // Name label element
    const nameEl = document.createElement('span');
    nameEl.className = 'text-[9.5px] bg-black/75 border border-white/[0.08] text-white/90 px-2 py-0.5 rounded-full mt-1 font-semibold tracking-wide whitespace-nowrap shadow-md';
    nameEl.innerText = name;
    wrapper.appendChild(nameEl);

    // Position and transform
    const rect = container.getBoundingClientRect();
    const leftPos = Math.random() * (rect.width - 100) + 50; // buffer for name labels
    wrapper.style.left = `${leftPos}px`;

    const scale = 0.85 + Math.random() * 0.4;
    const rotate = (Math.random() - 0.5) * 35;
    wrapper.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    wrapper.style.setProperty('--rotate-angle', `${rotate}deg`);

    container.appendChild(wrapper);

    setTimeout(() => {
      if (container.contains(wrapper)) {
        container.removeChild(wrapper);
      }
    }, 2000);
  };

  const handleSendLiveReaction = (emoji: string) => {
    const senderName = currentUser?.name || 'Anonymous';
    socketService.sendLiveReaction(pin, emoji, senderName);
  };

  useEffect(() => {
    socketService.onLiveReactionReceived(({ emoji, name }) => {
      triggerFloatingEmoji(emoji, name);
    });
  }, [pin]);

  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);

  const [showAutoCheckIn, setShowAutoCheckIn] = useState(false);
  const [autoNameInput, setAutoNameInput] = useState('');
  const [autoRollInput, setAutoRollInput] = useState('');
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  // Compile active session info to check for auto prompt
  const activeAttendanceInfo = useMemo(() => {
    const sessionsList: { id: string; name: string }[] = [];
    const closedSessions = new Set<string>();
    const checkins = new Set<string>();

    feedItems.forEach(item => {
      const content = item.content || '';
      if (content.startsWith('__attendance_start__')) {
        const parts = content.split('__');
        const name = parts[2] || 'Lab Session';
        const id = parts[3] || item._id || item.id || '';
        sessionsList.push({ id, name });
      } else if (content.startsWith('__attendance_end__')) {
        const parts = content.split('__');
        const id = parts[2];
        if (id) closedSessions.add(id);
      } else if (content.startsWith('__attendance_checkin__')) {
        const parts = content.split('__');
        const sessionId = parts[2];
        const name = parts[3];
        const roll = parts[4];
        
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('attendance_name') : '';
        const storedRoll = typeof window !== 'undefined' ? localStorage.getItem('attendance_roll') : '';
        const matchName = storedName || currentUser?.name;
        const matchRoll = storedRoll || loggedInUser?.rollNumber;

        if (name === matchName || roll === matchRoll) {
          if (sessionId) checkins.add(sessionId);
        }
      }
    });

    const active = sessionsList.find(s => !closedSessions.has(s.id)) || null;
    const hasCheckedIn = active ? checkins.has(active.id) : false;

    return {
      active,
      hasCheckedIn
    };
  }, [feedItems, currentUser, loggedInUser]);

  // Pre-fill modal states and auto show if not checked in
  useEffect(() => {
    if (activeAttendanceInfo.active && !activeAttendanceInfo.hasCheckedIn && currentUser?.role === 'member') {
      const storedName = typeof window !== 'undefined' ? localStorage.getItem('attendance_name') : '';
      const storedRoll = typeof window !== 'undefined' ? localStorage.getItem('attendance_roll') : '';
      
      setAutoNameInput(storedName || loggedInUser?.name || currentUser?.name || '');
      setAutoRollInput(storedRoll || loggedInUser?.rollNumber || '');
      setShowAutoCheckIn(true);
    } else {
      setShowAutoCheckIn(false);
    }
  }, [activeAttendanceInfo, currentUser, loggedInUser]);

  const handleAutoCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttendanceInfo.active || !currentUser) return;

    if (!autoNameInput.trim()) {
      addToast('Please enter your full name.', 'warning');
      return;
    }
    if (!autoRollInput.trim()) {
      addToast('Please enter your Roll Number.', 'warning');
      return;
    }

    setIsAutoSubmitting(true);
    try {
      const finalName = autoNameInput.trim();
      const finalRoll = autoRollInput.trim();

      // Save locally
      if (typeof window !== 'undefined') {
        localStorage.setItem('attendance_name', finalName);
        localStorage.setItem('attendance_roll', finalRoll);
      }

      const tempKey = `temp_active_time_${pin}`;
      const tempTime = typeof window !== 'undefined' ? parseInt(localStorage.getItem(tempKey) || '0', 10) : 0;

      // Sync to database if loggedin
      if (loggedInUser) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/update-profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: loggedInUser.email,
              name: finalName,
              rollNumber: finalRoll
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setLoggedInUser({
                ...loggedInUser,
                name: data.user.name,
                rollNumber: data.user.rollNumber
              });
            }
          }
        } catch (dbErr) {
          console.error('Error syncing auto checkin to profile:', dbErr);
        }
      }

      // Emit attendance item
      addFeedItem({
        type: 'message',
        senderId: currentUser.id,
        senderName: finalName,
        senderRole: currentUser.role,
        content: `__attendance_checkin__${activeAttendanceInfo.active.id}__${finalName}__${finalRoll}__${tempTime}`,
      });

      setShowAutoCheckIn(false);
      addToast('Attendance marked present successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to mark attendance.', 'error');
    } finally {
      setIsAutoSubmitting(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addToast(`Uploading ${file.name}...`, 'info');
    setIsFileUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pin', pin);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedFileName(data.originalName || data.fileName);
        setSelectedFileSize(data.fileSize);
        setSelectedFileType(data.fileType);
        setSelectedFileUrl(data.fileUrl);
        setSelectedFileCloudinaryId(data.cloudinaryPublicId || '');
        addToast('File uploaded successfully!', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'STORAGE_EXCEEDED') {
          if (currentUser?.role === 'host') {
            showConfirm(
              "Storage Limit Reached",
              `The room storage capacity has been reached. Would you like to expand the storage limit by 25MB by watching a 5-second advertisement on all connected devices?`,
              () => {
                socketService.emitTriggerStorageAdRequest(pin);
              }
            );
          } else {
            addToast("Storage capacity exceeded! Notifying host to expand the limit...", "warning");
            socketService.emitMemberStorageFull(pin, currentUser?.name || 'Anonymous');
          }
        } else {
          addToast(errData.error || 'File upload failed.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Error uploading file.', 'error');
    } finally {
      setIsFileUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCooldownActive) {
      addToast('Please wait a moment before sending another item.', 'warning');
      return;
    }

    if (activeRoom?.isMuted && currentUser?.role !== 'host') {
      addToast('Chat is muted by the host.', 'error');
      return;
    }

    const sender = currentUser || { id: 'temp-user', name: 'Anonymous', role: 'member', joinedAt: '12:00 PM', isOnline: true, isMuted: false };

    if (composerMode === 'message') {
      if (!textContent.trim()) return;
      addFeedItem({
        type: 'message',
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        content: textContent,
      });
      setTextContent('');
    } else if (composerMode === 'code') {
      if (!codeContent.trim()) {
        addToast('Please enter some code to share.', 'warning');
        return;
      }
      addFeedItem({
        type: 'code',
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        code: codeContent,
        language: codeLanguage,
      });
      setCodeContent('');
      setComposerMode('message');
    } else if (composerMode === 'file' && selectedFileUrl) {
      addFeedItem({
        type: 'file',
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        fileName: selectedFileName,
        fileSize: selectedFileSize,
        fileType: selectedFileType,
        fileUrl: selectedFileUrl,
        cloudinaryPublicId: selectedFileCloudinaryId,
      });
      setSelectedFileName('');
      setSelectedFileSize('');
      setSelectedFileType('');
      setSelectedFileUrl('');
      setSelectedFileCloudinaryId('');
      setComposerMode('message');
    }
  };

  const triggerCooldown = () => {
    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    if (!isPremium) {
      setIsCooldownActive(true);
      setTimeout(() => setIsCooldownActive(false), 1200);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code snippet copied to clipboard!', 'success');
  };

  const handleDownload = (fileName: string, fileUrl?: string) => {
    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    if (!isPremium) {
      setPendingDownload({ fileName, fileUrl });
      setIsAdOpen(true);
    } else {
      proceedWithDownload(fileName, fileUrl);
    }
  };

  const proceedWithDownload = (fileName: string, fileUrl?: string) => {
    setIsAdOpen(false);
    setPendingDownload(null);
    if (!fileUrl) {
      addToast('Download link is missing.', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Downloading ${fileName}...`, 'success');
  };

  // Reactions Map Compiler
  const reactionsMap: Record<string, { emoji: string; senderName: string }[]> = {};
  const visibleFeedItems = feedItems.filter(item => {
    if (item.type === 'message' && item.content?.startsWith('__react__')) {
      const parts = item.content.split('__');
      if (parts.length >= 4) {
        const emoji = parts[2];
        const targetId = parts[3];
        if (!reactionsMap[targetId]) {
          reactionsMap[targetId] = [];
        }
        // Enforce only one reaction per user by removing any existing reaction by them on this target
        reactionsMap[targetId] = reactionsMap[targetId].filter(
          r => r.senderName !== item.senderName
        );
        // Only insert if it is not a removal indicator
        if (emoji !== 'remove') {
          reactionsMap[targetId].push({ emoji, senderName: item.senderName });
        }
      }
      return false; // Hide reaction logs from direct feed items display
    }
    if (item.type === 'message' && item.content?.startsWith('__attendance_')) {
      return false; // Hide attendance logs from direct feed items display
    }
    return true;
  });

  const handleReact = (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const targetReactions = reactionsMap[messageId] || [];
    const existingReaction = targetReactions.find(
      r => r.senderName === currentUser.name
    );

    if (existingReaction?.emoji === emoji) {
      // Toggle off: Send removal message
      addFeedItem({
        type: 'message',
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content: `__react__remove__${messageId}`,
      });
    } else {
      // Add or replace with new reaction
      addFeedItem({
        type: 'message',
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content: `__react__${emoji}__${messageId}`,
      });
    }
    setActivePickerId(null);
  };

  const renderReactions = (messageId: string) => {
    const list = reactionsMap[messageId] || [];
    if (list.length === 0) return null;

    const grouped: Record<string, string[]> = {};
    list.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.senderName);
    });

    return (
      <div className="flex flex-wrap gap-1 mt-1.5 select-none items-center max-w-full">
        {Object.entries(grouped).map(([emoji, senders]) => (
          <div 
            key={emoji}
            className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/15 px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-all"
            title={`Reacted by: ${senders.join(', ')}`}
            onClick={() => handleReact(messageId, emoji)}
          >
            <span>{emoji}</span>
            <span className="text-[9px] text-[#71717a] font-semibold">{senders.length}</span>
          </div>
        ))}
      </div>
    );
  };

  const onlineCount = useMemo(() => {
    const count = members.filter(m => m.isOnline).length;
    return count > 0 ? count : 1;
  }, [members]);

  return (
    <div className="flex flex-col h-full w-full md:h-[calc(100vh-6rem)] border-0 md:border border-white/[0.08] bg-[#0f0f10] md:rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(-400px) scale(1.3) rotate(var(--rotate-angle, 20deg));
            opacity: 0;
          }
        }
        .floating-emoji-animate {
          animation: floatUp 2s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
        }
      `}</style>
      {/* Feed Panel Header */}
      <div className="bg-white/[0.02] border-b border-white/[0.08] px-5 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FFD600]" />
          <span className="text-sm font-semibold text-[#f4f4f5]">Live Workspace Feed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[10px] text-[#71717a] font-medium">
            {onlineCount} Online
          </span>
        </div>
      </div>

      {/* Message Feed Display */}
      <div 
        ref={chatFeedRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 bg-black/20"
      >
        {feedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 select-none py-10">
            <div className="w-12 h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl flex items-center justify-center text-white/40">
              💬
            </div>
            <span className="text-xs text-[#a1a1aa] font-medium uppercase tracking-wider">Feed is empty</span>
            <p className="text-[11px] text-[#71717a] max-w-xs leading-normal">
              Nobody has shared anything yet. Attach a code snippet, upload a file or write a chat below.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleFeedItems.map((item) => {
              const isSelf = item.senderName === currentUser?.name;
              const itemId = item._id || item.id || '';
              
              if (isSelf) {
                // Message sent by self -> Right aligned
                return (
                  <div key={itemId} className="flex flex-col gap-1 items-end max-w-[85%] sm:max-w-[70%] self-end">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] select-none">
                      <span>{item.timestamp}</span>
                      <span className="font-semibold text-[#a1a1aa]">(You)</span>
                    </div>

                    <div className="flex flex-col items-end w-full relative group">
                      {/* Hover Reaction Trigger */}
                      <div className="absolute left-[-2.5rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActivePickerId(activePickerId === itemId ? null : itemId); }}
                          className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-all cursor-pointer"
                          title="React to message"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Floating Emojis Popover */}
                      {activePickerId === itemId && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-full mb-1 right-0 bg-[#0f0f10] border border-white/[0.1] rounded-full px-2.5 py-1.5 flex gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
                        >
                          {EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(itemId, emoji)}
                              className="text-sm hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Text Message */}
                      {item.type === 'message' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="bg-[#FFD600]/10 border border-[#FFD600]/25 rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-[#FFD600] text-left cursor-pointer select-none active:scale-[0.99] transition-transform duration-100"
                        >
                          {item.content}
                        </div>
                      )}

                      {/* Code block */}
                      {item.type === 'code' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="w-full max-w-xl overflow-hidden border border-white/[0.1] rounded-2xl bg-black/60 text-left cursor-pointer active:scale-[0.99] transition-transform duration-100"
                        >
                          <div className="bg-white/[0.04] px-4 py-2.5 flex items-center justify-between text-xs border-b border-white/[0.06]">
                            <span className="font-mono text-[#FFD600] font-semibold">
                              {item.language === 'C++' ? 'cpp' : item.language === 'JavaScript' ? 'js' : item.language?.toLowerCase() || 'txt'}
                            </span>
                            <button 
                              onClick={() => handleCopyCode(item.code || '')}
                              className="flex items-center gap-1 text-[10px] text-[#71717a] hover:text-[#f4f4f5] transition-colors"
                            >
                              <span>Copy</span>
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex p-4 font-mono text-[11px] overflow-x-auto text-[#f4f4f5] leading-relaxed max-h-56">
                            <div className="select-none text-right pr-3 border-r border-white/5 text-[#52525b] mr-3 flex flex-col">
                              {(item.code || '').split('\n').map((_, index) => (
                                <span key={index}>{index + 1}</span>
                              ))}
                            </div>
                            <pre className="flex-1 text-[#f4f4f5]/90">
                              <code>{item.code}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* File Upload card */}
                      {item.type === 'file' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="border border-white/[0.08] rounded-2xl bg-[#22C55E]/10 p-3 w-full max-w-sm flex items-center gap-4 text-left cursor-pointer active:scale-[0.99] transition-transform duration-100"
                        >
                          <div className="w-10 h-10 bg-[#EF4444]/15 border border-[#EF4444]/20 rounded-xl flex flex-col items-center justify-center text-[8.5px] font-bold text-[#EF4444] flex-shrink-0 select-none">
                            <FileText className="w-4 h-4 text-[#EF4444]" />
                            <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-sm font-semibold text-[#f4f4f5] truncate">{item.fileName}</span>
                            <span className="text-xs text-[#71717a] mt-0.5">{item.fileSize}</span>
                          </div>
                          <button 
                            onClick={() => handleDownload(item.fileName || '', item.fileUrl)}
                            className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 text-[#a1a1aa]"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Render Reactions badges */}
                      {renderReactions(itemId)}

                    </div>
                  </div>
                );
              } else {
                // Message sent by another user -> Left aligned
                return (
                  <div key={itemId} className="flex gap-3 items-start max-w-[85%] sm:max-w-[70%] self-start">
                    {/* Avatar Column */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[#FFD600]/10 border border-[#FFD600]/25 flex items-center justify-center text-xs font-bold uppercase text-[#FFD600]">
                        {item.senderName[0]}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[#050608]" />
                    </div>

                    {/* Content Column */}
                    <div className="flex flex-col gap-1 items-start flex-1 min-w-0 w-full relative group">
                      {/* Hover Reaction Trigger */}
                      <div className="absolute right-[-2.5rem] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActivePickerId(activePickerId === itemId ? null : itemId); }}
                          className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-all cursor-pointer"
                          title="React to message"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Floating Emojis Popover */}
                      {activePickerId === itemId && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-full mb-1 left-0 bg-[#0f0f10] border border-white/[0.1] rounded-full px-2.5 py-1.5 flex gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
                        >
                          {EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(itemId, emoji)}
                              className="text-sm hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sender details */}
                      <div className="flex items-center gap-2 text-xs select-none">
                        <span className="font-semibold text-[#f4f4f5]">{item.senderName}</span>
                        <span className="text-[10px] text-[#71717a]">{item.timestamp}</span>
                        {item.senderRole === 'host' && (
                          <span className="bg-[#FFD600]/15 text-[#FFD600] text-[9px] px-1.5 py-0.5 border border-[#FFD600]/25 rounded-md flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5 fill-[#FFD600]" />
                            Host
                          </span>
                        )}
                      </div>

                      {/* Text bubble */}
                      {item.type === 'message' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="border border-white/[0.08] bg-white/[0.04] rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-[#f4f4f5] text-left cursor-pointer select-none active:scale-[0.99] transition-transform duration-100"
                        >
                          {item.content}
                        </div>
                      )}

                      {/* Code block */}
                      {item.type === 'code' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="w-full max-w-xl overflow-hidden border border-white/[0.1] rounded-2xl bg-black/60 text-left cursor-pointer active:scale-[0.99] transition-transform duration-100"
                        >
                          <div className="bg-white/[0.04] px-4 py-2.5 flex items-center justify-between text-xs border-b border-white/[0.06]">
                            <span className="font-mono text-[#FFD600] font-semibold">
                              {item.language === 'C++' ? 'cpp' : item.language === 'JavaScript' ? 'js' : item.language?.toLowerCase() || 'txt'}
                            </span>
                            <button 
                              onClick={() => handleCopyCode(item.code || '')}
                              className="flex items-center gap-1 text-[10px] text-[#71717a] hover:text-[#f4f4f5] transition-colors"
                            >
                              <span>Copy</span>
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex p-4 font-mono text-[11px] overflow-x-auto text-[#f4f4f5] leading-relaxed max-h-56">
                            <div className="select-none text-right pr-3 border-r border-white/5 text-[#52525b] mr-3 flex flex-col">
                              {(item.code || '').split('\n').map((_, index) => (
                                <span key={index}>{index + 1}</span>
                              ))}
                            </div>
                            <pre className="flex-1 text-[#f4f4f5]/90">
                              <code>{item.code}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* File upload card */}
                      {item.type === 'file' && (
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          className="border border-white/[0.08] bg-white/[0.03] rounded-2xl p-3 w-full max-w-sm flex items-center gap-4 text-left cursor-pointer active:scale-[0.99] transition-transform duration-100"
                        >
                          <div className="w-10 h-10 bg-[#EF4444]/15 border border-[#EF4444]/20 rounded-xl flex flex-col items-center justify-center text-[8.5px] font-bold text-[#EF4444] flex-shrink-0 select-none">
                            <FileText className="w-4 h-4 text-[#EF4444]" />
                            <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-sm font-semibold text-[#f4f4f5] truncate">{item.fileName}</span>
                            <span className="text-xs text-[#71717a] mt-0.5">{item.fileSize}</span>
                          </div>
                          <button 
                            onClick={() => handleDownload(item.fileName || '', item.fileUrl)}
                            className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 text-[#a1a1aa]"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Render Reactions badges */}
                      {renderReactions(itemId)}

                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Composer Frame */}
      <div className="p-4 border-t border-white/[0.08] bg-[#0f0f10] flex flex-col gap-3 flex-shrink-0">
        
        {/* Composer Sub-forms */}
        <form onSubmit={handleSend} className="flex flex-row gap-2.5 items-end w-full relative">
          
          {/* Type 1: Text message */}
          {composerMode === 'message' && (
            <div className="flex-1 relative flex items-center min-w-0" ref={attachmentRef}>
              <button
                type="button"
                onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                className="absolute left-3 p-1.5 text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.06] rounded-lg hover:scale-105 transition-all"
                title="Attach file or code snippet"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              {isAttachmentMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 bg-[#0f0f10] border border-white/[0.1] rounded-xl p-2 flex flex-col gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 min-w-[160px]">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerMode('code');
                      setIsAttachmentMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] rounded-lg text-xs transition-colors text-left text-[#f4f4f5]"
                  >
                    <Code className="w-3.5 h-3.5 text-[#FFD600]" />
                    <span>Code Snippet</span>
                  </button>
                  {activeRoom?.isFileSharingEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setComposerMode('file');
                        setIsAttachmentMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] rounded-lg text-xs transition-colors text-left text-[#f4f4f5]"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#FF6A00]" />
                      <span>File Upload</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsReactionMenuOpen(true);
                      setIsAttachmentMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] rounded-lg text-xs transition-colors text-left text-[#f4f4f5]"
                  >
                    <Smile className="w-3.5 h-3.5 text-[#FFD600]" />
                    <span>Send Reaction</span>
                  </button>
                </div>
              )}
              {isReactionMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 bg-[#0f0f10] border border-white/[0.1] rounded-full p-2 flex gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={(e) => e.stopPropagation()}>
                  {['👍', '❤️', '😂', '🎉', '😮', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendLiveReaction(emoji)}
                      className="text-lg hover:scale-130 transition-transform active:scale-90 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsReactionMenuOpen(false)}
                    className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-2 border-l border-white/10 ml-1 cursor-pointer font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder={
                  activeRoom?.isMuted && currentUser?.role !== 'host' 
                    ? 'Chat messaging is muted by host' 
                    : 'Type your message here...'
                }
                disabled={(activeRoom?.isMuted && currentUser?.role !== 'host') || isCooldownActive}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full h-11 border border-white/[0.08] rounded-xl bg-white/[0.03] pl-10 pr-4 text-xs sm:text-sm font-medium focus:outline-none text-[#f4f4f5] focus:border-[#FFD600]/40 placeholder-white/30"
              />
            </div>
          )}

          {/* Type 2: Code block */}
          {composerMode === 'code' && (
            <div className="flex-1 flex flex-col gap-2.5 border border-white/[0.08] rounded-xl p-3 bg-white/[0.02] min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold">Snippet Editor</span>
                  <button 
                    type="button"
                    onClick={() => setComposerMode('message')}
                    className="text-[#EF4444] hover:bg-white/[0.06] p-1 rounded-lg transition-colors"
                    title="Cancel and return to chat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-28 sm:w-32">
                  <Select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    options={[
                      { value: 'C++', label: 'C++' },
                      { value: 'JavaScript', label: 'JavaScript' },
                      { value: 'Python', label: 'Python' },
                      { value: 'Java', label: 'Java' },
                      { value: 'HTML/CSS', label: 'HTML/CSS' },
                      { value: 'Bash', label: 'Bash' }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <textarea
                placeholder="Paste or write your code snippet here..."
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                className="w-full h-24 border border-white/[0.08] bg-white/[0.03] rounded-lg p-2 font-mono text-xs text-[#f4f4f5] focus:outline-none focus:border-[#FFD600]/40"
              />
            </div>
          )}

          {/* Type 3: File Upload */}
          {composerMode === 'file' && (
            <div className="flex-1 flex flex-col gap-2 border border-white/[0.08] rounded-xl p-3 bg-white/[0.02] min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold">File Uploader</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedFileName('');
                      setSelectedFileSize('');
                      setSelectedFileType('');
                      setSelectedFileUrl('');
                      setSelectedFileCloudinaryId('');
                      setComposerMode('message');
                    }}
                    className="text-[#EF4444] hover:bg-white/[0.06] p-1 rounded-lg transition-colors"
                    title="Cancel and return to chat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {selectedFileName ? (
                <div className="flex items-center justify-between border border-white/[0.08] bg-white/[0.03] rounded-lg p-2.5 text-xs gap-4 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <File className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
                    <span className="truncate text-left font-semibold text-[#f4f4f5]">{selectedFileName}</span>
                    <span className="text-[#71717a] text-[10px] flex-shrink-0">({selectedFileSize})</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setSelectedFileName(''); setSelectedFileSize(''); setSelectedFileType(''); setSelectedFileUrl(''); }}
                    className="text-[#EF4444] hover:underline"
                  >
                    Clear
                  </button>
                </div>
              ) : isFileUploading ? (
                <div className="w-full py-2 bg-[#4F7CFF]/15 border border-[#4F7CFF]/20 rounded-lg text-xs font-semibold text-[#4F7CFF] flex items-center justify-center gap-2 select-none">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-[#4F7CFF] rounded-full animate-spin flex-shrink-0" />
                  <span>Uploading File...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.06] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Choose File from Computer</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button 
              type="submit" 
              disabled={isCooldownActive || isFileUploading || (composerMode === 'file' && !selectedFileName)}
              className="w-11 h-11 sm:w-auto sm:h-11 sm:gap-1.5 rounded-full sm:rounded-xl bg-[#FFD600] text-[#050608] hover:bg-[#FFC000] font-semibold text-xs uppercase flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed select-none p-0 sm:px-5"
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

        </form>
      </div>

      <AdInterstitial 
        isOpen={isAdOpen} 
        onComplete={() => {
          if (pendingDownload) proceedWithDownload(pendingDownload.fileName, pendingDownload.fileUrl);
        }} 
        onClose={() => {
          setIsAdOpen(false);
          setPendingDownload(null);
        }} 
        actionLabel="Starting Download" 
      />

      {showAutoCheckIn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-6 relative flex flex-col gap-4 text-left border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAutoCheckIn(false)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5] p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1 pr-6">
              <h3 className="text-base font-bold text-[#f4f4f5] flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#FFD600]" />
                Lab Attendance Session Active
              </h3>
              <p className="text-xs text-[#71717a]">
                Your instructor has started an attendance session. Please enter your details to register.
              </p>
            </div>

            <form onSubmit={handleAutoCheckInSubmit} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a1a1aa] tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={autoNameInput}
                  onChange={(e) => setAutoNameInput(e.target.value)}
                  required
                  disabled={isAutoSubmitting}
                  className="w-full bg-[#050608] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#FFD600]/40 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a1a1aa] tracking-wider">Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. CS2026-084"
                  value={autoRollInput}
                  onChange={(e) => setAutoRollInput(e.target.value)}
                  required
                  disabled={isAutoSubmitting}
                  className="w-full bg-[#050608] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#FFD600]/40 transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="yellow"
                disabled={isAutoSubmitting}
                className="w-full justify-center gap-1.5 font-bold text-xs py-2.5 mt-2"
              >
                {isAutoSubmitting ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Submit Check-in
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
