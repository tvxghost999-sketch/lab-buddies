'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Phone, PhoneOff, 
  ChevronDown, ChevronUp, AlertCircle, Sparkles, Volume2
} from 'lucide-react';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import Button from '@/components/ui/button';

interface VoiceRoomPanelProps {
  pin: string;
  currentUser: {
    name: string;
    role: 'host' | 'member';
  };
}

// Sub-component to mount remote audio element securely
const RemoteAudio = ({ stream, socketId }: { stream: MediaStream; socketId: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.srcObject = stream;
      // Play audio automatically
      audioEl.play().catch((err) => {
        console.warn(`[Voice UI] Auto-play failed for stream of socket ${socketId}:`, err);
      });
    }
  }, [stream, socketId]);

  return (
    <audio 
      ref={audioRef} 
      autoPlay 
      playsInline 
      className="absolute w-0 h-0 opacity-0 pointer-events-none" 
      id={`remote-audio-${socketId}`} 
    />
  );
};


export const VoiceRoomPanel: React.FC<VoiceRoomPanelProps> = ({ pin, currentUser }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const {
    isConnected,
    isConnecting,
    isMuted,
    voiceUsers,
    connectionQuality,
    errorMessage,
    remoteStreams,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute
  } = useVoiceRoom(pin, currentUser.name);

  // Auto-collapse if user leaves/disconnects, and keep open when joining
  useEffect(() => {
    if (isConnected) {
      setIsOpen(true);
    }
  }, [isConnected]);

  // Color mapping for connection quality statuses
  const getQualityBadge = () => {
    switch (connectionQuality) {
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 text-[10px] text-[#FFD600] font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
            <span>Connecting</span>
          </span>
        );
      case 'reconnecting':
        return (
          <span className="flex items-center gap-1.5 text-[10px] text-[#FF6A00] font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
            <span>Reconnecting</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-[10px] text-[#EF4444] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
            <span>Failed</span>
          </span>
        );
      case 'connected':
      default:
        return (
          <span className="flex items-center gap-1.5 text-[10px] text-[#22C55E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span>Voice Connected</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden mt-4 transition-all">
      {/* Header with expand/collapse trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors select-none text-left"
      >
        <div className="flex items-center gap-2">
          <Volume2 className={`w-4 h-4 text-[#FFD600] ${isConnected ? 'animate-pulse' : ''}`} />
          <span className="text-xs uppercase tracking-wider text-[#71717a] font-semibold">
            Audio Voice Room
          </span>
          {voiceUsers.length > 0 && (
            <span className="bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-[9.5px] font-bold px-1.5 py-0.5 rounded-full">
              {voiceUsers.length}
            </span>
          )}
        </div>
        <div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#71717a]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#71717a]" />
          )}
        </div>
      </button>

      {/* Main expandable body */}
      {isOpen && (
        <div className="p-3.5 pt-0 border-t border-white/[0.04] bg-[#0c0c0d]/60 flex flex-col gap-3">
          {/* Error display */}
          {errorMessage && (
            <div className="p-3 border border-red-500/20 bg-red-500/10 text-red-400 text-xs rounded-xl flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Connection quality banner */}
          {isConnected && (
            <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.05] py-1.5 px-3 rounded-lg">
              <span className="text-[10px] text-[#71717a] font-medium uppercase tracking-wider">Quality</span>
              {getQualityBadge()}
            </div>
          )}

          {/* Connected Participants List */}
          {voiceUsers.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {voiceUsers.map((user) => (
                <div
                  key={user.socketId}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-all ${
                    user.isSpeaking
                      ? 'bg-[#FFD600]/10 border-[#FFD600]/30 text-[#FFD600]'
                      : 'bg-white/[0.01] border-white/[0.05] text-[#a1a1aa]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Pulsing speak status ring */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {user.isSpeaking && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#FFD600]/40 animate-ping" />
                      )}
                      <span className={`w-2.5 h-2.5 rounded-full ${user.isSpeaking ? 'bg-[#FFD600]' : 'bg-[#71717a]/50'}`} />
                    </div>
                    <span className="text-xs font-medium truncate">
                      {user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {user.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-[#EF4444]" />
                    ) : (
                      <Mic className={`w-3.5 h-3.5 ${user.isSpeaking ? 'text-[#FFD600] animate-pulse' : 'text-[#71717a]'}`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : isConnected ? (
            <div className="text-center py-4 text-[11px] text-[#71717a]">
              No other buddies are here yet.
            </div>
          ) : null}

          {/* Action buttons footer */}
          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                variant="white"
                size="sm"
                className="w-full justify-center gap-2 py-2 text-xs bg-white/5 border-white/10 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600]"
                onClick={joinVoiceRoom}
                disabled={isConnecting}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Joining Room...' : 'Join Voice'}</span>
              </Button>
            ) : (
              <>
                <Button
                  variant={isMuted ? 'orange' : 'white'}
                  size="sm"
                  className={`flex-1 justify-center gap-1.5 py-2 text-xs ${
                    isMuted 
                      ? 'bg-[#FF6A00]/25 text-[#FF6A00] border-[#FF6A00]/30 hover:bg-[#FF6A00]/35' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Unmute</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Mute</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="red"
                  size="sm"
                  className="flex-1 justify-center gap-1.5 py-2 text-xs bg-[#EF4444]/15 border border-[#EF4444]/25 text-[#EF4444] hover:bg-[#EF4444]/25"
                  onClick={leaveVoiceRoom}
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Render remote peer audio elements programmatically inside React DOM */}
      {isConnected && Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
        <RemoteAudio key={socketId} socketId={socketId} stream={stream} />
      ))}
    </div>
  );
};

export default VoiceRoomPanel;
