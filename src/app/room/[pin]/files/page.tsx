'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  FolderOpen, Search, Download, Sparkles, Filter, 
  Grid, List, File, FileText, Image, Archive, 
  Code, Play, AlertCircle, Plus 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';


export default function FilesPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const addToast = useRoomStore((state) => state.addToast);
  
  // Extract all files from the feed list
  const filesList = feedItems.filter(item => item.type === 'file');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ fileName: string; fileUrl?: string } | null>(null);
  
  const loggedInUser = useRoomStore((state) => state.loggedInUser);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';


  // Trigger file download
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


  // Helper to resolve categories
  const getFileCategory = (type?: string): string => {
    if (!type) return 'Others';
    const ext = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'Images';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'Documents';
    if (['cpp', 'c', 'py', 'js', 'ts', 'java', 'html', 'css'].includes(ext)) return 'Code';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
    return 'Others';
  };

  // Filter logic
  const filteredFiles = filesList.filter((file) => {
    const matchesSearch = file.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const fileCategory = getFileCategory(file.fileType);
    
    // Category pill filter
    const matchesCategory = activeCategory === 'All' || fileCategory === activeCategory;
    
    // Dropdown filter
    const matchesDropdown = typeFilter === 'All' || file.fileType?.toUpperCase() === typeFilter.toUpperCase();

    return matchesSearch && matchesCategory && matchesDropdown;
  });

  // Render proper icon & background bar based on extension
  const renderFileDesign = (ext?: string) => {
    const type = ext?.toLowerCase() || '';
    let bgColor = 'bg-neo-blue';
    let icon = <File className="w-8 h-8 text-white" />;
    let badgeText = type.toUpperCase();

    if (type === 'pdf') {
      bgColor = 'bg-neo-red';
      icon = <FileText className="w-8 h-8 text-white" />;
    } else if (type === 'zip' || type === 'rar') {
      bgColor = 'bg-neo-purple';
      icon = <Archive className="w-8 h-8 text-white" />;
    } else if (type === 'png' || type === 'jpg' || type === 'jpeg') {
      bgColor = 'bg-neo-green';
      icon = <Image className="w-8 h-8 text-neo-dark" />;
    } else if (['cpp', 'js', 'py', 'java', 'html'].includes(type)) {
      bgColor = 'bg-neo-blue';
      icon = <Code className="w-8 h-8 text-white" />;
    } else if (type === 'pptx' || type === 'ppt') {
      bgColor = 'bg-neo-orange';
      icon = <Play className="w-8 h-8 text-neo-dark animate-pulse" />;
    } else if (type === 'xlsx' || type === 'xls') {
      bgColor = 'bg-neo-green';
      icon = <FileText className="w-8 h-8 text-neo-dark" />;
    }

    return (
      <div className={`h-24 ${bgColor} border-b-[3px] border-neo-dark flex items-center justify-center relative rounded-t-[12px]`}>
        {icon}
        <span className="absolute bottom-2 right-2 bg-white text-neo-dark font-archivo text-[9px] px-2 py-0.5 border-[2px] border-neo-dark rounded font-black">
          {badgeText}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-neo-orange" />
            Shared Files
          </h1>
          <p className="text-xs font-bold text-neo-dark/70">
            All files shared in this room. You can search, download or preview them.
          </p>
        </div>

        {/* Floating Stats */}
        <div className="flex items-center gap-2">
          <div className="border-[2.5px] border-neo-dark rounded-[8px] bg-white px-3 py-1 text-xs font-black text-neo-dark shadow-neo-sm">
            Total Files: {filesList.length}
          </div>
        </div>
      </div>

      {/* Toolbar (Search, Filter, Layout switches) */}
      <Card variant="white" className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-neo-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-dark/50" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input !pl-10 pr-4 py-2 text-xs w-full font-semibold"
          />
        </div>

        {/* Dropdown filters and view modes */}
        <div className="flex w-full md:w-auto items-center justify-end gap-3 select-none">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Filter className="w-4 h-4 text-neo-dark/60" />
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
              className="py-1 px-3 border-[2.5px] rounded-md font-bold text-xs"
            />
          </div>
          </div>

          <div className="flex border-[2.5px] border-neo-dark rounded-md bg-white overflow-hidden">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 border-r-[2.5px] border-neo-dark hover:bg-cream transition-colors ${viewMode === 'grid' ? 'bg-neo-yellow' : ''}`}
            >
              <Grid className="w-4 h-4 text-neo-dark" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 hover:bg-cream transition-colors ${viewMode === 'list' ? 'bg-neo-yellow' : ''}`}
            >
              <List className="w-4 h-4 text-neo-dark" />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Files Display */}
      {filteredFiles.length === 0 ? (
        <Card variant="white" className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none">
          <AlertCircle className="w-10 h-10 text-neo-orange" />
          <h3 className="font-archivo text-sm uppercase text-neo-dark">No files match filters</h3>
          <p className="text-xs font-bold text-neo-dark/60 max-w-xs">
            Try adjusting your search query, or select another category tab to find what you need.
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <Card 
              key={file.id} 
              variant="white" 
              hasShadow 
              shadowSize="sm" 
              className="group overflow-hidden flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo transition-all"
            >
              {renderFileDesign(file.fileType)}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-neo-dark truncate block" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="text-[10px] font-semibold text-neo-dark/50 mt-0.5">
                    {file.fileSize}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neo-dark/10 pt-2 text-[9.5px] font-bold text-neo-dark/60 select-none">
                  <span>Uploaded by {file.senderName}</span>
                  <span>{file.timestamp}</span>
                </div>

                <Button
                  variant="white"
                  size="sm"
                  onClick={() => handleDownload(file.fileName || '', file.fileUrl)}
                  className="w-full gap-1.5 border-[2px] mt-1 shadow-[2px_2px_0_0_#111111] group-hover:bg-neo-yellow group-hover:border-neo-dark transition-colors text-[10px] font-archivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List Layout */
        <Card variant="white" className="overflow-hidden">
          <div className="divide-y-[2.5px] divide-neo-dark select-none">
            {filteredFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 hover:bg-cream/40 transition-colors gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded border-[2px] border-neo-dark bg-neo-yellow/20 flex items-center justify-center font-archivo text-[10px] font-black text-neo-dark">
                    {file.fileType?.toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-neo-dark truncate">{file.fileName}</span>
                    <span className="text-[9.5px] font-semibold text-neo-dark/45">
                      {file.fileSize} • Uploaded by {file.senderName} ({file.timestamp})
                    </span>
                  </div>
                </div>

                <Button
                  variant="white"
                  size="sm"
                  onClick={() => handleDownload(file.fileName || '', file.fileUrl)}
                  className="gap-1 px-3 py-1.5 border-[2px] shadow-[2px_2px_0_0_#111111] text-[9.5px] font-archivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Selection Bar (Bottom Center) */}
      <div className="flex flex-wrap gap-2 justify-center mt-4 select-none">
        {['All', 'Images', 'Documents', 'Code', 'Archives', 'Others'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 border-[2.5px] border-neo-dark rounded-md font-archivo text-[10.5px] uppercase tracking-wider transition-all shadow-[2px_2px_0_0_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#111111] ${
              activeCategory === cat ? 'bg-neo-yellow -translate-x-0.5 -translate-y-0.5 shadow-[3px_3px_0_0_#111111]' : 'bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
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
