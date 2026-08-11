'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Phone, PhoneOff, 
  ChevronDown, ChevronUp, AlertCircle, Volume2, VolumeX,
  Radio
} from 'lucide-react';
import { useVoiceRoom, useVoiceListener } from '@/hooks/useVoiceRoom';
import Button from '@/components/ui/button';

interface VoiceRoomPanelProps {
  pin: string;
  currentUser: {
    name: string;
    role: 'host' | 'member';
  };
}

// ─── Sub-component: mounts a single <audio> element for a remote stream ──────
const RemoteAudio = ({
  stream,
  socketId,
  muted,
}: {
  stream: MediaStream;
  socketId: string;
  muted: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.srcObject = stream;
      audioEl.muted = muted;
      audioEl.play().catch((err) => {
        console.warn(`[Voice UI] Auto-play blocked for ${socketId}:`, err);
      });
    }
  }, [stream, socketId]);

  // Sync mute changes without recreating the element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

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

// ─── Main panel ───────────────────────────────────────────────────────────────
export const VoiceRoomPanel: React.FC<VoiceRoomPanelProps> = ({ pin, currentUser }) => {
  const [isOpen, setIsOpen] = useState(true);

  // ── Active participant hook (joined voice) ────────────────────────────────
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
    toggleMute,
  } = useVoiceRoom(pin, currentUser.name);

  // ── Passive listener hook (not joined, but still hears speakers) ──────────
  // Only active when the user hasn't joined voice themselves.
  const {
    activeSpeakers,
    listenerStreams,
    isRoomMuted,
    toggleRoomMute,
  } = useVoiceListener(pin);

  // Auto-expand when voice becomes active
  useEffect(() => {
    if (isConnected || activeSpeakers.length > 0) {
      setIsOpen(true);
    }
  }, [isConnected, activeSpeakers.length]);

  // ── Connection quality badge ──────────────────────────────────────────────
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
      default:
        return (
          <span className="flex items-center gap-1.5 text-[10px] text-[#22C55E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span>Voice Connected</span>
          </span>
        );
    }
  };

  // ── Participants to display ────────────────────────────────────────────────
  // When joined: show voiceUsers from the active hook
  // When not joined: show activeSpeakers from the listener hook
  const displayUsers = isConnected ? voiceUsers : activeSpeakers;

  // ── Muted speaker notification when not joined ────────────────────────────
  const hasSpeakers = activeSpeakers.length > 0;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden mt-4 transition-all">

      {/* Header — div instead of button to avoid nested <button> hydration error */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors select-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Volume2
            className={`w-4 h-4 ${
              isConnected ? 'text-[#22C55E] animate-pulse' :
              hasSpeakers  ? 'text-[#FFD600] animate-pulse' :
              'text-[#FFD600]'
            }`}
          />
          <span className="text-xs uppercase tracking-wider text-[#71717a] font-semibold">
            Audio Voice Room
          </span>

          {/* Live badge — shown to non-joined members when someone is speaking */}
          {!isConnected && hasSpeakers && (
            <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
          )}

          {/* Participant count */}
          {displayUsers.length > 0 && (
            <span className="bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600] text-[9.5px] font-bold px-1.5 py-0.5 rounded-full">
              {displayUsers.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Room mute toggle — only for passive listeners when speakers exist */}
          {!isConnected && hasSpeakers && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleRoomMute(); }}
              className={`p-1.5 rounded-lg border transition-colors ${
                isRoomMuted
                  ? 'bg-red-500/15 border-red-500/25 text-red-400'
                  : 'bg-white/[0.04] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5]'
              }`}
              title={isRoomMuted ? 'Unmute room audio' : 'Mute room audio'}
            >
              {isRoomMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#71717a]" /> : <ChevronDown className="w-4 h-4 text-[#71717a]" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-3.5 pt-0 border-t border-white/[0.04] bg-[#0c0c0d]/60 flex flex-col gap-3">

          {/* Error */}
          {errorMessage && (
            <div className="p-3 border border-red-500/20 bg-red-500/10 text-red-400 text-xs rounded-xl flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* "You're listening" banner — shown to passive listeners when speakers are present */}
          {!isConnected && hasSpeakers && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] font-medium ${
              isRoomMuted
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className="flex items-center gap-1.5">
                {isRoomMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
                {isRoomMuted ? 'Room audio muted' : `Listening to ${activeSpeakers.length} speaker${activeSpeakers.length > 1 ? 's' : ''}`}
              </span>
              <button
                onClick={toggleRoomMute}
                className="text-[10px] underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                {isRoomMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          )}

          {/* Connection quality (only for joined users) */}
          {isConnected && (
            <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.05] py-1.5 px-3 rounded-lg">
              <span className="text-[10px] text-[#71717a] font-medium uppercase tracking-wider">Quality</span>
              {getQualityBadge()}
            </div>
          )}

          {/* Participants list */}
          {displayUsers.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {displayUsers.map((user) => (
                <div
                  key={user.socketId}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-all ${
                    user.isSpeaking
                      ? 'bg-[#FFD600]/10 border-[#FFD600]/30 text-[#FFD600]'
                      : 'bg-white/[0.01] border-white/[0.05] text-[#a1a1aa]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {user.isSpeaking && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#FFD600]/40 animate-ping" />
                      )}
                      <span className={`w-2.5 h-2.5 rounded-full ${user.isSpeaking ? 'bg-[#FFD600]' : 'bg-[#71717a]/50'}`} />
                    </div>
                    <span className="text-xs font-medium truncate">{user.name}</span>
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
          ) : (
            <div className="text-center py-4 text-[11px] text-[#71717a]">
              No one is in voice right now.
            </div>
          )}

          {/* Action buttons */}
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
                <span>{isConnecting ? 'Joining...' : 'Join Voice'}</span>
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
                  {isMuted ? <><MicOff className="w-3.5 h-3.5" /><span>Unmute</span></> : <><Mic className="w-3.5 h-3.5" /><span>Mute</span></>}
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

      {/* ── Audio elements for JOINED participants (active hook) ── */}
      {isConnected &&
        Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
          <RemoteAudio key={`active-${socketId}`} socketId={socketId} stream={stream} muted={false} />
        ))}

      {/* ── Audio elements for PASSIVE LISTENERS (listener hook) ── */}
      {!isConnected &&
        Array.from(listenerStreams.entries()).map(([socketId, stream]) => (
          <RemoteAudio key={`listener-${socketId}`} socketId={socketId} stream={stream} muted={isRoomMuted} />
        ))}
    </div>
  );
};

export default VoiceRoomPanel;
