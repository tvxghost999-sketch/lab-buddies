'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Paperclip, Code, Send, File, Download, Copy, 
  Sparkles, Crown, Terminal, MessageSquare, MoreVertical,
  FileText, ShieldCheck, HelpCircle, Check, X,
  FileArchive, FileCode, FileImage, Lock, Users, Activity, Smile, Eye, Maximize2, ExternalLink,
  UploadCloud, Mic, MicOff
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import { getThumbnailUrl, getPreviewUrl, normalizeFileUrl } from '@/lib/cloudinary';
import { getBackendUrl } from '@/lib/adminAuth';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';
import BannerAd from '@/components/BannerAd';
import { useVoiceRoom, useVoiceListener } from '@/hooks/useVoiceRoom';

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

  // Calculate if room storage capacity is exceeded on client side
  const isStorageFull = useMemo(() => {
    const limit = activeRoom?.storageLimit || 25 * 1024 * 1024;
    let totalBytes = 0;
    feedItems.forEach((item) => {
      if (item.type === 'file') {
        if (item.fileSizeBytes) {
          totalBytes += item.fileSizeBytes;
        } else if (item.fileSize) {
          const match = item.fileSize.match(/([\d.]+)\s*(KB|MB|GB|Bytes|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit.startsWith('K')) totalBytes += val * 1024;
            else if (unit.startsWith('M')) totalBytes += val * 1024 * 1024;
            else if (unit.startsWith('G')) totalBytes += val * 1024 * 1024 * 1024;
            else totalBytes += val;
          }
        }
      }
    });
    return totalBytes >= limit;
  }, [feedItems, activeRoom]);

  // ── Voice: active mic control (this user) ──────────────────────────────────
  const {
    isConnected: isVoiceConnected,
    isConnecting: isVoiceConnecting,
    isMuted: isVoiceMuted,
    areMicsLocked,
    remoteStreams,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute: toggleVoiceMute,
  } = useVoiceRoom(pin, currentUser?.name || 'Anonymous');

  // ── Voice: passive listener (hears speakers even without joining) ───────────
  const { listenerStreams, isRoomMuted } = useVoiceListener(pin);

  // Composer mode: 'message' | 'code' | 'file'
  const [composerMode, setComposerMode] = useState<'message' | 'code' | 'file'>('message');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileCaption, setFileCaption] = useState('');
  const [isHdQuality, setIsHdQuality] = useState(true);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const attachmentRef = useRef<HTMLDivElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);

  // Create local image preview URLs when files change
  useEffect(() => {
    if (filesToUpload.length === 0) {
      setImagePreviewUrls({});
      return;
    }
    const urls: Record<string, string> = {};
    filesToUpload.forEach((file) => {
      if (file.type.startsWith('image/')) {
        urls[file.name] = URL.createObjectURL(file);
      }
    });
    setImagePreviewUrls(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filesToUpload]);

  // Leave voice on page unmount
  useEffect(() => {
    return () => {
      if (isVoiceConnected) leaveVoiceRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [pendingDownload, setPendingDownload] = useState<{ fileName: string; fileUrl?: string; fileId?: string } | null>(null);

  // Drag and drop file upload states
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // WhatsApp-style file downloading & preview states
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: string;
  } | null>(null);

  // Load downloaded files cache for this room
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`downloaded_files_${pin}`);
        if (stored) {
          setDownloadedIds(new Set(JSON.parse(stored)));
        }
      } catch (e) {
        console.error('Error loading downloaded files cache:', e);
      }
    }
  }, [pin]);

  const markFileDownloaded = (fileId: string) => {
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      next.add(fileId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`downloaded_files_${pin}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

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
  const BACKEND_URL = getBackendUrl();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isStorageFull) {
      addToast('Storage limit reached! Please watch an ad to expand the limit by 25MB before uploading more files.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const maxLimitBytes = 10 * 1024 * 1024; // 10MB
      const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);

      // Check if total size exceeds 10MB
      if (totalSize > maxLimitBytes) {
        addToast(`File selection rejected: Total batch size exceeds the 10 MB limit (${(totalSize / (1024 * 1024)).toFixed(2)} MB selected).`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setFilesToUpload(selectedFiles);
      setIsCodeEditorOpen(false);
    }
  };

  // Global Drag and drop event listeners
  useEffect(() => {
    let counter = 0;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      counter++;
      if (e.dataTransfer && e.dataTransfer.types) {
        const types = Array.from(e.dataTransfer.types);
        if (types.some(t => t.toLowerCase() === 'files' || t === 'Files')) {
          setIsDraggingOver(true);
        }
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsDraggingOver(true);
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      counter--;
      if (counter <= 0) {
        counter = 0;
        setIsDraggingOver(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      counter = 0;
      setIsDraggingOver(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (isStorageFull) {
          addToast('Storage limit reached! Please watch an ad to expand the limit by 25MB before uploading more files.', 'error');
          return;
        }

        const droppedFiles = Array.from(e.dataTransfer.files);
        const maxLimitBytes = 10 * 1024 * 1024; // 10MB
        const totalSize = droppedFiles.reduce((acc, file) => acc + file.size, 0);

        if (totalSize > maxLimitBytes) {
          addToast(`Drop rejected: Total batch size exceeds the 10 MB limit (${(totalSize / (1024 * 1024)).toFixed(2)} MB dropped).`, 'error');
          return;
        }

        setFilesToUpload(droppedFiles);
        setIsCodeEditorOpen(false);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCooldownActive) {
      addToast('Please wait a moment before sending another item.', 'warning');
      return;
    }

    if (((activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host')) {
      addToast('You are muted and cannot send messages.', 'error');
      return;
    }

    const sender = currentUser || { id: 'temp-user', name: 'Anonymous', role: 'member', joinedAt: '12:00 PM', isOnline: true, isMuted: false };

    // 1. If Code Editor is open, send code snippet
    if (isCodeEditorOpen) {
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
        content: textContent.trim() || undefined,
      });
      setCodeContent('');
      setTextContent('');
      setIsCodeEditorOpen(false);
      triggerCooldown();
      return;
    }

    // 2. If files are selected, upload and send them
    if (filesToUpload.length > 0) {
      if (isFileUploading) return;
      if (isStorageFull) {
        addToast('Cannot upload files: Room storage limit has been reached. Please watch an ad to expand storage.', 'error');
        return;
      }
      
      const maxLimitBytes = 10 * 1024 * 1024; // 10MB
      const totalSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > maxLimitBytes) {
        addToast(`File selection rejected: Total batch size exceeds the 10 MB limit (${(totalSize / (1024 * 1024)).toFixed(2)} MB selected).`, 'error');
        return;
      }

      setIsFileUploading(true);
      let successCount = 0;

      // Upload files sequentially
      for (const file of filesToUpload) {
        addToast(`Uploading ${file.name}...`, 'info');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pin', pin);
        formData.append('hd', isHdQuality ? 'true' : 'false');

        try {
          const res = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          
          if (res.ok) {
            const data = await res.json();
            
            addFeedItem({
              type: 'file',
              senderId: sender.id,
              senderName: sender.name,
              senderRole: sender.role,
              fileName: data.fileName || data.originalName || file.name,
              fileSize: data.fileSize,
              fileType: data.fileType,
              fileUrl: data.fileUrl,
              cloudinaryPublicId: data.cloudinaryPublicId || '',
              fileSizeBytes: data.fileSizeBytes,
              content: textContent.trim() || undefined,
            });
            successCount++;
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
              addToast(errData.error || `Upload failed for ${file.name}.`, 'error');
            }
          }
        } catch (err) {
          console.error(err);
          addToast(`Upload failed for ${file.name} due to network error.`, 'error');
        }
      }

      // Reset states
      setFilesToUpload([]);
      setTextContent('');
      if (successCount > 0) {
        addToast(`Shared ${successCount} file(s) successfully!`, 'success');
      }
      setIsFileUploading(false);
      return;
    }

    // 3. Otherwise, send text message
    if (textContent.trim()) {
      addFeedItem({
        type: 'message',
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        content: textContent,
      });
      setTextContent('');
      triggerCooldown();
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

  const lastDownloadTimesRef = useRef<Record<string, number>>({});

  const handleFileClick = (fileItem: { id: string; fileName: string; fileUrl?: string; fileType?: string; fileSize?: string }) => {
    if (!fileItem.fileUrl) {
      addToast('File link is missing.', 'error');
      return;
    }

    const isDownloaded = downloadedIds.has(fileItem.id);

    if (isDownloaded) {
      // Open in-app WhatsApp preview modal directly!
      setPreviewFile({
        fileName: fileItem.fileName,
        fileUrl: fileItem.fileUrl,
        fileType: fileItem.fileType,
        fileSize: fileItem.fileSize,
      });
      return;
    }

    // 10-second download throttle anti-spam protection
    const now = Date.now();
    const lastTime = lastDownloadTimesRef.current[fileItem.id] || 0;
    if (now - lastTime < 10000) {
      addToast('Please wait before downloading again', 'warning');
      return;
    }
    lastDownloadTimesRef.current[fileItem.id] = now;

    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';

    // Track free download count: Ad triggers on every 4th download (3 free downloads allowed)
    const countStr = typeof window !== 'undefined' ? (localStorage.getItem('lab_buddies_downloads_count') || '0') : '0';
    const count = parseInt(countStr, 10);
    const nextCount = count + 1;

    if (!isPremium && nextCount > 0 && nextCount % 4 === 0) {
      // 4th download attempt: Require ad completion before incrementing and downloading
      setPendingDownload({ fileName: fileItem.fileName, fileUrl: fileItem.fileUrl, fileId: fileItem.id });
      setIsAdOpen(true);
    } else {
      // Free download (1st, 2nd, 3rd) or Premium: Increment immediately and proceed
      if (typeof window !== 'undefined') {
        localStorage.setItem('lab_buddies_downloads_count', nextCount.toString());
      }
      executeFileDownload(fileItem.id, fileItem.fileName, fileItem.fileUrl);
    }
  };

  const executeFileDownload = (fileId: string, fileName: string, fileUrl: string) => {
    setDownloadingIds((prev) => ({ ...prev, [fileId]: true }));
    setIsAdOpen(false);
    setPendingDownload(null);
    addToast(`Downloading ${fileName}...`, 'info');

    // Track download analytics
    socketService.trackDownload(pin, fileId, currentUser?.id || currentUser?.name || 'anonymous');

    let targetUrl = normalizeFileUrl(fileUrl);
    if (!targetUrl || targetUrl.startsWith('/uploads/')) {
      targetUrl = `${BACKEND_URL}${targetUrl ? targetUrl : `/uploads/${fileName}`}`;
    }

    // Simulate WhatsApp smooth download progress and download to disk
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadingIds((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });

      markFileDownloaded(fileId);
      addToast(`${fileName} downloaded successfully!`, 'success');
    }, 1200);
  };

  const handleDirectDownload = (fileName: string, fileUrl: string) => {
    let targetUrl = normalizeFileUrl(fileUrl);
    if (!targetUrl || targetUrl.startsWith('/uploads/')) {
      targetUrl = `${BACKEND_URL}${targetUrl ? targetUrl : `/uploads/${fileName}`}`;
    }
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Saving ${fileName}...`, 'success');
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
    <div className="relative flex flex-col h-full w-full md:h-[calc(100vh-6rem)] border-0 md:border border-white/[0.08] bg-[#0f0f10] md:rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Global Drag and Drop File Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-[9999] bg-[#050608]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-150 pointer-events-none">
          {isStorageFull ? (
            <div className="w-full max-w-lg p-10 border-3 border-dashed border-[#EF4444] rounded-3xl bg-[#EF4444]/10 flex flex-col items-center justify-center text-center gap-5 shadow-[0_0_80px_rgba(239,68,68,0.35)] scale-105 transition-transform duration-200">
              <div className="w-24 h-24 rounded-3xl bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-bounce">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-2xl font-black text-[#f4f4f5] tracking-tight">Storage Limit Reached</h3>
                <p className="text-sm text-[#a1a1aa] max-w-sm leading-relaxed">
                  You cannot upload files because this room's storage capacity is full.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-[#EF4444] tracking-wider bg-[#EF4444]/15 px-5 py-2 rounded-full border border-[#EF4444]/30 shadow-sm">
                Watch an ad to unlock +25 MB
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg p-10 border-3 border-dashed border-[#FFD600] rounded-3xl bg-[#FFD600]/10 flex flex-col items-center justify-center text-center gap-5 shadow-[0_0_80px_rgba(255,214,0,0.35)] scale-105 transition-transform duration-200">
              <div className="w-24 h-24 rounded-3xl bg-[#FFD600]/20 border border-[#FFD600]/40 flex items-center justify-center text-[#FFD600] shadow-[0_0_40px_rgba(255,214,0,0.4)] animate-bounce">
                <UploadCloud className="w-12 h-12" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-2xl font-black text-[#f4f4f5] tracking-tight">Drop Your File Here</h3>
                <p className="text-sm text-[#a1a1aa] max-w-sm leading-relaxed">
                  Release to upload your file directly to the chat composer.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase font-bold text-[#FFD600] tracking-wider bg-[#FFD600]/15 px-5 py-2 rounded-full border border-[#FFD600]/30 shadow-sm">
                All file formats supported
              </div>
            </div>
          )}
        </div>
      )}
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
          <div className="hidden sm:flex items-center gap-1 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex sm:hidden items-center gap-1 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
            <ShieldCheck className="w-2.5 h-2.5 text-[#22C55E]" />
            <span>E2EE</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[10px] text-[#71717a] font-medium">
              {onlineCount} Online
            </span>
          </div>
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
                        <div className="flex flex-col gap-1.5 max-w-sm w-full text-left">
                          {item.content && (
                            <div className="text-xs sm:text-sm text-[#f4f4f5] select-text break-words mb-1 pr-2">
                              {item.content}
                            </div>
                          )}
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          onClick={() => handleFileClick({ id: itemId, fileName: item.fileName || 'File', fileUrl: item.fileUrl, fileType: item.fileType, fileSize: item.fileSize })}
                          className="border border-white/[0.08] rounded-2xl bg-[#22C55E]/10 hover:bg-[#22C55E]/15 p-3 w-full max-w-sm flex items-center gap-3.5 text-left cursor-pointer active:scale-[0.99] transition-all duration-150 group select-none shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                        >
                          {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((item.fileType || '').toLowerCase()) && item.fileUrl ? (
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex-shrink-0 flex items-center justify-center">
                              <img 
                                src={getThumbnailUrl(item.fileUrl)} 
                                alt={item.fileName || 'Image'}
                                loading="lazy"
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-[#EF4444]/15 border border-[#EF4444]/20 rounded-xl flex flex-col items-center justify-center text-[8.5px] font-bold text-[#EF4444] flex-shrink-0 select-none">
                              <FileText className="w-4 h-4 text-[#EF4444]" />
                              <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-sm font-semibold text-[#f4f4f5] truncate">{item.fileName}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a] mt-0.5">
                              <span>{item.fileSize}</span>
                              {item.totalDownloads !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#a1a1aa]">{item.totalDownloads} {item.totalDownloads === 1 ? 'dl' : 'dls'}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* WhatsApp Download / Preview Action Button */}
                          <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 group-hover:bg-[#FFD600]/20 group-hover:border-[#FFD600]/40 flex items-center justify-center flex-shrink-0 transition-all text-[#a1a1aa] group-hover:text-[#FFD600]">
                            {downloadingIds[itemId] ? (
                              <div className="w-4 h-4 border-2 border-white/20 border-t-[#FFD600] rounded-full animate-spin" />
                            ) : downloadedIds.has(itemId) ? (
                              <Eye className="w-4 h-4 text-[#22C55E]" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </div>
                        </div>
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
                        <div className="flex flex-col gap-1.5 max-w-sm w-full text-left">
                          {item.content && (
                            <div className="text-xs sm:text-sm text-[#f4f4f5] select-text break-words mb-1 pl-2">
                              {item.content}
                            </div>
                          )}
                        <div 
                          onMouseDown={() => startLongPress(itemId)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => startLongPress(itemId)}
                          onTouchEnd={endLongPress}
                          onClick={() => handleFileClick({ id: itemId, fileName: item.fileName || 'File', fileUrl: item.fileUrl, fileType: item.fileType, fileSize: item.fileSize })}
                          className="border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3 w-full max-w-sm flex items-center gap-3.5 text-left cursor-pointer active:scale-[0.99] transition-all duration-150 group select-none shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                        >
                          {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((item.fileType || '').toLowerCase()) && item.fileUrl ? (
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex-shrink-0 flex items-center justify-center">
                              <img 
                                src={getThumbnailUrl(item.fileUrl)} 
                                alt={item.fileName || 'Image'}
                                loading="lazy"
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-[#EF4444]/15 border border-[#EF4444]/20 rounded-xl flex flex-col items-center justify-center text-[8.5px] font-bold text-[#EF4444] flex-shrink-0 select-none">
                              <FileText className="w-4 h-4 text-[#EF4444]" />
                              <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-sm font-semibold text-[#f4f4f5] truncate">{item.fileName}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a] mt-0.5">
                              <span>{item.fileSize}</span>
                              {item.totalDownloads !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#a1a1aa]">{item.totalDownloads} {item.totalDownloads === 1 ? 'dl' : 'dls'}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* WhatsApp Download / Preview Action Button */}
                          <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 group-hover:bg-[#FFD600]/20 group-hover:border-[#FFD600]/40 flex items-center justify-center flex-shrink-0 transition-all text-[#a1a1aa] group-hover:text-[#FFD600]">
                            {downloadingIds[itemId] ? (
                              <div className="w-4 h-4 border-2 border-white/20 border-t-[#FFD600] rounded-full animate-spin" />
                            ) : downloadedIds.has(itemId) ? (
                              <Eye className="w-4 h-4 text-[#22C55E]" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </div>
                        </div>
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
        
        {/* Code Snippet Editor (Above Input) */}
        {isCodeEditorOpen && (
          <div className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold">Snippet Editor</span>
              <div className="w-28 sm:w-32 flex items-center gap-2">
                <Select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  options={[
                    { value: 'C++', label: 'C++' },
                    { value: 'JavaScript', label: 'JavaScript' },
                    { value: 'Python', label: 'Python' },
                    { value: 'Java', label: 'Java' },
                    { value: 'HTML/CSS', label: 'HTML/CSS' },
                    { value: 'Text', label: 'Plain Text' }
                  ]}
                />
                <button 
                  type="button"
                  onClick={() => setIsCodeEditorOpen(false)}
                  className="text-[#EF4444] hover:bg-white/[0.06] p-1 rounded-lg transition-colors"
                  title="Close editor"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
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

        {/* File Preview Card (Above Input) */}
        {filesToUpload.length > 0 && (
          <div className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold">
                Files Selected ({filesToUpload.length})
              </span>
              {!isFileUploading && (
                <button 
                  type="button"
                  onClick={() => setFilesToUpload([])}
                  className="text-[#EF4444] hover:bg-white/[0.06] p-1.5 rounded-lg transition-colors"
                  title="Remove all files"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isFileUploading ? (
              <div className="w-full py-3 bg-[#4F7CFF]/15 border border-[#4F7CFF]/20 rounded-lg text-xs font-semibold text-[#4F7CFF] flex items-center justify-center gap-2 select-none">
                <div className="w-4 h-4 border-2 border-white/20 border-t-[#4F7CFF] rounded-full animate-spin flex-shrink-0" />
                <span>Uploading & Compressing {filesToUpload.length} File(s)...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {filesToUpload.map((file, idx) => {
                  const hasPreview = file.type.startsWith('image/') && imagePreviewUrls[file.name];
                  return (
                    <div key={file.name + '-' + idx} className="flex items-center justify-between border border-white/[0.08] bg-white/[0.03] rounded-lg p-2 text-xs gap-4 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {hasPreview ? (
                          <div className="w-8 h-8 rounded overflow-hidden border border-white/10 flex-shrink-0">
                            <img src={imagePreviewUrls[file.name]} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <File className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
                        )}
                        <span className="truncate text-left font-semibold text-[#f4f4f5]">{file.name}</span>
                        <span className="text-[#71717a] text-[10px] flex-shrink-0">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFilesToUpload((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[#EF4444] hover:underline text-[11px] px-1.5"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show total size progress or summary */}
            <div className="flex justify-between items-center text-[10px] text-[#71717a] uppercase mt-1">
              <span>Total Batch Size</span>
              <span className={filesToUpload.reduce((acc, f) => acc + f.size, 0) > 10 * 1024 * 1024 ? 'text-red-400 font-bold' : 'text-[#f4f4f5]'}>
                {(filesToUpload.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} / 10.00 MB
              </span>
            </div>

            {/* HD Quality Checkbox */}
            {!isFileUploading && (
              <label className="flex items-center gap-2 cursor-pointer select-none border-t border-white/[0.04] pt-2.5">
                <input
                  type="checkbox"
                  checked={isHdQuality}
                  onChange={(e) => setIsHdQuality(e.target.checked)}
                  className="rounded border-white/20 bg-white/[0.03] text-[#FFD600] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span className="text-xs text-[#a1a1aa] font-medium">Send in HD Quality (no compression)</span>
              </label>
            )}
          </div>
        )}

        {/* Composer Form with Always-Visible text input */}
        <form onSubmit={handleSend} className="flex flex-row gap-2.5 items-end w-full relative">
          
          <div className="flex-1 relative flex items-center min-w-0" ref={attachmentRef}>
            
            {/* Paperclip Button on the Left */}
            {activeRoom?.isFileSharingEnabled && (
              <button
                type="button"
                disabled={isStorageFull || ((activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host') || isFileUploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 p-1.5 text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.06] rounded-lg hover:scale-105 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title={isStorageFull ? "Storage limit reached. Expand storage to upload files." : "Choose file from computer"}
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}

            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
              onChange={handleFileChange} 
            />

            {/* Reaction Emojis Popover (renders above the input box) */}
            {isReactionMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 bg-[#0f0f10] border border-white/[0.1] rounded-full p-2 flex gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={(e) => e.stopPropagation()}>
                {['👍', '❤️', '😂', '🎉', '😮', '👏'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleSendLiveReaction(emoji);
                      setIsReactionMenuOpen(false);
                    }}
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

            {/* Text Input field */}
            <input
              type="text"
              placeholder={
                (activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host' 
                  ? 'You are muted and cannot message' 
                  : filesToUpload.length > 0 
                    ? 'Add a caption to the files...' 
                    : isCodeEditorOpen 
                      ? 'Add an explanation to the code snippet...' 
                      : 'Type your message here...'
              }
              disabled={((activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host') || isFileUploading}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className={`w-full h-11 border border-white/[0.08] rounded-xl bg-white/[0.03] pr-20 text-xs sm:text-sm font-medium focus:outline-none text-[#f4f4f5] focus:border-[#FFD600]/40 placeholder-white/30 ${
                activeRoom?.isFileSharingEnabled ? 'pl-10' : 'pl-4'
              }`}
            />

            {/* Code and Reaction buttons inside the text input box on the right */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Code Snippet Button */}
              <button
                type="button"
                disabled={(activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host'}
                onClick={() => {
                  setIsCodeEditorOpen(!isCodeEditorOpen);
                  setFilesToUpload([]);
                }}
                className={`p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                  isCodeEditorOpen ? 'text-[#FFD600] bg-white/[0.06]' : 'text-[#a1a1aa] hover:text-[#FFD600] hover:bg-white/[0.06]'
                }`}
                title="Share Code Snippet"
              >
                <Code className="w-4 h-4" />
              </button>
              
              {/* Smile Reaction Button */}
              <button
                type="button"
                onClick={() => setIsReactionMenuOpen(!isReactionMenuOpen)}
                className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                  isReactionMenuOpen ? 'text-[#FFD600] bg-white/[0.06]' : 'text-[#a1a1aa] hover:text-[#FFD600] hover:bg-white/[0.06]'
                }`}
                title="Send Live Reaction"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Send Button + Mic Button */}
          <div className="flex gap-2 flex-shrink-0">

            {/* Mic / Voice toggle button */}
            <button
              type="button"
              onClick={() => {
                if (isVoiceConnected) {
                  toggleVoiceMute();
                } else {
                  joinVoiceRoom();
                }
              }}
              disabled={isVoiceConnecting || (areMicsLocked && isVoiceMuted)}
              title={
                isVoiceConnecting   ? 'Connecting...' :
                areMicsLocked       ? 'Mics locked by host' :
                isVoiceConnected && isVoiceMuted ? 'Unmute mic' :
                isVoiceConnected    ? 'Mute mic' :
                'Join voice'
              }
              className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-[0.97] select-none flex-shrink-0 ${
                isVoiceConnecting
                  ? 'bg-white/[0.06] border border-white/[0.08] text-[#71717a] cursor-wait'
                  : areMicsLocked
                    ? 'bg-[#FFD600]/10 border border-[#FFD600]/30 text-[#FFD600] cursor-not-allowed opacity-70'
                    : isVoiceConnected && isVoiceMuted
                      ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/25'
                      : isVoiceConnected
                        ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/25 animate-pulse'
                        : 'bg-white/[0.04] border border-white/[0.08] text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/[0.08]'
              }`}
            >
              {isVoiceConnecting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : areMicsLocked ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <Lock className="w-2.5 h-2.5 absolute bottom-1 right-1 text-[#FFD600]" />
                </>
              ) : isVoiceConnected && isVoiceMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send button */}
            <button 
              type="submit" 
              disabled={isCooldownActive || isFileUploading || (isCodeEditorOpen && !codeContent.trim()) || ((activeRoom?.isMuted || currentUser?.isMuted) && currentUser?.role !== 'host')}
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
          if (typeof window !== 'undefined') {
            const countStr = localStorage.getItem('lab_buddies_downloads_count') || '0';
            const count = parseInt(countStr, 10);
            localStorage.setItem('lab_buddies_downloads_count', (count + 1).toString());
          }
          if (pendingDownload && pendingDownload.fileUrl) {
            executeFileDownload(pendingDownload.fileId || `file-${Date.now()}`, pendingDownload.fileName, pendingDownload.fileUrl);
          }
        }} 
        onClose={() => {
          setIsAdOpen(false);
          setPendingDownload(null);
          addToast('Ad was cancelled. Download aborted.', 'warning');
        }} 
        actionLabel="Starting Download" 
      />

      {/* WhatsApp In-App File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0f0f10] border border-white/[0.08] rounded-2xl flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/20 flex items-center justify-center text-[#FFD600] flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-sm font-semibold text-[#f4f4f5] truncate">{previewFile.fileName}</span>
                  <span className="text-[10px] text-[#71717a]">
                    {previewFile.fileSize || 'Preview Available'} • {previewFile.fileType?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDirectDownload(previewFile.fileName, previewFile.fileUrl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#f4f4f5] hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] text-xs font-semibold transition-all cursor-pointer"
                  title="Save to device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#71717a] hover:text-[#f4f4f5] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#050608]/50 min-h-[300px]">
              {(() => {
                const ext = (previewFile.fileType || previewFile.fileName.split('.').pop() || '').toLowerCase();
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'image'].some(e => ext.includes(e));
                const isPdf = ext === 'pdf';
                const isVideo = ['mp4', 'webm', 'ogg'].some(e => ext.includes(e));
                const isAudio = ['mp3', 'wav', 'aac'].some(e => ext.includes(e));

                if (isImage) {
                  return (
                    <div className="relative max-h-[70vh] flex items-center justify-center">
                      <img 
                        src={getPreviewUrl(previewFile.fileUrl)} 
                        alt={previewFile.fileName}
                        loading="lazy"
                        className="max-h-[68vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-white/[0.06]"
                      />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe 
                      src={previewFile.fileUrl} 
                      className="w-full h-[68vh] rounded-xl border border-white/[0.08] bg-white"
                      title="PDF Preview"
                    />
                  );
                }

                if (isVideo) {
                  return (
                    <video 
                      controls 
                      src={previewFile.fileUrl} 
                      className="max-h-[68vh] w-auto max-w-full rounded-xl shadow-2xl"
                    />
                  );
                }

                if (isAudio) {
                  return (
                    <div className="flex flex-col items-center gap-4 p-8 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                      <FileText className="w-12 h-12 text-[#FFD600]" />
                      <span className="text-sm font-semibold text-[#f4f4f5]">{previewFile.fileName}</span>
                      <audio controls src={previewFile.fileUrl} className="w-72" />
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center text-center gap-4 p-8 max-w-md bg-white/[0.02] border border-white/[0.08] rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD600]/10 border border-[#FFD600]/25 flex items-center justify-center text-[#FFD600]">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-base font-bold text-[#f4f4f5]">{previewFile.fileName}</h4>
                      <p className="text-xs text-[#71717a]">
                        This file format ({previewFile.fileType || 'binary'}) does not support direct browser rendering.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDirectDownload(previewFile.fileName, previewFile.fileUrl)}
                      className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-xs hover:bg-[#FFD600]/90 transition-all shadow-[0_0_20px_rgba(255,214,0,0.2)] cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download / Open on Device</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
      {/* ── Hidden audio elements: active voice peers ── */}
      {isVoiceConnected && Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
        <audio
          key={`voice-active-${socketId}`}
          ref={(el) => { if (el) { el.srcObject = stream; el.play().catch(() => {}); } }}
          autoPlay
          playsInline
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />
      ))}

      {/* ── Hidden audio elements: passive listener (hears without joining) ── */}
      {!isVoiceConnected && Array.from(listenerStreams.entries()).map(([socketId, stream]) => (
        <audio
          key={`voice-listener-${socketId}`}
          ref={(el) => { if (el) { el.srcObject = stream; el.muted = isRoomMuted; el.play().catch(() => {}); } }}
          autoPlay
          playsInline
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />
      ))}
    </div>
  );
}
