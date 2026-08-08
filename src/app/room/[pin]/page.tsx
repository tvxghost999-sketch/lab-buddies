'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Paperclip, Code, Send, File, Download, Copy, 
  Sparkles, Crown, Terminal, MessageSquare, MoreVertical,
  FileText, ShieldCheck, HelpCircle, Check, X,
  FileArchive, FileCode, FileImage, Lock, Users, Activity
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

  // Click outside handler for attachment menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
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

  const loggedInUser = useRoomStore((state) => state.loggedInUser);


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

  // Handle composer submissions
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
    } else if (composerMode === 'file') {
      if (!selectedFileName) {
        addToast('Please select a file to upload.', 'warning');
        return;
      }
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

    // Trigger 1.5s visual cooldown
    setIsCooldownActive(true);
    setTimeout(() => setIsCooldownActive(false), 1500);
  };


  // Copy code utility
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code snippet copied to clipboard!', 'success');
  };

  // Real download utility
  const handleDownload = (fileName: string, fileUrl?: string) => {
    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    
    if (isPremium) {
      proceedWithDownload(fileName, fileUrl);
      return;
    }

    const countStr = localStorage.getItem('lab_buddies_downloads_count') || '0';
    const count = parseInt(countStr, 10);
    const nextCount = count + 1;
    localStorage.setItem('lab_buddies_downloads_count', nextCount.toString());

    if (nextCount > 0 && nextCount % 4 === 0) {
      setPendingDownload({ fileName, fileUrl });
      setIsAdOpen(true);
    } else {
      proceedWithDownload(fileName, fileUrl);
    }
  };

  const proceedWithDownload = (fileName: string, fileUrl?: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      addToast(`Downloading ${fileName}...`, 'success');
    } else {
      window.open(`${BACKEND_URL}/uploads/${fileName}`, '_blank');
      addToast(`Downloading ${fileName}...`, 'success');
    }
    setIsAdOpen(false);
    setPendingDownload(null);
  };


  // Helper to render file icon inside Feed Items
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') {
      return (
        <div className="w-12 h-14 bg-neo-red border-[3px] border-neo-dark rounded-[8px] flex flex-col items-center justify-center font-archivo text-[10px] font-black text-white relative shadow-neo-sm">
          PDF
        </div>
      );
    }
    if (type === 'zip' || type === 'rar') {
      return (
        <div className="w-12 h-14 bg-neo-purple border-[3px] border-neo-dark rounded-[8px] flex flex-col items-center justify-center font-archivo text-[10px] font-black text-white relative shadow-neo-sm">
          ZIP
        </div>
      );
    }
    if (type === 'png' || type === 'jpg' || type === 'jpeg') {
      return (
        <div className="w-12 h-14 bg-neo-green border-[3px] border-neo-dark rounded-[8px] flex flex-col items-center justify-center font-archivo text-[10px] font-black text-neo-dark relative shadow-neo-sm">
          IMG
        </div>
      );
    }
    return (
      <div className="w-12 h-14 bg-neo-blue border-[3px] border-neo-dark rounded-[8px] flex flex-col items-center justify-center font-archivo text-[10px] font-black text-white relative shadow-neo-sm">
        FILE
      </div>
    );
  };

  if (!isMounted) {
    return (
      <div className="w-full flex items-center justify-center p-20 min-h-[400px] select-none bg-cream border-[3px] border-neo-dark rounded-[12px] shadow-neo-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3.5px] border-neo-dark border-t-neo-yellow rounded-full animate-spin" />
          <span className="text-xs font-black uppercase text-neo-dark tracking-wide">Syncing Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100dvh-4rem)] min-h-[450px] -m-4 sm:-m-6 bg-white overflow-hidden">

        {/* Messages Scroll Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6" ref={chatFeedRef}>
          {feedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 select-none">
              <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-cream flex items-center justify-center shadow-neo-sm">
                💬
              </div>
              <h3 className="font-archivo text-sm uppercase text-neo-dark">No activities yet</h3>
              <p className="text-xs font-bold text-neo-dark/60 max-w-xs">
                This room's feed is empty. Type a message or upload a file in the composer below to begin.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Date Indicator separator */}
              <div className="flex justify-center select-none mb-1">
                <span className="bg-[#F5EFE6] text-neo-dark/70 text-[10px] font-black px-3.5 py-1 rounded-full border border-neo-dark/10">
                  Today
                </span>
              </div>

              {feedItems.map((item) => {
                const isSelf = item.senderName === currentUser?.name;
                
                if (isSelf) {
                  // Message sent by current user (YOU) -> Right aligned
                  return (
                    <div key={item._id || item.id} className="flex gap-3 items-start max-w-[85%] sm:max-w-[70%] self-end flex-row-reverse">
                      {/* Avatar YOU */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-[#E6FFE6] flex items-center justify-center font-archivo text-[10px] font-black text-neo-dark shadow-sm">
                          YOU
                        </div>
                      </div>

                      {/* Content Column */}
                      <div className="flex flex-col gap-1.5 items-end flex-1 min-w-0 w-full">
                        {/* Text bubble */}
                        {item.type === 'message' && (
                          <div className="border-[2.5px] border-neo-dark bg-[#D8F3DC] rounded-[12px] px-3.5 py-2 text-xs font-bold text-neo-dark shadow-sm flex flex-wrap items-end gap-3 justify-between text-left max-w-full">
                            <span>{item.content}</span>
                            <div className="flex items-center gap-1 text-[9.5px] text-neo-dark/55 font-bold ml-auto select-none mt-0.5">
                              <span>{item.timestamp}</span>
                              <span className="text-[#3b82f6] font-black">✔✔</span>
                            </div>
                          </div>
                        )}

                        {/* Code block */}
                        {item.type === 'code' && (
                          <Card variant="white" className="w-full max-w-xl overflow-hidden border-[2.5px] border-neo-dark rounded-[12px] bg-neo-dark text-left">
                            {/* Code Header bar */}
                            <div className="bg-[#1e1e1e] text-white px-4 py-2 flex items-center justify-between text-xs border-b-[2px] border-neo-dark">
                              <span className="font-mono text-neo-blue font-black">{item.language === 'C++' ? 'cpp' : item.language === 'JavaScript' ? 'js' : item.language?.toLowerCase() || 'txt'}</span>
                              <button 
                                onClick={() => handleCopyCode(item.code || '')}
                                className="flex items-center gap-1 font-black text-[10px] hover:text-neo-yellow transition-colors"
                              >
                                <span>Copy</span>
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Code Block Container with line numbers */}
                            <div className="flex bg-[#1e1e1e] p-4 font-mono text-[11px] overflow-x-auto text-white leading-relaxed max-h-56">
                              <div className="select-none text-right pr-3 border-r border-white/10 text-white/40 font-bold mr-3 flex flex-col">
                                {(item.code || '').split('\n').map((_, index) => (
                                  <span key={index}>{index + 1}</span>
                                ))}
                              </div>
                              <pre className="flex-1 font-semibold text-white/95">
                                <code>{item.code}</code>
                              </pre>
                            </div>
                          </Card>
                        )}

                        {/* File Upload card */}
                        {item.type === 'file' && (
                          <div className="border-[2.5px] border-neo-dark rounded-[12px] bg-[#D8F3DC] p-3 w-full max-w-sm flex items-center gap-4 shadow-sm text-left">
                            {/* PDF/Generic red document thumbnail icon */}
                            <div className="w-10 h-10 bg-neo-red border-[2px] border-neo-dark rounded-md flex flex-col items-center justify-center font-archivo text-[8.5px] font-black text-white flex-shrink-0 select-none">
                              <FileText className="w-4 h-4 text-white" />
                              <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                            </div>
                            {/* File Name & details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <span className="text-xs font-black text-neo-dark truncate">{item.fileName}</span>
                              <span className="text-[10px] font-bold text-neo-dark/50 mt-0.5">{item.fileSize}</span>
                            </div>
                            {/* Circular Action Button */}
                            <button 
                              onClick={() => handleDownload(item.fileName || '', item.fileUrl)}
                              className="w-8 h-8 rounded-full border-[2px] border-neo-dark bg-white hover:bg-neo-yellow flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm"
                            >
                              <Download className="w-4 h-4 text-neo-dark" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Message sent by another user -> Left aligned
                  return (
                    <div key={item._id || item.id} className="flex gap-3 items-start max-w-[85%] sm:max-w-[70%] self-start">
                      {/* Avatar Column */}
                      <div className="relative flex-shrink-0">
                        <div 
                          className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark flex items-center justify-center font-archivo text-xs font-black uppercase text-neo-dark"
                          style={{ 
                            backgroundColor: item.senderRole === 'host' ? '#FFD600' : '#FFD600' // Matches RS/AK colored avatars
                          }}
                        >
                          {item.senderName[0]}
                        </div>
                        {/* Active online status badge */}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-neo-green border-[2px] border-neo-dark" />
                      </div>

                      {/* Content Column */}
                      <div className="flex flex-col gap-1.5 items-start flex-1 min-w-0 w-full">
                        {/* Sender details */}
                        <div className="flex items-center gap-2 text-xs select-none">
                          <span className="font-black text-neo-dark text-[12px]">{item.senderName}</span>
                          <span className="text-[10px] text-neo-dark/45 font-bold">{item.timestamp}</span>
                          {item.senderRole === 'host' && (
                            <span className="bg-neo-yellow text-neo-dark text-[8.5px] font-black px-1.5 border-[1.2px] border-neo-dark rounded uppercase tracking-wide flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 fill-neo-dark" />
                              Host
                            </span>
                          )}
                        </div>

                        {/* Text bubble */}
                        {item.type === 'message' && (
                          <div className="border-[2.5px] border-neo-dark bg-white rounded-[12px] px-3.5 py-2 text-xs font-bold text-neo-dark shadow-sm text-left">
                            {item.content}
                          </div>
                        )}

                        {/* Code block */}
                        {item.type === 'code' && (
                          <Card variant="white" className="w-full max-w-xl overflow-hidden border-[2.5px] border-neo-dark rounded-[12px] bg-neo-dark text-left">
                            {/* Code Header bar */}
                            <div className="bg-[#1e1e1e] text-white px-4 py-2 flex items-center justify-between text-xs border-b-[2px] border-neo-dark">
                              <span className="font-mono text-neo-blue font-black">{item.language === 'C++' ? 'cpp' : item.language === 'JavaScript' ? 'js' : item.language?.toLowerCase() || 'txt'}</span>
                              <button 
                                onClick={() => handleCopyCode(item.code || '')}
                                className="flex items-center gap-1 font-black text-[10px] hover:text-neo-yellow transition-colors"
                              >
                                <span>Copy</span>
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Code Block Container with line numbers */}
                            <div className="flex bg-[#1e1e1e] p-4 font-mono text-[11px] overflow-x-auto text-white leading-relaxed max-h-56">
                              <div className="select-none text-right pr-3 border-r border-white/10 text-white/40 font-bold mr-3 flex flex-col">
                                {(item.code || '').split('\n').map((_, index) => (
                                  <span key={index}>{index + 1}</span>
                                ))}
                              </div>
                              <pre className="flex-1 font-semibold text-white/95">
                                <code>{item.code}</code>
                              </pre>
                            </div>
                          </Card>
                        )}

                        {/* File upload card */}
                        {item.type === 'file' && (
                          <div className="border-[2.5px] border-neo-dark rounded-[12px] bg-white p-3 w-full max-w-sm flex items-center gap-4 shadow-sm text-left">
                            {/* PDF/Generic red document thumbnail icon */}
                            <div className="w-10 h-10 bg-neo-red border-[2px] border-neo-dark rounded-md flex flex-col items-center justify-center font-archivo text-[8.5px] font-black text-white flex-shrink-0 select-none">
                              <FileText className="w-4 h-4 text-white" />
                              <span>{item.fileType?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                            </div>
                            {/* File Name & details */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <span className="text-xs font-black text-neo-dark truncate">{item.fileName}</span>
                              <span className="text-[10px] font-bold text-neo-dark/50 mt-0.5">{item.fileSize}</span>
                            </div>
                            {/* Circular Action Button */}
                            <button 
                              onClick={() => handleDownload(item.fileName || '', item.fileUrl)}
                              className="w-8 h-8 rounded-full border-[2px] border-neo-dark bg-cream hover:bg-neo-yellow flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm"
                            >
                              <Download className="w-4 h-4 text-neo-dark" />
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Composer Frame */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 border-t-[3px] border-neo-dark bg-white rounded-b-[12px] flex flex-col gap-3 flex-shrink-0">
          
          {/* Composer Sub-forms */}
          <form onSubmit={handleSend} className="flex flex-row gap-2.5 items-end mt-1 w-full relative">
            
            {/* Type 1: Text message */}
            {composerMode === 'message' && (
              <div className="flex-1 relative flex items-center min-w-0" ref={attachmentRef}>
                <button
                  type="button"
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                  className="absolute left-3 p-1 text-neo-dark hover:bg-neo-dark/5 rounded-[6px] hover:scale-110 transition-transform active:scale-95 focus:outline-none animate-in fade-in"
                  title="Attach file or code snippet"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {isAttachmentMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-3 bg-white border-[3px] border-neo-dark rounded-[12px] p-2 flex flex-col gap-1 shadow-[4px_4px_0_0_#111111] z-50 min-w-[160px]">
                    <button
                      type="button"
                      onClick={() => {
                        setComposerMode('code');
                        setIsAttachmentMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-neo-yellow/35 rounded-[6px] font-black text-[11px] uppercase transition-colors text-left text-neo-dark"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Code Snippet</span>
                    </button>
                    {activeRoom?.isFileSharingEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setComposerMode('file');
                          setIsAttachmentMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-neo-yellow/35 rounded-[6px] font-black text-[11px] uppercase transition-colors text-left text-neo-dark"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>File Upload</span>
                      </button>
                    )}
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
                  className="w-full h-11 border-[2.5px] border-neo-dark rounded-[12px] bg-white pl-10 pr-4 text-xs sm:text-sm font-semibold focus:outline-none text-neo-dark placeholder-neo-dark/40"
                />
              </div>
            )}

            {/* Type 2: Code block */}
            {composerMode === 'code' && (
              <div className="flex-1 flex flex-col gap-2 border-[3px] border-neo-dark rounded-[12px] p-3 bg-cream min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-neo-dark">Snippet Editor</span>
                    <button 
                      type="button"
                      onClick={() => setComposerMode('message')}
                      className="text-neo-red hover:bg-neo-dark/5 p-1 rounded transition-colors"
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
                      className="py-0.5 px-2 border-[2px] rounded font-black text-[10px] w-full"
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Paste or write your code snippet here..."
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full h-24 border-[2px] border-neo-dark bg-white rounded p-2 font-mono text-xs text-neo-dark focus:outline-none"
                />
              </div>
            )}

            {/* Type 3: File Upload */}
            {composerMode === 'file' && (
              <div className="flex-1 flex flex-col gap-2 border-[3px] border-neo-dark rounded-[12px] p-3 bg-cream min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-neo-dark">File Uploader</span>
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
                      className="text-neo-red hover:bg-neo-dark/5 p-1 rounded transition-colors"
                      title="Cancel and return to chat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {selectedFileName ? (
                  <div className="flex items-center justify-between border-[2px] border-neo-dark bg-white rounded p-2 text-xs font-black gap-4 min-w-0 animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <File className="w-4 h-4 text-neo-purple flex-shrink-0" />
                      <span className="truncate text-left font-black">{selectedFileName}</span>
                      <span className="text-neo-dark/50 text-[10px] flex-shrink-0">({selectedFileSize})</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { setSelectedFileName(''); setSelectedFileSize(''); setSelectedFileType(''); setSelectedFileUrl(''); }}
                      className="text-neo-red hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : isFileUploading ? (
                  <div className="w-full py-2 border-[2.5px] border-neo-dark bg-[#E8F1FF] rounded font-archivo text-xs uppercase font-black flex items-center justify-center gap-2 select-none">
                    <div className="w-4 h-4 border-[2.5px] border-neo-dark border-t-neo-blue rounded-full animate-spin flex-shrink-0" />
                    <span>Uploading File...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 border-[2.5px] border-neo-dark bg-white hover:bg-cream rounded font-archivo text-xs uppercase font-black transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#111111]"
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
                className="w-11 h-11 sm:w-auto sm:h-11 sm:gap-1.5 border-[2.5px] border-neo-dark rounded-full sm:rounded-[10px] bg-neo-yellow hover:bg-[#ffdf1a] text-neo-dark font-archivo text-xs uppercase font-black flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 select-none shadow-[2px_2px_0_0_#111111] p-0 sm:px-5"
              >
                <Send className="w-4 h-4 fill-neo-dark text-neo-dark flex-shrink-0" />
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
      </div>
  );
}
