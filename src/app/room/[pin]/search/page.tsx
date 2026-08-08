'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Search, MessageSquare, Folder, Code, StickyNote, 
  Users, Filter, Calendar, FileText, ArrowRight, AlertCircle, Download
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { Select } from '@/components/ui/input';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';

interface SearchResultItem {
  id: string;
  category: 'message' | 'file' | 'code' | 'note' | 'member';
  title: string;
  subtitle: string;
  metadata: string;
  previewText?: string;
  timestamp: string;
  rawType?: string;
  fileUrl?: string;
  fileName?: string;
}

export default function SearchPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const notes = useRoomStore((state) => state.notes);
  const members = useRoomStore((state) => state.members);
  const addToast = useRoomStore((state) => state.addToast);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'message' | 'file' | 'code' | 'note' | 'member'>('all');
  
  const [dateRange, setDateRange] = useState('All Time');
  const [fileTypeFilter, setFileTypeFilter] = useState('All Types');
  const [languageFilter, setLanguageFilter] = useState('All Languages');

  const [isAdOpen, setIsAdOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ fileName: string; fileUrl?: string } | null>(null);
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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

  const allResults: SearchResultItem[] = [];

  feedItems.forEach((item) => {
    if (item.type === 'message') {
      allResults.push({
        id: item._id || item.id,
        category: 'message',
        title: `Message from ${item.senderName}`,
        subtitle: item.senderRole.toUpperCase(),
        metadata: item.timestamp,
        previewText: item.content,
        timestamp: item.timestamp,
      });
    } else if (item.type === 'file') {
      allResults.push({
        id: item._id || item.id,
        category: 'file',
        title: item.fileName || 'Shared File',
        subtitle: `Uploaded by ${item.senderName} (${item.fileSize})`,
        metadata: item.timestamp,
        previewText: `File Type: ${item.fileType?.toUpperCase()}`,
        timestamp: item.timestamp,
        rawType: item.fileType,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
      });
    } else if (item.type === 'code') {
      allResults.push({
        id: item._id || item.id,
        category: 'code',
        title: `Code Snippet by ${item.senderName}`,
        subtitle: `Language: ${item.language}`,
        metadata: item.timestamp,
        previewText: item.code?.slice(0, 150) + (item.code && item.code.length > 150 ? '...' : ''),
        timestamp: item.timestamp,
        rawType: item.language,
      });
    }
  });

  notes.forEach((note) => {
    allResults.push({
      id: note._id || note.id,
      category: 'note',
      title: note.title,
      subtitle: `Created by ${note.createdBy} (${note.color} note)`,
      metadata: note.createdAt,
      previewText: note.content,
      timestamp: note.createdAt,
    });
  });

  members.forEach((member) => {
    allResults.push({
      id: member._id || member.id,
      category: 'member',
      title: member.name,
      subtitle: `Joined room at ${member.joinedAt}`,
      metadata: member.isOnline ? 'Online' : 'Offline',
      previewText: `Role: ${member.role.toUpperCase()} • ${member.isMuted ? 'Muted' : 'Voice Enabled'}`,
      timestamp: member.joinedAt,
    });
  });

  const filteredResults = allResults.filter((result) => {
    const matchesQuery = 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.previewText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || result.category === activeTab;

    let matchesFileType = true;
    if (fileTypeFilter !== 'All Types') {
      if (result.category !== 'file') {
        matchesFileType = false;
      } else {
        matchesFileType = result.rawType?.toUpperCase() === fileTypeFilter.toUpperCase();
      }
    }

    let matchesLanguage = true;
    if (languageFilter !== 'All Languages') {
      if (result.category !== 'code') {
        matchesLanguage = false;
      } else {
        matchesLanguage = result.rawType?.toLowerCase() === languageFilter.toLowerCase();
      }
    }

    let matchesDate = true;
    if (dateRange === 'Today') {
      const ts = result.timestamp || '';
      const containsComma = ts.includes(',');
      const containsSlash = ts.includes('/');
      const isShortTime = ts.includes('AM') || ts.includes('PM');
      const todayStr = new Date().toLocaleDateString();
      matchesDate = (isShortTime && !containsComma && !containsSlash) || ts.includes(todayStr);
    } else if (dateRange === 'Yesterday') {
      const ts = result.timestamp || '';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString();
      matchesDate = ts.includes(yesterdayStr);
    }

    return matchesQuery && matchesTab && matchesFileType && matchesLanguage && matchesDate;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#FFD600]" />;
      case 'file':
        return <Folder className="w-4 h-4 text-[#FF6A00]" />;
      case 'code':
        return <Code className="w-4 h-4 text-[#4F7CFF]" />;
      case 'note':
        return <StickyNote className="w-4 h-4 text-[#22C55E]" />;
      case 'member':
        return <Users className="w-4 h-4 text-[#8B5CF6]" />;
      default:
        return <FileText className="w-4 h-4 text-[#a1a1aa]" />;
    }
  };

  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'message': return 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/20';
      case 'file': return 'bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/20';
      case 'code': return 'bg-[#4F7CFF]/15 text-[#4F7CFF] border-[#4F7CFF]/20';
      case 'note': return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/20';
      case 'member': return 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20';
      default: return 'bg-white/[0.03] text-[#f4f4f5] border-white/[0.08]';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title block */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
          <Search className="w-6 h-6 text-[#FF6A00]" />
          Search Everything
        </h1>
        <p className="text-xs text-[#71717a]">
          Find messages, files, code snippets, notes, and members active in this room.
        </p>
      </div>

      {/* Big Search Input Field */}
      <form onSubmit={(e) => e.preventDefault()} className="p-4 flex gap-3 bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Type search terms here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input !pl-11 pr-4 py-3 text-sm w-full"
          />
        </div>
        <Button type="submit" variant="yellow" size="md" className="gap-1.5 px-6 shadow-[0_0_15px_rgba(255,214,0,0.15)]">
          <span>Search</span>
        </Button>
      </form>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 select-none">
        {([
          { key: 'all', label: 'All' },
          { key: 'message', label: 'Messages' },
          { key: 'file', label: 'Files' },
          { key: 'code', label: 'Code' },
          { key: 'note', label: 'Notes' },
          { key: 'member', label: 'Members' }
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 border rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.key 
                ? 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/25' 
                : 'bg-white/[0.02] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main split grid: Filters (left) and Results (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sub-column: Extra Filters panel */}
        <div className="lg:col-span-3 flex flex-col gap-4 select-none">
          <div className="glass-card p-4 flex flex-col gap-4">
            <span className="text-xs uppercase tracking-wider text-[#a1a1aa] border-b border-white/[0.06] pb-2 font-medium flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#FF6A00]" />
              Filters
            </span>

            <div className="flex flex-col gap-3">
              {/* Filter 1: Date Range */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-[#a1a1aa] tracking-wider mb-0.5">Date Range</label>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { value: 'All Time', label: 'All Time' },
                    { value: 'Today', label: 'Today' },
                    { value: 'Yesterday', label: 'Yesterday' }
                  ]}
                  className="w-full"
                />
              </div>

              {/* Filter 2: File Type (Conditional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-[#a1a1aa] tracking-wider mb-0.5">File Type</label>
                <Select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  options={[
                    { value: 'All Types', label: 'All Types' },
                    { value: 'PDF', label: 'PDF' },
                    { value: 'ZIP', label: 'ZIP' },
                    { value: 'PNG', label: 'PNG' },
                    { value: 'CPP', label: 'CPP' }
                  ]}
                  className="w-full"
                />
              </div>

              {/* Filter 3: Code Language (Conditional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-[#a1a1aa] tracking-wider mb-0.5">Code Language</label>
                <Select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  options={[
                    { value: 'All Languages', label: 'All Languages' },
                    { value: 'C++', label: 'C++' },
                    { value: 'Python', label: 'Python' },
                    { value: 'JavaScript', label: 'JavaScript' },
                    { value: 'Java', label: 'Java' }
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-column: Search Results list */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          <div className="glass-card p-4 flex items-center justify-between text-xs uppercase select-none">
            <span className="font-semibold text-[#f4f4f5]">
              Search Results ({filteredResults.length})
            </span>
            <span className="text-[10px] text-[#71717a]">
              Sort: Newest First
            </span>
          </div>

          {/* Results mapping */}
          <div className="flex flex-col gap-4">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none border border-white/[0.08] rounded-2xl bg-[#0f0f10]">
                <AlertCircle className="w-10 h-10 text-[#FF6A00]" />
                <h3 className="text-sm font-semibold text-[#f4f4f5]">No matches found</h3>
                <p className="text-xs text-[#71717a] max-w-xs">
                  We couldn&apos;t find anything matching your search. Double check spelling or select different filter types.
                </p>
              </div>
            ) : (
              filteredResults.map((result) => (
                <div 
                  key={`${result.category}-${result.id}`} 
                  className="p-4 border border-white/[0.08] bg-[#0f0f10] rounded-2xl hover:border-white/15 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-start gap-3.5">
                    
                    {/* Circle icon type */}
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                      {getCategoryIcon(result.category)}
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-[#f4f4f5] truncate">
                            {result.title}
                          </span>
                          <span className="text-[10px] text-[#71717a] mt-0.5">
                            {result.subtitle}
                          </span>
                        </div>
                        
                        {/* Time & Badge */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 select-none">
                          <span className="bg-white/[0.03] border border-white/[0.08] rounded px-2 py-0.5 text-[10px] font-mono text-[#a1a1aa] mt-0.5">
                            {result.metadata}
                          </span>
                        </div>
                      </div>

                      {/* Content Preview */}
                      {result.previewText && (
                        <div className="mt-3 p-2.5 border border-white/[0.06] rounded-xl bg-white/[0.01] text-xs text-[#a1a1aa] leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {result.previewText}
                        </div>
                      )}
                      
                      {/* File Download Button */}
                      {result.category === 'file' && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="white"
                            size="sm"
                            onClick={() => handleDownload(result.fileName || result.title, result.fileUrl)}
                            className="gap-1.5 text-[11px] justify-center py-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </Button>
                        </div>
                      )}
                      
                      {/* Category Badge footer */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-white/[0.06] text-[10px] text-[#71717a] select-none">
                        <span>Timestamp: {result.timestamp}</span>
                        <span className={`border rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${getCategoryBadgeStyles(result.category)}`}>
                          {result.category}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
