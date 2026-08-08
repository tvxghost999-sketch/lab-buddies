'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  QrCode, Copy, Send, HelpCircle, Zap, Shield, 
  Share2, MessageCircle, ArrowLeftRight, Clock 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

export default function QRSharePage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const activeRoom = useRoomStore((state) => state.activeRoom);
  const members = useRoomStore((state) => state.members);
  const addToast = useRoomStore((state) => state.addToast);

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://swb.app'}/room/${pin}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    addToast('Room link copied to clipboard!', 'success');
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    addToast(`Room PIN #${pin} copied!`, 'success');
  };

  const handleSocialShare = (platform: string) => {
    addToast(`Sharing room link via ${platform}...`, 'success');
  };

  // Real QR Code Generator using QRServer API (scannable with Google Lens, smartphones, etc.)
  const renderNeoQR = () => {
    return (
      <div className="relative border-[4px] border-neo-dark rounded-[16px] bg-white p-3.5 shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all duration-200">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}&color=111111&bgcolor=ffffff`}
          alt="Room QR Code"
          className="w-48 h-48 rounded-[8px] select-none"
          loading="lazy"
        />
        {/* Playful Neo-Brutalist center badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-[2px] border-neo-dark rounded-[6px] flex items-center justify-center shadow-neo-sm">
          <Zap className="w-4 h-4 text-neo-yellow fill-neo-yellow/30" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title block */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
          <QrCode className="w-6 h-6 text-neo-orange" />
          Share Room
        </h1>
        <p className="text-xs font-bold text-neo-dark/70">
          Invite your classmates to collaborate. No authentication required.
        </p>
      </div>

      {/* Main split grid layout: QR left, link details right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: QR Code Panel */}
        <Card variant="white" className="p-6 flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1.5 select-none">
            <span className="font-archivo text-sm uppercase text-neo-dark">
              Share This Room
            </span>
            <p className="text-[10.5px] font-bold text-neo-dark/65 max-w-xs">
              Scan QR code or share the link to invite others.
            </p>
          </div>

          {/* QR Component */}
          {renderNeoQR()}

          {/* PIN Copy Box */}
          <div className="flex flex-col gap-2 w-full max-w-xs select-none">
            <span className="text-[9.5px] font-black uppercase text-neo-dark/50">Room PIN</span>
            <div className="flex border-[3px] border-neo-dark rounded-[10px] bg-cream/35 overflow-hidden">
              <div className="flex-1 flex items-center justify-center font-archivo text-base font-black text-neo-dark tracking-widest pl-4">
                {pin}
              </div>
              <button 
                onClick={handleCopyPin}
                className="px-4 py-2 bg-neo-yellow border-l-[3px] border-neo-dark font-archivo text-xs uppercase font-black hover:bg-yellow-400 active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Badge */}
          <div className="bg-neo-blue text-white px-4 py-2 border-[2.5px] border-neo-dark rounded-[10px] text-[10.5px] font-black uppercase tracking-wider shadow-neo-sm w-full select-none">
            Anyone with the PIN or link can join this room.
          </div>
        </Card>

        {/* Right Side: Link Input & Info */}
        <div className="flex flex-col gap-6">
          
          {/* Card 1: Link Box */}
          <Card variant="white" className="p-6 flex flex-col gap-4">
            <span className="font-archivo text-xs uppercase tracking-wide text-neo-dark pb-2 border-b-[2px] border-neo-dark select-none">
              Share Room Link
            </span>

            {/* Input & Copy */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="neo-input text-xs font-semibold bg-cream/25 cursor-default select-all"
              />
              <Button 
                variant="yellow" 
                size="md" 
                onClick={handleCopyLink}
                className="w-full gap-1.5 font-archivo text-xs uppercase shadow-[2.5px_2.5px_0_0_#111111] hover:shadow-[4px_4px_0_0_#111111]"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </Button>
            </div>

            {/* Social icons row */}
            <div className="flex flex-col gap-2 select-none mt-2">
              <span className="text-[10px] font-black uppercase text-neo-dark/50">Share via</span>
              <div className="flex gap-3">
                {/* Whatsapp */}
                <button 
                  onClick={() => handleSocialShare('WhatsApp')}
                  className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-neo-green flex items-center justify-center shadow-neo-sm hover:-translate-y-0.5 transition-transform"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5 text-neo-dark fill-white/20" />
                </button>
                {/* Telegram */}
                <button 
                  onClick={() => handleSocialShare('Telegram')}
                  className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-neo-blue flex items-center justify-center shadow-neo-sm hover:-translate-y-0.5 transition-transform"
                  title="Telegram"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
                {/* Discord */}
                <button 
                  onClick={() => handleSocialShare('Discord')}
                  className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-neo-purple flex items-center justify-center shadow-neo-sm hover:-translate-y-0.5 transition-transform"
                  title="Discord"
                >
                  <Zap className="w-5 h-5 text-white" />
                </button>
                {/* More share */}
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Join Room', url: inviteUrl }).catch(() => {});
                    } else {
                      handleCopyLink();
                    }
                  }}
                  className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-neo-dark flex items-center justify-center shadow-neo-sm hover:-translate-y-0.5 transition-transform"
                  title="More Options"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </Card>

          {/* Card 2: Room Info review */}
          <Card variant="white" className="p-6 flex flex-col gap-4 border-[3px]">
            <span className="font-archivo text-xs uppercase tracking-wide text-neo-dark pb-2 border-b-[2px] border-neo-dark select-none">
              Room Details
            </span>

            <div className="flex flex-col gap-2.5 text-xs font-bold text-neo-dark/85">
              <div className="flex justify-between items-center py-1 border-b border-neo-dark/10">
                <span className="text-neo-dark/50">Room Name</span>
                <span>{activeRoom?.name || 'lab-row-1'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neo-dark/10">
                <span className="text-neo-dark/50">Created By</span>
                <span>{activeRoom?.createdBy || 'Aman (Host)'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neo-dark/10">
                <span className="text-neo-dark/50">Created At</span>
                <span>{activeRoom?.createdAt || 'May 18, 2025, 11:40 AM'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neo-dark/10">
                <span className="text-neo-dark/50">Active Members</span>
                <span>{members.length} / {activeRoom?.maxMembers || 20}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neo-dark/10">
                <span className="text-neo-dark/50">Auto Delete</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neo-orange" />
                  <span>In {activeRoom?.autoDeleteTimer || '2 Hours'}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neo-dark/50">Room Status</span>
                <span className="flex items-center gap-1.5 uppercase font-black text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-neo-green animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}
