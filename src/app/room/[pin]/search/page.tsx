'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Search, MessageSquare, Folder, Code, StickyNote, 
  Users, Filter, Calendar, FileText, ArrowRight, AlertCircle 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { Select } from '@/components/ui/input';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

interface SearchResultItem {
  id: string;
  category: 'message' | 'file' | 'code' | 'note' | 'member';
  title: string;
  subtitle: string;
  metadata: string;
  previewText?: string;
  timestamp: string;
  rawType?: string; // e.g. fileType like "pdf" or code language like "cpp"
}

export default function SearchPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  // Pull states from Zustand
  const feedItems = useRoomStore((state) => state.feedItems);
  const notes = useRoomStore((state) => state.notes);
  const members = useRoomStore((state) => state.members);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'message' | 'file' | 'code' | 'note' | 'member'>('all');
  
  // Extra filter states
  const [dateRange, setDateRange] = useState('All Time');
  const [fileTypeFilter, setFileTypeFilter] = useState('All Types');
  const [languageFilter, setLanguageFilter] = useState('All Languages');

  // Unified Search logic: Compile everything into a SearchResultItem array
  const allResults: SearchResultItem[] = [];

  // 1. Messages
  feedItems.forEach((item) => {
    if (item.type === 'message') {
      allResults.push({
        id: item.id,
        category: 'message',
        title: `Message from ${item.senderName}`,
        subtitle: item.senderRole.toUpperCase(),
        metadata: item.timestamp,
        previewText: item.content,
        timestamp: item.timestamp,
      });
    } else if (item.type === 'file') {
      allResults.push({
        id: item.id,
        category: 'file',
        title: item.fileName || 'Shared File',
        subtitle: `Uploaded by ${item.senderName} (${item.fileSize})`,
        metadata: item.timestamp,
        previewText: `File Type: ${item.fileType?.toUpperCase()}`,
        timestamp: item.timestamp,
        rawType: item.fileType,
      });
    } else if (item.type === 'code') {
      allResults.push({
        id: item.id,
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

  // 2. Notes
  notes.forEach((note) => {
    allResults.push({
      id: note.id,
      category: 'note',
      title: note.title,
      subtitle: `Created by ${note.createdBy} (${note.color} note)`,
      metadata: note.createdAt,
      previewText: note.content,
      timestamp: note.createdAt,
    });
  });

  // 3. Members
  members.forEach((member) => {
    allResults.push({
      id: member.id,
      category: 'member',
      title: member.name,
      subtitle: `Joined room at ${member.joinedAt}`,
      metadata: member.isOnline ? 'Online' : 'Offline',
      previewText: `Role: ${member.role.toUpperCase()} • ${member.isMuted ? 'Muted' : 'Voice Enabled'}`,
      timestamp: member.joinedAt,
    });
  });

  // Filtering results
  const filteredResults = allResults.filter((result) => {
    // 1. Text Query Filter
    const matchesQuery = 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.previewText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category Tab Filter
    const matchesTab = activeTab === 'all' || result.category === activeTab;

    // 3. File type sub-filter
    let matchesFileType = true;
    if (result.category === 'file' && fileTypeFilter !== 'All Types') {
      matchesFileType = result.rawType?.toUpperCase() === fileTypeFilter.toUpperCase();
    }

    // 4. Language sub-filter
    let matchesLanguage = true;
    if (result.category === 'code' && languageFilter !== 'All Languages') {
      matchesLanguage = result.rawType?.toLowerCase() === languageFilter.toLowerCase();
    }

    return matchesQuery && matchesTab && matchesFileType && matchesLanguage;
  });

  // Resolve Category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-neo-dark" />;
      case 'file':
        return <Folder className="w-4 h-4 text-neo-dark" />;
      case 'code':
        return <Code className="w-4 h-4 text-neo-dark" />;
      case 'note':
        return <StickyNote className="w-4 h-4 text-neo-dark" />;
      case 'member':
        return <Users className="w-4 h-4 text-neo-dark" />;
      default:
        return <FileText className="w-4 h-4 text-neo-dark" />;
    }
  };

  // Resolve badge styles
  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'message': return 'bg-neo-yellow text-neo-dark';
      case 'file': return 'bg-neo-blue text-white';
      case 'code': return 'bg-neo-purple text-white';
      case 'note': return 'bg-neo-green text-neo-dark';
      case 'member': return 'bg-neo-orange text-neo-dark';
      default: return 'bg-white text-neo-dark';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title block */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
          <Search className="w-6 h-6 text-neo-orange" />
          Search Everything
        </h1>
        <p className="text-xs font-bold text-neo-dark/70">
          Find messages, files, code snippets, notes, and members active in this room.
        </p>
      </div>

      {/* Big Search Input Field */}
      <Card variant="white" className="p-4 flex gap-3 shadow-neo-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neo-dark/50" />
          <input
            type="text"
            placeholder="Type search terms here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input !pl-11 pr-4 py-3 text-sm w-full font-semibold"
          />
        </div>
        <Button variant="yellow" size="md" className="gap-1.5 px-6 font-archivo text-xs uppercase shadow-[2px_2px_0_0_#111111] hover:shadow-[3px_3px_0_0_#111111]">
          <span>Search</span>
        </Button>
      </Card>

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
            className={`px-4 py-2 border-[2.5px] border-neo-dark rounded-md font-archivo text-[10.5px] uppercase tracking-wider transition-all shadow-[2px_2px_0_0_#111111] ${
              activeTab === tab.key ? 'bg-neo-yellow -translate-x-0.5 -translate-y-0.5 shadow-[3px_3px_0_0_#111111]' : 'bg-white'
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
          <Card variant="white" className="p-4 flex flex-col gap-4">
            <span className="font-archivo text-xs uppercase tracking-wider text-neo-dark border-b-[2px] border-neo-dark pb-2 font-black flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-neo-orange" />
              Filters
            </span>

            <div className="flex flex-col gap-3">
              {/* Filter 1: Date Range */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-neo-dark mb-0.5">Date Range</label>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { value: 'All Time', label: 'All Time' },
                    { value: 'Today', label: 'Today' },
                    { value: 'Yesterday', label: 'Yesterday' }
                  ]}
                  className="py-1 px-2 border-[2px] rounded text-xs font-bold w-full"
                />
              </div>

              {/* Filter 2: File Type (Conditional) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-neo-dark mb-0.5">File Type</label>
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
                  className="py-1 px-2 border-[2px] rounded text-xs font-bold w-full"
                />
              </div>

              {/* Filter 3: Code Language (Conditional) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-neo-dark mb-0.5">Code Language</label>
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
                  className="py-1 px-2 border-[2px] rounded text-xs font-bold w-full"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sub-column: Search Results list */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          <Card variant="white" className="p-4 flex items-center justify-between font-archivo text-xs uppercase tracking-wide select-none">
            <span className="font-black text-neo-dark">
              Search Results ({filteredResults.length})
            </span>
            <span className="text-[10px] font-black text-neo-dark/45">
              Sort: Newest First
            </span>
          </Card>

          {/* Results mapping */}
          <div className="flex flex-col gap-4">
            {filteredResults.length === 0 ? (
              <Card variant="white" className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none">
                <AlertCircle className="w-10 h-10 text-neo-orange" />
                <h3 className="font-archivo text-sm uppercase text-neo-dark">No matches found</h3>
                <p className="text-xs font-bold text-neo-dark/60 max-w-xs">
                  We couldn't find anything matching your search. Double check spelling or select different filter types.
                </p>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card 
                  key={`${result.category}-${result.id}`} 
                  variant="white" 
                  hasShadow 
                  shadowSize="sm" 
                  className="p-4 hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
                >
                  <div className="flex items-start gap-3.5">
                    
                    {/* Circle icon type */}
                    <div className="w-9 h-9 rounded-full border-[2.5px] border-neo-dark bg-cream flex items-center justify-center flex-shrink-0">
                      {getCategoryIcon(result.category)}
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-neo-dark truncate">
                            {result.title}
                          </span>
                          <span className="text-[10px] font-bold text-neo-dark/50 mt-0.5">
                            {result.subtitle}
                          </span>
                        </div>
                        
                        {/* Time & Badge */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 select-none">
                          <span className="bg-white border-[1.5px] border-neo-dark rounded px-2 py-0.5 font-archivo text-[8.5px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#111111] inline-block mt-0.5">
                            {result.metadata}
                          </span>
                        </div>
                      </div>

                      {/* Content Preview */}
                      {result.previewText && (
                        <div className="mt-3 p-2.5 border-[2px] border-neo-dark/10 rounded-lg bg-cream/20 text-xs font-bold text-neo-dark/85 leading-normal whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {result.previewText}
                        </div>
                      )}
                      
                      {/* Category Badge footer */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-neo-dark/10 text-[9px] font-black text-neo-dark/45 select-none">
                        <span>Logged Timestamp: {result.timestamp}</span>
                        <span className={`border-[1.5px] border-neo-dark rounded px-1.5 py-0.5 uppercase tracking-wide ${getCategoryBadgeStyles(result.category)}`}>
                          {result.category}
                        </span>
                      </div>
                    </div>

                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
