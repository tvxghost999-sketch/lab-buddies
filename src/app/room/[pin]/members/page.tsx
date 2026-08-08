'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Search, Crown, Mic, MicOff, Ban, 
  Settings, CheckCircle, ShieldAlert, Sparkles 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Button from '@/components/ui/button';

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const pin = (params?.pin as string) || '408215';

  const members = useRoomStore((state) => state.members);
  const currentUser = useRoomStore((state) => state.currentUser);
  const toggleMuteMember = useRoomStore((state) => state.toggleMuteMember);
  const kickMember = useRoomStore((state) => state.kickMember);
  const transferHost = useRoomStore((state) => state.transferHost);
  const addToast = useRoomStore((state) => state.addToast);
  const showConfirm = useRoomStore((state) => state.showConfirm);

  const [searchQuery, setSearchQuery] = useState('');

  const isHost = currentUser?.role === 'host';

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteLink = async () => {
    const url = `${window.location.origin}/room/${pin}`;
    const shareData = {
      title: 'Lab Buddies Room Invitation',
      text: `Join my real-time collaboration room on Lab Buddies! PIN: ${pin}`,
      url: url
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        addToast('Shared room link successfully!', 'success');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          addToast('Room invite link copied to clipboard!', 'success');
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      addToast('Room invite link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#FF6A00]" />
            Members ({members.length})
          </h1>
          <p className="text-xs text-[#71717a]">
            List of users currently active in this room.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="white" size="sm" className="gap-1" onClick={handleInviteLink}>
            <span>Invite Link</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 flex items-center justify-between bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <div className="relative w-full sm:w-80 flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input has-icon-left pr-4 py-2 text-sm w-full"
          />
        </div>
        <div className="hidden sm:block text-xs text-[#71717a] select-none">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>

      {/* Members Directory Table Container (Desktop view) */}
      <div className="hidden md:block overflow-hidden border border-white/[0.08] bg-[#0f0f10] rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-[#a1a1aa]">
                <th className="p-4">Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined At</th>
                <th className="p-4">Status</th>
                {isHost && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs text-[#a1a1aa]">
              {filteredMembers.map((member) => {
                const isMe = member.name === currentUser?.name;
                return (
                  <tr key={member._id || member.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User profile */}
                    <td className="p-4 flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold uppercase"
                        style={{ 
                          backgroundColor: member.role === 'host' ? 'rgba(255,214,0,0.15)' : 'rgba(79,124,255,0.15)',
                          color: member.role === 'host' ? '#FFD600' : '#4F7CFF'
                        }}
                      >
                        {member.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                          {isMe ? 'You' : member.name}
                          {isMe && <span className="text-[10px] text-[#71717a] font-normal uppercase">({currentUser?.role})</span>}
                        </span>
                      </div>
                    </td>

                    {/* Role tag */}
                    <td className="p-4">
                      {member.role === 'host' ? (
                        <span className="bg-[#FFD600]/15 text-[#FFD600] text-[9px] font-semibold border border-[#FFD600]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 fill-[#FFD600]/10" />
                          Host
                        </span>
                      ) : (
                        <span className="text-[#71717a] uppercase text-[10px] font-semibold">
                          Member
                        </span>
                      )}
                    </td>

                    {/* Joined At */}
                    <td className="p-4 font-mono text-[10px] text-[#71717a]">
                      {member.joinedAt || '12:00 PM'}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {member.isMuted ? (
                        <span className="bg-[#EF4444]/15 text-[#EF4444] text-[9px] font-semibold border border-[#EF4444]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                          <MicOff className="w-3 h-3" />
                          Muted
                        </span>
                      ) : (
                        <span className="bg-[#22C55E]/15 text-[#22C55E] text-[9px] font-semibold border border-[#22C55E]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Action Panel */}
                    {isHost && (
                      <td className="p-4 text-right">
                        {isMe ? (
                          <span className="text-[10px] text-[#52525b] uppercase font-bold pr-2">host avatar</span>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                showConfirm(
                                  member.isMuted ? 'Unmute Member' : 'Mute Member',
                                  `Are you sure you want to ${member.isMuted ? 'unmute' : 'mute'} ${member.name}?`,
                                  () => toggleMuteMember(member._id || member.id)
                                );
                              }}
                              className={`p-1.5 border rounded-xl transition-all active:scale-95 ${
                                member.isMuted 
                                  ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/20' 
                                  : 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20'
                              }`}
                              title={member.isMuted ? 'Unmute Member' : 'Mute Member'}
                            >
                              {member.isMuted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => {
                                showConfirm(
                                  'Transfer Host',
                                  `Are you sure you want to transfer host permissions to ${member.name}? This action cannot be undone.`,
                                  () => transferHost(member._id || member.id)
                                );
                              }}
                              className="p-1.5 border border-white/[0.1] bg-white/5 hover:bg-[#FFD600]/15 hover:border-[#FFD600]/30 hover:text-[#FFD600] rounded-xl text-[#a1a1aa] transition-all active:scale-95"
                              title="Transfer Host Permissions"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                showConfirm(
                                  'Kick Member',
                                  `Are you sure you want to kick ${member.name} out of this study room?`,
                                  () => kickMember(member._id || member.id)
                                );
                              }}
                              className="p-1.5 border border-[#EF4444]/20 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-xl transition-all active:scale-95"
                              title="Kick Member"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards list representation (Mobile view) */}
      <div className="flex flex-col gap-4 md:hidden">
        {filteredMembers.map((member) => {
          const isMe = member.name === currentUser?.name;
          return (
            <div 
              key={member._id || member.id}
              className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl p-4 flex flex-col gap-4"
            >
              {/* Member Card Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold uppercase"
                    style={{ 
                      backgroundColor: member.role === 'host' ? 'rgba(255,214,0,0.15)' : 'rgba(79,124,255,0.15)',
                      color: member.role === 'host' ? '#FFD600' : '#4F7CFF'
                    }}
                  >
                    {member.name[0]}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                      {isMe ? 'You' : member.name}
                    </span>
                    <span className="text-[10px] text-[#71717a] font-normal uppercase">
                      Role: {member.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role === 'host' && (
                    <span className="bg-[#FFD600]/15 text-[#FFD600] text-[9px] font-semibold border border-[#FFD600]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 fill-[#FFD600]/10" />
                      Host
                    </span>
                  )}
                  {member.isMuted ? (
                    <span className="bg-[#EF4444]/15 text-[#EF4444] text-[9px] font-semibold border border-[#EF4444]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                      <MicOff className="w-3 h-3" />
                      Muted
                    </span>
                  ) : (
                    <span className="bg-[#22C55E]/15 text-[#22C55E] text-[9px] font-semibold border border-[#22C55E]/25 rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Joined At timestamp */}
              <div className="flex justify-between items-center text-xs text-[#71717a] select-none text-left">
                <span>Joined At</span>
                <span className="font-mono text-[#a1a1aa]">{member.joinedAt || '12:00 PM'}</span>
              </div>

              {/* Host actions mobile controls */}
              {isHost && !isMe && (
                <div className="flex gap-2 border-t border-white/[0.06] pt-3.5 mt-0.5 justify-end">
                  <Button
                    variant="white"
                    size="sm"
                    onClick={() => {
                      showConfirm(
                        member.isMuted ? 'Unmute Member' : 'Mute Member',
                        `Are you sure you want to ${member.isMuted ? 'unmute' : 'mute'} ${member.name}?`,
                        () => toggleMuteMember(member._id || member.id)
                      );
                    }}
                    className="flex-1 py-2 text-xs font-semibold justify-center"
                  >
                    {member.isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={() => {
                      showConfirm(
                        'Transfer Host',
                        `Are you sure you want to transfer host permissions to ${member.name}? This action cannot be undone.`,
                        () => transferHost(member._id || member.id)
                      );
                    }}
                    className="flex-1 py-2 text-xs font-semibold justify-center"
                  >
                    Make Host
                  </Button>
                  <Button
                    variant="red"
                    size="sm"
                    onClick={() => {
                      showConfirm(
                        'Kick Member',
                        `Are you sure you want to kick ${member.name} out of this study room?`,
                        () => kickMember(member._id || member.id)
                      );
                    }}
                    className="flex-1 py-2 text-xs font-semibold justify-center"
                  >
                    Kick
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
