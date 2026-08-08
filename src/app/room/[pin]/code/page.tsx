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

  // Extract all code items from the feed
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

  // Filter snippets based on dropdown language selection
  const filteredSnippets = codeSnippets.filter((item) => {
    if (languageFilter === 'All') return true;
    return item.language?.toLowerCase() === languageFilter.toLowerCase();
  });

  // Highlight languages with different badge colors
  const getLanguageBadgeStyles = (lang?: string) => {
    const l = lang?.toLowerCase() || '';
    if (l === 'c++' || l === 'cpp') return 'bg-neo-blue text-white';
    if (l === 'python') return 'bg-neo-orange text-neo-dark';
    if (l === 'javascript' || l === 'js') return 'bg-neo-purple text-white';
    if (l === 'java') return 'bg-neo-green text-neo-dark';
    return 'bg-neo-yellow text-neo-dark';
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
            <Code className="w-6 h-6 text-neo-orange" />
            Code Snippets
          </h1>
          <p className="text-xs font-bold text-neo-dark/70">
            View, copy or download code blocks shared in this room.
          </p>
        </div>

        {/* Total Badge */}
        <div className="border-[2.5px] border-neo-dark rounded-[8px] bg-white px-3 py-1 text-xs font-black text-neo-dark shadow-neo-sm">
          Snippets Shared: {codeSnippets.length}
        </div>
      </div>

      {/* Toolbar */}
      <Card variant="white" className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-neo-sm">
        
        {/* Language Filter Dropdown */}
        <div className="flex w-full sm:w-auto items-center gap-2 text-xs font-bold select-none">
          <Filter className="w-4 h-4 text-neo-dark/60" />
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
              className="py-1 px-3 border-[2.5px] rounded-md font-bold text-xs"
            />
          </div>
        </div>

        {/* View togglers */}
        <div className="flex border-[2.5px] border-neo-dark rounded-md bg-white overflow-hidden self-end sm:self-auto select-none">
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
      </Card>

      {/* Snippet Grid/List representation */}
      {filteredSnippets.length === 0 ? (
        <Card variant="white" className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none">
          <AlertCircle className="w-10 h-10 text-neo-orange" />
          <h3 className="font-archivo text-sm uppercase text-neo-dark">No snippets found</h3>
          <p className="text-xs font-bold text-neo-dark/60 max-w-xs">
            No snippets of selected language type are available. Try sharing code via the Live Feed composer!
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSnippets.map((snippet) => (
            <Card 
              key={snippet.id} 
              variant="white" 
              hasShadow 
              shadowSize="sm" 
              className="flex flex-col overflow-hidden"
            >
              {/* Header bar */}
              <div className="bg-cream px-4 py-3 flex items-center justify-between border-b-[2.5px] border-neo-dark select-none">
                <span className={`text-[10px] font-archivo font-black border-[1.5px] border-neo-dark rounded px-2 py-0.5 uppercase tracking-wide ${getLanguageBadgeStyles(snippet.language)}`}>
                  {snippet.language}
                </span>
                <span className="text-[10px] font-bold text-neo-dark/60">
                  Shared by {snippet.senderName} ({snippet.timestamp})
                </span>
              </div>

              {/* Code display frame */}
              <div className="relative group">
                <pre className="p-4 bg-white overflow-auto text-xs font-mono font-semibold leading-relaxed text-neo-dark max-h-60 border-b-[2.5px] border-neo-dark">
                  <code>{snippet.code}</code>
                </pre>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-cream/30 flex items-center justify-end gap-3 text-xs font-archivo select-none">
                <button 
                  onClick={() => handleCopyCode(snippet.code || '')}
                  className="flex items-center gap-1.5 px-3 py-1.5 border-[2px] border-neo-dark rounded bg-neo-yellow hover:-translate-y-0.5 shadow-[2px_2px_0_0_#111111] hover:shadow-[3px_3px_0_0_#111111] active:translate-y-0 active:shadow-none transition-all font-black text-[10px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  COPY CODE
                </button>
                <button 
                  onClick={() => handleDownloadCode(`snippet-${snippet.id}.${snippet.language?.toLowerCase() === 'c++' ? 'cpp' : 'js'}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border-[2px] border-neo-dark rounded bg-white hover:-translate-y-0.5 shadow-[2px_2px_0_0_#111111] hover:shadow-[3px_3px_0_0_#111111] active:translate-y-0 active:shadow-none transition-all font-black text-[10px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  DOWNLOAD
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List mode */
        <Card variant="white" className="overflow-hidden">
          <div className="divide-y-[2.5px] divide-neo-dark select-none">
            {filteredSnippets.map((snippet) => (
              <div key={snippet.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-cream/20 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neo-dark/10 flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-4 h-4 text-neo-dark" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-neo-dark flex items-center gap-2">
                      Code Snippet ({snippet.language})
                      <span className="font-medium text-[10px] text-neo-dark/50">by {snippet.senderName}</span>
                    </span>
                    <pre className="text-[10px] font-mono text-neo-dark/60 mt-1 max-w-md truncate bg-cream/40 p-1 border rounded">
                      {snippet.code?.replace(/\n/g, ' ')}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => handleCopyCode(snippet.code || '')}
                    className="p-1.5 border-[2px] border-neo-dark bg-neo-yellow rounded shadow-[2px_2px_0_0_#111111] text-[10px] font-archivo font-black uppercase"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => handleDownloadCode(`snippet-${snippet.id}.txt`)}
                    className="p-1.5 border-[2px] border-neo-dark bg-white rounded shadow-[2px_2px_0_0_#111111] text-[10px] font-archivo font-black uppercase"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
