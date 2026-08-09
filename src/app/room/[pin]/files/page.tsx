'use client';

import React, { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  FolderOpen, Search, Download, Sparkles, Filter, 
  Grid, List, File, FileText, Image, Archive, 
  Code, Play, AlertCircle, Plus 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';

export default function FilesPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const addToast = useRoomStore((state) => state.addToast);
  const currentUser = useRoomStore((state) => state.currentUser);
  
  const filesList = feedItems.filter(item => item.type === 'file');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ fileId: string; fileName: string; fileUrl?: string } | null>(null);
  const lastDownloadTimesRef = useRef<Record<string, number>>({});
  
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const handleDownload = (fileId: string, fileName: string, fileUrl?: string) => {
    // 10-second download throttle anti-spam protection
    const now = Date.now();
    const lastTime = lastDownloadTimesRef.current[fileId] || 0;
    if (now - lastTime < 10000) {
      addToast('Please wait before downloading again', 'warning');
      return;
    }
    lastDownloadTimesRef.current[fileId] = now;

    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    
    if (isPremium) {
      proceedWithDownload(fileId, fileName, fileUrl);
      return;
    }

    const countStr = typeof window !== 'undefined' ? (localStorage.getItem('lab_buddies_downloads_count') || '0') : '0';
    const count = parseInt(countStr, 10);
    const nextCount = count + 1;

    if (nextCount > 0 && nextCount % 4 === 0) {
      setPendingDownload({ fileId, fileName, fileUrl });
      setIsAdOpen(true);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lab_buddies_downloads_count', nextCount.toString());
      }
      proceedWithDownload(fileId, fileName, fileUrl);
    }
  };

  const proceedWithDownload = (fileId: string, fileName: string, fileUrl?: string) => {
    socketService.trackDownload(pin, fileId, currentUser?.id || currentUser?.name || 'anonymous');
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

  const getFileCategory = (type?: string): string => {
    if (!type) return 'Others';
    const ext = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'Images';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'Documents';
    if (['cpp', 'c', 'py', 'js', 'ts', 'java', 'html', 'css'].includes(ext)) return 'Code';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
    return 'Others';
  };

  const filteredFiles = filesList.filter((file) => {
    const matchesSearch = file.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    const fileCategory = getFileCategory(file.fileType);
    const matchesCategory = activeCategory === 'All' || fileCategory === activeCategory;
    const matchesDropdown = typeFilter === 'All' || file.fileType?.toUpperCase() === typeFilter.toUpperCase();
    return matchesSearch && matchesCategory && matchesDropdown;
  });

  const renderFileDesign = (ext?: string) => {
    const type = ext?.toLowerCase() || '';
    let accentColor = '#4F7CFF';
    let icon = <File className="w-8 h-8" />;

    if (type === 'pdf') {
      accentColor = '#EF4444';
      icon = <FileText className="w-8 h-8" />;
    } else if (type === 'zip' || type === 'rar') {
      accentColor = '#8B5CF6';
      icon = <Archive className="w-8 h-8" />;
    } else if (type === 'png' || type === 'jpg' || type === 'jpeg') {
      accentColor = '#22C55E';
      icon = <Image className="w-8 h-8" />;
    } else if (['cpp', 'js', 'py', 'java', 'html'].includes(type)) {
      accentColor = '#4F7CFF';
      icon = <Code className="w-8 h-8" />;
    } else if (type === 'pptx' || type === 'ppt') {
      accentColor = '#FF6A00';
      icon = <Play className="w-8 h-8" />;
    } else if (type === 'xlsx' || type === 'xls') {
      accentColor = '#22C55E';
      icon = <FileText className="w-8 h-8" />;
    }

    return (
      <div 
        className="h-24 flex items-center justify-center relative rounded-t-2xl border-b border-white/[0.06]"
        style={{ background: `${accentColor}10`, color: accentColor }}
      >
        {icon}
        <span 
          className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 border rounded"
          style={{ borderColor: `${accentColor}25`, background: `${accentColor}10`, color: accentColor }}
        >
          {type.toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#FF6A00]" />
            Shared Files
          </h1>
          <p className="text-xs text-[#71717a]">
            All files shared in this room. You can search, download or preview them.
          </p>
        </div>

        {/* Total Badge */}
        <div className="border border-white/[0.08] bg-white/[0.03] rounded-xl px-3.5 py-1.5 text-xs text-[#f4f4f5] select-none">
          Total Files: {filesList.length}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        {/* Search */}
        <div className="relative w-full md:w-80 flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input has-icon-left pr-4 py-2 text-sm w-full"
          />
        </div>

        {/* Dropdown filters and view modes */}
        <div className="flex w-full md:w-auto items-center justify-end gap-3 select-none">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Filter className="w-4 h-4 text-[#71717a]" />
            <div className="w-44">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Types' },
                  { value: 'PDF', label: 'PDF Documents' },
                  { value: 'ZIP', label: 'ZIP Archives' },
                  { value: 'PNG', label: 'PNG Images' },
                  { value: 'CPP', label: 'C++ Source' },
                  { value: 'PPTX', label: 'PowerPoint' },
                  { value: 'XLSX', label: 'Excel Sheets' },
                  { value: 'DOCX', label: 'Word Docs' }
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 hover:bg-white/[0.06] transition-colors ${viewMode === 'grid' ? 'text-[#FFD600] bg-white/[0.04]' : 'text-[#a1a1aa]'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 hover:bg-white/[0.06] transition-colors ${viewMode === 'list' ? 'text-[#FFD600] bg-white/[0.04]' : 'text-[#a1a1aa]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none border border-white/[0.08] rounded-2xl bg-[#0f0f10]">
          <AlertCircle className="w-10 h-10 text-[#FF6A00]" />
          <h3 className="text-sm font-semibold text-[#f4f4f5]">No files match filters</h3>
          <p className="text-xs text-[#71717a] max-w-xs">
            Try adjusting your search query, or select another category tab to find what you need.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div 
              key={file._id || file.id} 
              className="group overflow-hidden flex flex-col justify-between border border-white/[0.08] bg-[#0f0f10] rounded-2xl hover:border-white/15 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              {renderFileDesign(file.fileType)}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#f4f4f5] truncate block" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="text-[10px] text-[#71717a] mt-0.5 flex items-center gap-1.5">
                    <span>{file.fileSize}</span>
                    {file.totalDownloads !== undefined && (
                      <>
                        <span>•</span>
                        <span className="text-[#a1a1aa]">{file.totalDownloads} downloads</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px] text-[#71717a] select-none">
                  <span>By {file.senderName}</span>
                  <span>{file.timestamp}</span>
                </div>

                <Button
                  variant="white"
                  size="sm"
                  onClick={() => handleDownload(file._id || file.id, file.fileName || '', file.fileUrl)}
                  className="w-full gap-1.5 mt-1 text-[11px] justify-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Layout */
        <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="divide-y divide-white/[0.06] select-none">
            {filteredFiles.map((file) => (
              <div key={file._id || file.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-[#FFD600]">
                    {file.fileType?.toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#f4f4f5] truncate">{file.fileName}</span>
                    <span className="text-[10px] text-[#71717a]">
                      {file.fileSize} {file.totalDownloads !== undefined ? `• ${file.totalDownloads} dls` : ''} • Uploaded by {file.senderName} ({file.timestamp})
                    </span>
                  </div>
                </div>

                <Button
                  variant="white"
                  size="sm"
                  onClick={() => handleDownload(file._id || file.id, file.fileName || '', file.fileUrl)}
                  className="gap-1 px-3 py-1.5 text-xs justify-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Selection Bar (Bottom Center) */}
      <div className="flex flex-wrap gap-2 justify-center mt-4 select-none">
        {['All', 'Images', 'Documents', 'Code', 'Archives', 'Others'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 border rounded-xl text-xs font-medium transition-all ${
              activeCategory === cat 
                ? 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/25' 
                : 'bg-white/[0.02] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AdInterstitial 
        isOpen={isAdOpen} 
        onComplete={() => {
          if (typeof window !== 'undefined') {
            const countStr = localStorage.getItem('lab_buddies_downloads_count') || '0';
            const count = parseInt(countStr, 10);
            localStorage.setItem('lab_buddies_downloads_count', (count + 1).toString());
          }
          if (pendingDownload) proceedWithDownload(pendingDownload.fileId, pendingDownload.fileName, pendingDownload.fileUrl);
        }} 
        onClose={() => {
          setIsAdOpen(false);
          setPendingDownload(null);
          addToast('Ad was cancelled. Download aborted.', 'warning');
        }}
        actionLabel="Unlocking Download"
      />
    </div>
  );
}
