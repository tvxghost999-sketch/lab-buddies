'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Code, Terminal, Copy, Download, Filter, 
  Grid, List, AlertCircle, Sparkles, Check 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';

export default function CodeSnippetsPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const addToast = useRoomStore((state) => state.addToast);

  const codeSnippets = feedItems.filter(item => item.type === 'code');

  const [languageFilter, setLanguageFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('Code snippet copied to clipboard!', 'success');
  };

  const handleDownloadCode = (fileName: string) => {
    addToast(`Downloading ${fileName}...`, 'success');
  };

  const filteredSnippets = codeSnippets.filter((item) => {
    if (languageFilter === 'All') return true;
    return item.language?.toLowerCase() === languageFilter.toLowerCase();
  });

  const getLanguageBadgeStyles = (lang?: string) => {
    const l = lang?.toLowerCase() || '';
    if (l === 'c++' || l === 'cpp') return 'bg-[#4F7CFF]/15 text-[#4F7CFF] border-[#4F7CFF]/20';
    if (l === 'python') return 'bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/20';
    if (l === 'javascript' || l === 'js') return 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/20';
    if (l === 'java') return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/20';
    return 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/20';
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <Code className="w-6 h-6 text-[#FF6A00]" />
            Code Snippets
          </h1>
          <p className="text-xs text-[#71717a]">
            View, copy or download code blocks shared in this room.
          </p>
        </div>

        {/* Total Badge */}
        <div className="border border-white/[0.08] bg-white/[0.03] rounded-xl px-3.5 py-1.5 text-xs text-[#f4f4f5] select-none">
          Snippets Shared: {codeSnippets.length}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        
        {/* Language Filter Dropdown */}
        <div className="flex w-full sm:w-auto items-center gap-2 text-xs font-semibold select-none">
          <Filter className="w-4 h-4 text-[#71717a]" />
          <div className="w-44">
            <Select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Languages' },
                { value: 'C++', label: 'C++' },
                { value: 'Python', label: 'Python' },
                { value: 'JavaScript', label: 'JavaScript' },
                { value: 'Java', label: 'Java' },
                { value: 'HTML/CSS', label: 'HTML/CSS' },
                { value: 'Bash', label: 'Bash' }
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* View togglers */}
        <div className="flex border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden select-none">
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

      {/* Snippet Grid/List representation */}
      {filteredSnippets.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none border border-white/[0.08] rounded-2xl bg-[#0f0f10]">
          <AlertCircle className="w-10 h-10 text-[#FF6A00]" />
          <h3 className="text-sm font-semibold text-[#f4f4f5]">No snippets found</h3>
          <p className="text-xs text-[#71717a] max-w-xs">
            No snippets of selected language type are available. Try sharing code via the Live Feed composer!
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSnippets.map((snippet) => (
            <div 
              key={snippet._id || snippet.id} 
              className="flex flex-col overflow-hidden border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              {/* Header bar */}
              <div className="bg-white/[0.02] px-4 py-3 flex items-center justify-between border-b border-white/[0.06] select-none">
                <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${getLanguageBadgeStyles(snippet.language)}`}>
                  {snippet.language}
                </span>
                <span className="text-[10px] text-[#71717a]">
                  By {snippet.senderName} ({snippet.timestamp})
                </span>
              </div>

              {/* Code display frame */}
              <div className="relative group">
                <pre className="p-4 bg-black/40 overflow-auto text-xs font-mono leading-relaxed text-[#f4f4f5] max-h-60 border-b border-white/[0.06]">
                  <code>{snippet.code}</code>
                </pre>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-white/[0.01] flex gap-2">
                <button
                  onClick={() => handleCopyCode(snippet.code || '')}
                  className="flex-1 py-2 text-xs font-medium border border-white/[0.1] rounded-xl text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List mode */
        <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="divide-y divide-white/[0.06]">
            {filteredSnippets.map((snippet) => (
              <div key={snippet._id || snippet.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-[#FFD600]">
                    {snippet.language?.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#f4f4f5] truncate">Snippet by {snippet.senderName}</span>
                    <span className="text-[10px] text-[#71717a]">
                      {snippet.language} • Shared at {snippet.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCode(snippet.code || '')}
                    className="p-2 border border-white/[0.1] bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] rounded-xl transition-all cursor-pointer text-[#a1a1aa] flex items-center justify-center"
                    title="Copy Snippet"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
