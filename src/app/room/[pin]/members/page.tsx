'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Search, Crown, Mic, MicOff, Ban, 
  Settings, CheckCircle, ShieldAlert, Sparkles 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
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

  // Filter members by search query
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Invite link sharing helper
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
    <div className="flex flex-col gap-6">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
            <Users className="w-6 h-6 text-neo-orange" />
            Members ({members.length})
          </h1>
          <p className="text-xs font-bold text-neo-dark/70">
            List of users currently active in this room.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="white" size="sm" className="gap-1 border-[2.5px] shadow-[2px_2px_0_0_#111111]" onClick={handleInviteLink}>
            <span>Invite Link</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card variant="white" className="p-4 flex items-center justify-between shadow-neo-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-dark/50" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input !pl-10 pr-4 py-2 text-xs w-full font-semibold"
          />
        </div>
        <div className="hidden sm:block text-xs font-black text-neo-dark/60 select-none">
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </Card>

      {/* Members Directory Table Container (Desktop view) */}
      <Card variant="white" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="bg-cream border-b-[3px] border-neo-dark font-archivo text-[11px] uppercase tracking-wider text-neo-dark font-black">
                <th className="p-4">Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined At</th>
                <th className="p-4">Status</th>
                {isHost && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y-[2.5px] divide-neo-dark font-semibold text-xs text-neo-dark">
              {filteredMembers.map((member) => {
                const isMe = member.name === currentUser?.name;
                return (
                  <tr key={member._id || member.id} className="hover:bg-cream/35 transition-colors">
                    {/* User profile */}
                    <td className="p-4 flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-full border-[2.5px] border-neo-dark flex items-center justify-center font-archivo text-xs font-black uppercase"
                        style={{ 
                          backgroundColor: member.role === 'host' ? '#FFD600' : '#4F7CFF',
                          color: member.role === 'host' ? '#111111' : '#FFFFFF'
                        }}
                      >
                        {member.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black flex items-center gap-1.5">
                          {isMe ? 'You' : member.name}
                          {isMe && <span className="text-[10px] text-neo-dark/50 font-semibold uppercase">({currentUser?.role})</span>}
                        </span>
                      </div>
                    </td>

                    {/* Role tag */}
                    <td className="p-4">
                      {member.role === 'host' ? (
                        <span className="bg-neo-yellow text-neo-dark text-[9px] font-black border-[1.5px] border-neo-dark rounded px-2 py-0.5 uppercase tracking-wide inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 fill-neo-dark" />
                          Host
                        </span>
                      ) : (
                        <span className="text-neo-dark/60 uppercase text-[10px] font-black">
                          Member
                        </span>
                      )}
                    </td>

                    {/* Joined At time */}
                    <td className="p-4 text-neo-dark/60 font-medium">
                      {member.joinedAt}
                    </td>

                    {/* Online status badge */}
                    <td className="p-4">
                      <span className="bg-neo-green/10 border-[1.5px] border-neo-green text-neo-green font-archivo text-[9.5px] font-black px-2 py-0.5 rounded uppercase tracking-wide">
                        Online
                      </span>
                    </td>

                    {/* Actions (Host controls only) */}
                    {isHost && (
                      <td className="p-4 text-right">
                        {member.role === 'host' ? (
                          <span className="text-neo-dark/30 font-bold">—</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {/* Transfer Host Crown */}
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Transfer Host',
                                  `Transfer host permissions to ${member.name}? You will lose host controls.`,
                                  () => transferHost(member._id || member.id)
                                );
                              }}
                              className="p-1.5 border-[2px] border-neo-dark bg-neo-yellow hover:bg-yellow-400 text-neo-dark rounded shadow-[2px_2px_0_0_#111111] hover:-translate-y-0.5 active:translate-y-0 transition-colors"
                              title="Transfer host permissions"
                            >
                              <Crown className="w-4 h-4 fill-neo-dark" />
                            </button>

                            {/* Mute member toggle */}
                            <button
                              onClick={() => {
                                showConfirm(
                                  member.isMuted ? 'Unmute Member' : 'Mute Member',
                                  `Are you sure you want to ${member.isMuted ? 'unmute' : 'mute'} ${member.name}'s chat permissions?`,
                                  () => toggleMuteMember(member._id || member.id)
                                );
                              }}
                              className={`p-1.5 border-[2px] border-neo-dark rounded hover:bg-cream transition-colors shadow-[2px_2px_0_0_#111111] hover:-translate-y-0.5 active:translate-y-0 ${
                                member.isMuted ? 'bg-neo-red text-white' : 'bg-white text-neo-dark'
                              }`}
                              title={member.isMuted ? 'Unmute member chat' : 'Mute member chat'}
                            >
                              {member.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Ban/Kick member */}
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Remove Member',
                                  `Remove ${member.name} from this room?`,
                                  () => kickMember(member._id || member.id)
                                );
                              }}
                              className="p-1.5 border-[2px] border-neo-dark bg-neo-red hover:bg-red-600 text-white rounded shadow-[2px_2px_0_0_#111111] hover:-translate-y-0.5 active:translate-y-0 transition-colors"
                              title="Ban member"
                            >
                              <Ban className="w-4 h-4" />
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
      </Card>

      {/* Mobile Card List (shown on mobile, hidden on desktop) */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredMembers.map((member) => {
          const isMe = member.name === currentUser?.name;
          return (
            <div 
              key={member._id || member.id} 
              className="p-4 border-[2.5px] border-neo-dark bg-white rounded-[12px] flex flex-col gap-3 shadow-[2px_2px_0_0_#111111]"
            >
              {/* Member Profile Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-full border-[2.5px] border-neo-dark flex items-center justify-center font-archivo text-xs font-black uppercase flex-shrink-0"
                    style={{ 
                      backgroundColor: member.role === 'host' ? '#FFD600' : '#4F7CFF',
                      color: member.role === 'host' ? '#111111' : '#FFFFFF'
                    }}
                  >
                    {member.name[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-xs text-neo-dark flex items-center gap-1">
                      <span className="truncate">{isMe ? 'You' : member.name}</span>
                      {isMe && <span className="text-[10px] text-neo-dark/50 font-semibold uppercase flex-shrink-0">({currentUser?.role})</span>}
                    </span>
                    <span className="text-[10px] text-neo-dark/50 font-medium">Joined {member.joinedAt}</span>
                  </div>
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {member.role === 'host' ? (
                    <span className="bg-neo-yellow text-neo-dark text-[8px] font-black border-[1.5px] border-neo-dark rounded px-1.5 py-0.5 uppercase tracking-wide flex items-center gap-0.5">
                      <Crown className="w-3 h-3 fill-neo-dark" />
                      Host
                    </span>
                  ) : (
                    <span className="bg-cream/80 text-neo-dark/60 uppercase text-[9px] font-black border border-neo-dark/15 rounded px-1.5 py-0.5">
                      Member
                    </span>
                  )}
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neo-dark/10">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neo-green animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-neo-green tracking-wide">Online</span>
                </div>

                {/* Actions (Host controls only) */}
                {isHost && member.role !== 'host' && (
                  <div className="flex gap-2">
                    {/* Transfer Host Crown */}
                    <button
                      onClick={() => {
                        showConfirm(
                          'Transfer Host',
                          `Transfer host permissions to ${member.name}? You will lose host controls.`,
                          () => transferHost(member._id || member.id)
                        );
                      }}
                      className="p-1.5 border-[2px] border-neo-dark bg-neo-yellow hover:bg-yellow-400 text-neo-dark rounded shadow-[1.5px_1.5px_0_0_#111111] active:translate-y-0.5 transition-transform"
                      title="Transfer host permissions"
                    >
                      <Crown className="w-3.5 h-3.5 fill-neo-dark" />
                    </button>

                    {/* Mute member toggle */}
                    <button
                      onClick={() => {
                        showConfirm(
                          member.isMuted ? 'Unmute Member' : 'Mute Member',
                          `Are you sure you want to ${member.isMuted ? 'unmute' : 'mute'} ${member.name}'s chat permissions?`,
                          () => toggleMuteMember(member._id || member.id)
                        );
                      }}
                      className={`p-1.5 border-[2px] border-neo-dark rounded transition-colors shadow-[1.5px_1.5px_0_0_#111111] active:translate-y-0.5 ${
                        member.isMuted ? 'bg-neo-red text-white' : 'bg-white text-neo-dark'
                      }`}
                      title={member.isMuted ? 'Unmute member chat' : 'Mute member chat'}
                    >
                      {member.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>

                    {/* Ban/Kick member */}
                    <button
                      onClick={() => {
                        showConfirm(
                          'Remove Member',
                          `Remove ${member.name} from this room?`,
                          () => kickMember(member._id || member.id)
                        );
                      }}
                      className="p-1.5 border-[2px] border-neo-dark bg-neo-red hover:bg-red-600 text-white rounded shadow-[1.5px_1.5px_0_0_#111111] active:translate-y-0.5 transition-transform"
                      title="Ban member"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Notice Panel */}
      {isHost && (
        <Card variant="cream" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none border-dashed">
          <div className="flex items-center gap-2.5 text-xs text-neo-dark">
            <Crown className="w-5 h-5 text-neo-yellow fill-neo-yellow/30" />
            <span className="font-bold">
              <strong>You are the host:</strong> You can mute chatter, delete files, lock access or scrub feed history.
            </span>
          </div>
          <Button 
            variant="dark" 
            size="sm" 
            className="border-[2px] text-xs font-archivo gap-1"
            onClick={() => router.push(`/room/${pin}/settings`)}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Room</span>
          </Button>
        </Card>
      )}

    </div>
  );
}
