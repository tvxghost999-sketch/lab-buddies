'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  QrCode, Copy, Send, HelpCircle, Zap, Shield, 
  Share2, MessageCircle, ArrowLeftRight, Clock 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Button from '@/components/ui/button';
import BannerAd from '@/components/BannerAd';

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

  const renderNeoQR = () => {
    return (
      <div className="relative border border-white/[0.08] rounded-2xl bg-white p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-200">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}&color=111111&bgcolor=ffffff`}
          alt="Room QR Code"
          className="w-48 h-48 rounded-lg select-none"
          loading="lazy"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-white/20 rounded-lg flex items-center justify-center shadow-lg">
          <Zap className="w-4 h-4 text-[#FFD600] fill-[#FFD600]/30" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title block */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
          <QrCode className="w-6 h-6 text-[#FF6A00]" />
          Share Room
        </h1>
        <p className="text-xs text-[#71717a]">
          Invite your classmates to collaborate. No authentication required.
        </p>
      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: QR Code Panel */}
        <div className="glass-card p-6 flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1.5 select-none">
            <span className="text-sm font-semibold text-[#f4f4f5]">
              Share This Room
            </span>
            <p className="text-xs text-[#71717a] max-w-xs">
              Scan QR code or share the link to invite others.
            </p>
          </div>

          {/* QR Component */}
          {renderNeoQR()}

          {/* PIN Copy Box */}
          <div className="flex flex-col gap-2 w-full max-w-xs select-none">
            <span className="text-[10px] uppercase text-[#71717a] tracking-wider">Room PIN</span>
            <div className="flex border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden">
              <div className="flex-1 flex items-center justify-center font-mono text-base font-bold text-[#f4f4f5] tracking-widest pl-4">
                {pin}
              </div>
              <button 
                onClick={handleCopyPin}
                className="px-4 py-2 bg-[#FFD600] text-[#050608] hover:bg-[#FFC000] font-semibold text-xs uppercase transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Badge */}
          <div className="bg-[#4F7CFF]/15 text-[#4F7CFF] border border-[#4F7CFF]/20 px-4 py-2.5 rounded-xl text-xs font-semibold w-full select-none">
            Anyone with the PIN or link can join this room.
          </div>
        </div>

        {/* Right Side: Link Input & Info */}
        <div className="flex flex-col gap-6">
          
          {/* Card 1: Link Box */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <span className="text-xs font-semibold text-[#f4f4f5] pb-2 border-b border-white/[0.06] select-none uppercase tracking-wider">
              Share Room Link
            </span>

            {/* Input & Copy */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="neo-input text-xs bg-white/[0.02] cursor-default select-all"
              />
              <Button 
                variant="yellow" 
                size="md" 
                onClick={handleCopyLink}
                className="w-full gap-1.5 shadow-[0_0_20px_rgba(255,214,0,0.15)] justify-center"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </Button>
            </div>

            {/* Social icons row */}
            <div className="flex flex-col gap-2 select-none mt-2">
              <span className="text-[10px] uppercase text-[#71717a] tracking-wider">Share via</span>
              <div className="flex gap-3">
                {/* Whatsapp */}
                <button 
                  onClick={() => handleSocialShare('WhatsApp')}
                  className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center transition-transform"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5 fill-[#22C55E]/10" />
                </button>
                {/* Telegram */}
                <button 
                  onClick={() => handleSocialShare('Telegram')}
                  className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#4F7CFF]/10 hover:bg-[#4F7CFF]/20 text-[#4F7CFF] flex items-center justify-center transition-transform"
                  title="Telegram"
                >
                  <Send className="w-5 h-5 fill-[#4F7CFF]/10" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Help details */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <span className="text-xs font-semibold text-[#f4f4f5] pb-2 border-b border-white/[0.06] select-none uppercase tracking-wider">
              Quick Guide
            </span>
            <div className="flex flex-col gap-4">
              {[
                { title: 'Peer sharing', desc: 'No login registration required for peers to connect to this room dashboard.', icon: <ArrowLeftRight className="w-4 h-4" />, accent: '#FFD600' },
                { title: 'Secure expiration', desc: 'Once countdown timer triggers self-destruct, all logs and files vanish completely.', icon: <Clock className="w-4 h-4" />, accent: '#EF4444' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3.5 items-start text-left select-none">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.accent}15`, border: `1px solid ${item.accent}25`, color: item.accent }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#f4f4f5]">{item.title}</span>
                    <p className="text-[11px] text-[#71717a]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Banner Ad */}
      <div className="w-full select-none mt-2">
        <BannerAd dark={true} className="border-white/[0.08] !max-w-full" />
      </div>
    </div>
  );
}
