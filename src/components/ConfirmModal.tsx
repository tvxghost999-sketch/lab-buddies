'use client';

import React from 'react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import { HelpCircle, AlertTriangle } from 'lucide-react';

export default function ConfirmModal() {
  const confirmDialog = useRoomStore((state) => state.confirmDialog);

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const { title, message, onConfirm, onCancel } = confirmDialog;

  // Determine if it is a destructive action (contains words like delete, remove, clear, leave)
  const isDestructive = 
    message.toLowerCase().includes('delete') || 
    message.toLowerCase().includes('remove') || 
    message.toLowerCase().includes('clear') || 
    message.toLowerCase().includes('scrubbed') ||
    message.toLowerCase().includes('leave');

  return (
    <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-[3px] flex items-center justify-center p-4 z-[99999] animate-fade-in select-none">
      <Card 
        variant="white" 
        className="max-w-md w-full p-6 sm:p-8 text-center flex flex-col items-center gap-6 border-[4px] border-neo-dark shadow-[8px_8px_0_0_#111111] animate-scale-up"
      >
        {/* Playful Neo-Brutalist Icon Header */}
        <div 
          className={`w-14 h-14 rounded-full border-[3px] border-neo-dark flex items-center justify-center shadow-neo-sm ${
            isDestructive ? 'bg-neo-red text-white' : 'bg-neo-yellow text-neo-dark'
          }`}
        >
          {isDestructive ? (
            <AlertTriangle className="w-7 h-7" />
          ) : (
            <HelpCircle className="w-7 h-7" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-2">
          <h3 className="font-archivo text-lg sm:text-xl uppercase text-neo-dark tracking-wide">
            {title || 'Confirm Action'}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-neo-dark/70 leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Buttons Controls */}
        <div className="w-full flex gap-3.5 mt-2">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 border-[2.5px] border-neo-dark rounded-[10px] bg-white font-archivo text-xs uppercase tracking-wider transition-all font-black text-neo-dark/60 hover:bg-cream active:translate-y-[1px]"
          >
            Cancel
          </button>
          <Button 
            onClick={onConfirm}
            variant={isDestructive ? 'red' : 'yellow'}
            size="sm"
            className="flex-1 py-3 font-archivo uppercase text-xs shadow-neo-sm justify-center"
          >
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}
