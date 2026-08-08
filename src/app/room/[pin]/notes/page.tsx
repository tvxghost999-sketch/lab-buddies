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

  // Sticky color mapping
  const colorBgClasses = {
    yellow: 'bg-[#FFF2B2] text-neo-dark border-neo-dark', // Pastelly yellow
    blue: 'bg-[#BFE3FF] text-neo-dark border-neo-dark',   // Pastelly blue
    green: 'bg-[#C1F8C2] text-neo-dark border-neo-dark',  // Pastelly green
    purple: 'bg-[#E3CFFF] text-neo-dark border-neo-dark', // Pastelly purple
    red: 'bg-[#FFC9C9] text-neo-dark border-neo-dark',    // Pastelly red
    orange: 'bg-[#FFE2C9] text-neo-dark border-neo-dark', // Pastelly orange
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-neo-orange" />
            Shared Notes
          </h1>
          <p className="text-xs font-bold text-neo-dark/70">
            Write down equations, instructions, reminders, or general points. Pinned notes float to the top.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="yellow" 
            size="sm" 
            onClick={() => setIsModalOpen(true)}
            className="gap-1 border-[2.5px] shadow-[2px_2px_0_0_#111111]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs">New Note</span>
          </Button>
          <div className="border-[2.5px] border-neo-dark rounded-[8px] bg-white px-3 py-1 text-xs font-black text-neo-dark shadow-neo-sm flex items-center">
            Total Notes: {notes.length}
          </div>
        </div>
      </div>

      {/* Grid or List list switches */}
      {notes.length > 0 && (
        <Card variant="white" className="p-3 flex justify-end select-none shadow-neo-sm">
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
        </Card>
      )}

      {/* Notes container */}
      {sortedNotes.length === 0 ? (
        <Card variant="white" className="p-12 text-center flex flex-col items-center justify-center gap-4 select-none">
          <div className="w-16 h-16 rounded-full border-[3px] border-neo-dark bg-cream flex items-center justify-center text-2xl shadow-neo-sm">
            📝
          </div>
          <h3 className="font-archivo text-sm uppercase text-neo-dark">No notes shared yet</h3>
          <p className="text-xs font-bold text-neo-dark/60 max-w-xs">
            Create ephemeral sticky notes to capture lists, assignments, tasks, or links.
          </p>
          <Button variant="yellow" size="sm" onClick={() => setIsModalOpen(true)}>
            Create First Note
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Sticky Notes Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedNotes.map((note) => (
            <div 
              key={note._id || note.id}
              className={`border-[3px] border-neo-dark rounded-[16px] p-5 shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo transition-all flex flex-col justify-between min-h-[220px] ${colorBgClasses[note.color]}`}
            >
              <div>
                {/* Note Header */}
                <div className="flex justify-between items-start gap-4 mb-3 pb-2 border-b border-neo-dark/15 select-none">
                  <h3 className="font-archivo text-xs uppercase text-neo-dark tracking-wide truncate">
                    {note.title}
                  </h3>
                  <button 
                    onClick={() => togglePinNote(note._id || note.id)}
                    className={`p-1 rounded hover:bg-black/5 transition-colors ${note.pinned ? 'text-neo-orange' : 'text-neo-dark/30'}`}
                    title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-neo-orange' : ''}`} />
                  </button>
                </div>

                {/* Content */}
                <p className="text-xs font-semibold whitespace-pre-wrap leading-relaxed text-neo-dark/95 mb-4">
                  {note.content}
                </p>
              </div>

              {/* Note Footer */}
              <div className="flex items-center justify-between border-t border-neo-dark/15 pt-3 text-[9.5px] font-bold select-none text-neo-dark/50">
                <span>By {note.createdBy} ({note.createdAt})</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleCopyNote(`${note.title}\n\n${note.content}`)}
                    className="p-1 border-[1.5px] border-neo-dark bg-white rounded hover:bg-cream transition-all hover:translate-y-[-0.5px] shadow-[1.5px_1.5px_0_0_#111111]"
                    title="Copy note content"
                  >
                    <Copy className="w-3 h-3 text-neo-dark" />
                  </button>
                  <button 
                    onClick={() => {
                      showConfirm(
                        'Delete Note',
                        'Are you sure you want to delete this note? This action cannot be undone.',
                        () => deleteNote(note._id || note.id)
                      );
                    }}
                    className="p-1 border-[1.5px] border-neo-dark bg-white rounded text-neo-red hover:bg-neo-red/10 transition-all hover:translate-y-[-0.5px] shadow-[1.5px_1.5px_0_0_#111111]"
                    title="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List mode */
        <Card variant="white" className="overflow-hidden">
          <div className="divide-y-[2.5px] divide-neo-dark select-none">
            {sortedNotes.map((note) => (
              <div key={note._id || note.id} className="flex items-center justify-between p-4 hover:bg-cream/20 transition-colors gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded border-[2px] border-neo-dark flex items-center justify-center text-lg ${colorBgClasses[note.color]}`}>
                    📌
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-neo-dark flex items-center gap-2">
                      {note.title} {note.pinned && <Pin className="w-3 h-3 fill-neo-orange text-neo-orange" />}
                    </span>
                    <span className="text-[10px] font-bold text-neo-dark/50 truncate max-w-md">
                      {note.content.replace(/\n/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleCopyNote(`${note.title}\n\n${note.content}`)}
                    className="p-1.5 border-[2px] border-neo-dark bg-white rounded shadow-[2px_2px_0_0_#111111] text-[10px] font-archivo font-black uppercase"
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
                    className="p-1.5 border-[2px] border-neo-dark bg-white text-neo-red rounded shadow-[2px_2px_0_0_#111111] text-[10px] font-archivo font-black uppercase"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Note Creator Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Pinned Sticky Note">
        <form onSubmit={handleSubmitNote} className="flex flex-col gap-4 text-left">
          
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-neo-dark">Note Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Equations Sheet, Assignment Checklist"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="neo-input w-full text-xs sm:text-sm font-semibold"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-neo-dark">Note Content</label>
            <textarea
              required
              rows={4}
              placeholder="Write down notes, copy links, code instructions, list items etc."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full border-[3px] border-neo-dark rounded-lg p-3 bg-white font-sans text-xs sm:text-sm font-semibold text-neo-dark focus:outline-none focus:shadow-neo-sm"
            />
          </div>

          {/* Color radio selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-neo-dark">Sticky Card Color</label>
            <div className="flex gap-3">
              {(['yellow', 'blue', 'green', 'purple', 'red', 'orange'] as const).map((color) => {
                const mapColors = {
                  yellow: '#FFF2B2',
                  blue: '#BFE3FF',
                  green: '#C1F8C2',
                  purple: '#E3CFFF',
                  red: '#FFC9C9',
                  orange: '#FFE2C9'
                };
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className="w-8 h-8 rounded-full border-[2.5px] border-neo-dark flex items-center justify-center shadow-neo-sm transition-transform active:scale-95"
                    style={{ backgroundColor: mapColors[color] }}
                  >
                    {newColor === color && <Check className="w-4 h-4 text-neo-dark stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pin Toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer mt-1 select-none font-bold text-xs">
            <input
              type="checkbox"
              checked={newPinned}
              onChange={(e) => setNewPinned(e.target.checked)}
              className="w-4 h-4 border-[2px] border-neo-dark rounded bg-white text-neo-yellow focus:ring-0 cursor-pointer"
            />
            <span>Pin note to the top of the grid</span>
          </label>

          {/* Submit */}
          <Button 
            type="submit" 
            variant="yellow" 
            size="md" 
            className="w-full gap-2 mt-2 font-archivo uppercase text-xs shadow-[3px_3px_0_0_#111111]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sticky Note</span>
          </Button>

        </form>
      </Modal>

    </div>
  );
}
