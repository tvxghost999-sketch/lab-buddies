'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  StickyNote, Plus, Pin, Copy, Trash2, MoreVertical, 
  Grid, List, AlertCircle, Sparkles, Check 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';

export default function NotesPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const notes = useRoomStore((state) => state.notes);
  const addNote = useRoomStore((state) => state.addNote);
  const deleteNote = useRoomStore((state) => state.deleteNote);
  const togglePinNote = useRoomStore((state) => state.togglePinNote);
  const addToast = useRoomStore((state) => state.addToast);
  const showConfirm = useRoomStore((state) => state.showConfirm);

  // New Note Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'orange'>('yellow');
  const [newPinned, setNewPinned] = useState(false);

  // Layout View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Submit Note Creator Form
  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      addToast('Please enter both a title and some content.', 'warning');
      return;
    }

    addNote({
      title: newTitle,
      content: newContent,
      color: newColor,
      pinned: newPinned,
    });

    // Reset states
    setNewTitle('');
    setNewContent('');
    setNewColor('yellow');
    setNewPinned(false);
    setIsModalOpen(false);
  };

  // Copy note content
  const handleCopyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Note copied to clipboard!', 'success');
  };

  // Sort notes so pinned ones appear first
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Sticky color mapping for modern dark theme cards with glowy colored borders
  const colorBorders = {
    yellow: 'border-[#FFD600]/40 bg-[#FFD600]/5 text-[#FFD600] shadow-[0_4px_20px_rgba(255,214,0,0.06)]',
    blue: 'border-[#4F7CFF]/40 bg-[#4F7CFF]/5 text-[#4F7CFF] shadow-[0_4px_20px_rgba(79,124,255,0.06)]',
    green: 'border-[#22C55E]/40 bg-[#22C55E]/5 text-[#22C55E] shadow-[0_4px_20px_rgba(34,197,94,0.06)]',
    purple: 'border-[#8B5CF6]/40 bg-[#8B5CF6]/5 text-[#8B5CF6] shadow-[0_4px_20px_rgba(139,92,246,0.06)]',
    red: 'border-[#EF4444]/40 bg-[#EF4444]/5 text-[#EF4444] shadow-[0_4px_20px_rgba(239,68,68,0.06)]',
    orange: 'border-[#FF6A00]/40 bg-[#FF6A00]/5 text-[#FF6A00] shadow-[0_4px_20px_rgba(255,106,0,0.06)]',
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-[#FF6A00]" />
            Shared Notes
          </h1>
          <p className="text-xs text-[#71717a]">
            Write down equations, instructions, reminders, or general points. Pinned notes float to the top.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="yellow" 
            size="sm" 
            onClick={() => setIsModalOpen(true)}
            className="gap-1 shadow-[0_0_15px_rgba(255,214,0,0.15)]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs">New Note</span>
          </Button>
          <div className="border border-white/[0.08] bg-white/[0.03] rounded-xl px-3.5 py-1.5 text-xs text-[#f4f4f5] select-none flex items-center">
            Total Notes: {notes.length}
          </div>
        </div>
      </div>

      {/* Grid or List switches */}
      {notes.length > 0 && (
        <div className="p-3 flex justify-end select-none bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
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
      )}

      {/* Notes container */}
      {sortedNotes.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-4 select-none border border-white/[0.08] rounded-2xl bg-[#0f0f10]">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-2xl shadow-lg">
            📝
          </div>
          <h3 className="text-sm font-semibold text-[#f4f4f5]">No notes shared yet</h3>
          <p className="text-xs text-[#71717a] max-w-xs">
            Create ephemeral sticky notes to capture lists, assignments, tasks, or links.
          </p>
          <Button variant="yellow" size="sm" onClick={() => setIsModalOpen(true)}>
            Create First Note
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Sticky Notes Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sortedNotes.map((note) => (
            <div 
              key={note._id || note.id}
              className={`border rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[220px] ${colorBorders[note.color]}`}
            >
              <div>
                {/* Note Header */}
                <div className="flex justify-between items-start gap-4 mb-3 pb-2 border-b border-white/[0.06] select-none">
                  <h3 className="text-xs font-semibold uppercase tracking-wider truncate">
                    {note.title}
                  </h3>
                  <button 
                    onClick={() => togglePinNote(note._id || note.id)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: note.pinned ? '#FF6A00' : '#71717a' }}
                    title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-[#FF6A00]/20' : ''}`} />
                  </button>
                </div>

                {/* Content */}
                <p className="text-xs leading-relaxed text-[#a1a1aa] whitespace-pre-wrap mb-4">
                  {note.content}
                </p>
              </div>

              {/* Note Footer */}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] select-none text-[#71717a]">
                <span>By {note.createdBy} ({note.createdAt})</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopyNote(`${note.title}\n\n${note.content}`)}
                    className="p-1.5 border border-white/[0.1] bg-white/5 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] transition-all cursor-pointer"
                    title="Copy note content"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      showConfirm(
                        'Delete Note',
                        'Are you sure you want to delete this note? This action cannot be undone.',
                        () => deleteNote(note._id || note.id)
                      );
                    }}
                    className="p-1.5 border border-[#EF4444]/20 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-all cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List mode */
        <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="divide-y divide-white/[0.06] select-none">
            {sortedNotes.map((note) => (
              <div key={note._id || note.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                    note.color === 'yellow' ? 'bg-[#FFD600]/10 text-[#FFD600]' :
                    note.color === 'blue' ? 'bg-[#4F7CFF]/10 text-[#4F7CFF]' :
                    note.color === 'green' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                    note.color === 'purple' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' :
                    note.color === 'red' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                    'bg-[#FF6A00]/10 text-[#FF6A00]'
                  }`}>
                    📌
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-2">
                      {note.title} {note.pinned && <Pin className="w-3 h-3 fill-[#FF6A00]/20 text-[#FF6A00]" />}
                    </span>
                    <span className="text-[10px] text-[#71717a] truncate max-w-md">
                      {note.content.replace(/\n/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleCopyNote(`${note.title}\n\n${note.content}`)}
                    className="px-3 py-1.5 border border-white/[0.1] bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] rounded-xl text-xs font-medium text-[#a1a1aa] transition-all cursor-pointer"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => {
                      showConfirm(
                        'Delete Note',
                        'Are you sure you want to delete this note? This action cannot be undone.',
                        () => deleteNote(note._id || note.id)
                      );
                    }}
                    className="px-3 py-1.5 border border-[#EF4444]/20 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-xl text-xs font-medium transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Creator Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Pinned Sticky Note">
        <form onSubmit={handleSubmitNote} className="flex flex-col gap-4 text-left">
          
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Note Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Equations Sheet, Assignment Checklist"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="neo-input w-full text-sm font-semibold"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Note Content</label>
            <textarea
              required
              rows={4}
              placeholder="Write down notes, copy links, code instructions, list items etc."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full border border-white/[0.08] rounded-xl p-3 bg-white/[0.03] text-sm text-[#f4f4f5] focus:outline-none focus:border-[#FFD600]/40"
            />
          </div>

          {/* Color radio selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Sticky Card Color</label>
            <div className="flex gap-3">
              {(['yellow', 'blue', 'green', 'purple', 'red', 'orange'] as const).map((color) => {
                const mapColors = {
                  yellow: '#FFD600',
                  blue: '#4F7CFF',
                  green: '#22C55E',
                  purple: '#8B5CF6',
                  red: '#EF4444',
                  orange: '#FF6A00'
                };
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: `${mapColors[color]}20`, borderColor: mapColors[color], color: mapColors[color] }}
                  >
                    {newColor === color && <Check className="w-4 h-4 stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pin Toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer mt-1 select-none text-xs text-[#a1a1aa]">
            <input
              type="checkbox"
              checked={newPinned}
              onChange={(e) => setNewPinned(e.target.checked)}
              className="w-4 h-4 border border-white/[0.1] rounded bg-white/5 text-[#FFD600] focus:ring-0 cursor-pointer"
            />
            <span>Pin note to the top of the grid</span>
          </label>

          {/* Submit */}
          <Button 
            type="submit" 
            variant="yellow" 
            size="md" 
            className="w-full gap-2 mt-2 uppercase text-xs shadow-[0_0_20px_rgba(255,214,0,0.15)] justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sticky Note</span>
          </Button>

        </form>
      </Modal>

    </div>
  );
}
