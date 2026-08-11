'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Settings, ShieldAlert, Lock, Trash2, Info, 
  Save, VolumeX, Eye, ShieldCheck, Users, HelpCircle 
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import { Switch, Select } from '@/components/ui/input';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const pin = (params?.pin as string) || '408215';

  const activeRoom = useRoomStore((state) => state.activeRoom);
  const currentUser = useRoomStore((state) => state.currentUser);
  const members = useRoomStore((state) => state.members);
  const updateRoomSettings = useRoomStore((state) => state.updateRoomSettings);
  const toggleLockRoom = useRoomStore((state) => state.toggleLockRoom);
  const toggleMuteChat = useRoomStore((state) => state.toggleMuteChat);
  const toggleFileSharing = useRoomStore((state) => state.toggleFileSharing);
  const clearFeed = useRoomStore((state) => state.clearFeed);
  const addToast = useRoomStore((state) => state.addToast);
  const showConfirm = useRoomStore((state) => state.showConfirm);

  const isHost = currentUser?.role === 'host';

  useEffect(() => {
    if (currentUser && currentUser.role !== 'host') {
      addToast('Access denied: settings can only be accessed and modified by the host.', 'error');
      router.replace(`/room/${pin}`);
    }
  }, [currentUser, pin, router, addToast]);

  const parseTimerToMinutes = (timerStr?: string) => {
    if (!timerStr) return 120;
    let total = 0;
    const h = timerStr.match(/(\d+)\s*h(?:our)?s?/i);
    if (h) total += parseInt(h[1], 10) * 60;
    const m = timerStr.match(/(\d+)\s*m(?:in(?:ute)?)?s?/i);
    if (m) total += parseInt(m[1], 10);
    if (total === 0) {
      const raw = parseInt(timerStr, 10);
      if (!isNaN(raw) && raw > 0) total = raw;
    }
    return Math.max(5, total || 120);
  };

  const formatDurationDisplay = (mins: number) => {
    if (mins < 60) return `${mins} Minutes`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
    return `${h} ${h === 1 ? 'Hour' : 'Hours'} ${m} Minutes`;
  };

  const [roomName, setRoomName] = useState(activeRoom?.name || 'lab-row-1');
  const [maxMembers, setMaxMembers] = useState(activeRoom?.maxMembers || 20);
  const [durationMinutes, setDurationMinutes] = useState(parseTimerToMinutes(activeRoom?.autoDeleteTimer));
  const [roomVisibility, setRoomVisibility] = useState(activeRoom?.roomVisibility ?? true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost) {
      addToast('Only the host can modify room settings.', 'error');
      return;
    }
    if (!roomName.trim()) {
      addToast('Room name cannot be empty.', 'error');
      return;
    }

    updateRoomSettings({
      name: roomName,
      maxMembers,
      autoDeleteTimer: formatDurationDisplay(durationMinutes),
      roomVisibility
    });
  };

  const handleClearFeed = () => {
    showConfirm(
      'Clear Feed',
      'Are you sure you want to clear the feed? All messages, files and code snippets will be deleted.',
      () => clearFeed()
    );
  };

  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const handleDeleteRoom = () => {
    showConfirm(
      'Delete Room',
      'CRITICAL WARNING: This will permanently delete the room. All shared assets will be immediately scrubbed from instances. Proceed?',
      () => {
        deleteRoom();
        router.push('/');
      }
    );
  };

  const maxMembersOptions = [
    { value: 5, label: '5 Members' },
    { value: 10, label: '10 Members' },
    { value: 15, label: '15 Members' },
    { value: 20, label: '20 Members' },
    { value: 25, label: '25 Members' },
    { value: 30, label: '30 Members' },
    { value: 40, label: '40 Members' },
    { value: 50, label: '50 Members' },
    { value: 60, label: '60 Members' },
    { value: 70, label: '70 Members' },
    { value: 80, label: '80 Members' },
    { value: 90, label: '90 Members' },
    { value: 100, label: '100 Members' },
  ];

  const autoDeleteOptions = [
    { value: '30 Minutes', label: '30 Minutes' },
    { value: '1 Hour', label: '1 Hour' },
    { value: '2 Hours', label: '2 Hours' },
    { value: '6 Hours', label: '6 Hours' },
    { value: '12 Hours', label: '12 Hours' },
    { value: '24 Hours', label: '24 Hours' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Page Title */}
      <div className="flex flex-col gap-1 select-none text-left">
        <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#FF6A00]" />
          Room Settings
        </h1>
        <p className="text-xs text-[#71717a]">
          Manage configuration parameters, control features, and secure your room.
        </p>
      </div>

      {/* Main Grid: Settings & Info columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: General Settings Form */}
        <div className="lg:col-span-7">
          <div className="glass-card p-6">
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              
              {!isHost && (
                <div className="flex items-center gap-2.5 p-3.5 border border-[#FF6A00]/20 bg-[#FF6A00]/10 text-[#FF6A00] rounded-xl text-xs font-medium mb-2 select-none text-left">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span>
                    <strong>Read-Only Mode:</strong> Only the room host can modify parameters, adjust toggles, or access danger actions.
                  </span>
                </div>
              )}

              <div className="border-b border-white/[0.06] pb-3 mb-1 select-none text-left">
                <span className="text-xs uppercase tracking-wider text-[#a1a1aa] font-medium">
                  General Details
                </span>
              </div>

              {/* Room Name Input */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Room Name</label>
                <input
                  type="text"
                  disabled={!isHost}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="neo-input text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-[#52525b]">This name is visible to all members.</span>
              </div>

              {/* Max Members and Timer selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="flex flex-col gap-1">
                  <Select
                    label="Max Members"
                    disabled={!isHost}
                    options={maxMembersOptions}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-[#52525b]">Limit member capacity.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center justify-between">
                    <span>Auto Delete Timer</span>
                    <span className="text-[#FFD600] font-bold font-mono lowercase">{formatDurationDisplay(durationMinutes)}</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!isHost || durationMinutes <= 5}
                      onClick={() => setDurationMinutes((prev) => Math.max(5, prev - 5))}
                      className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-lg font-bold text-white transition-all select-none flex-shrink-0"
                      title="Decrease by 5 minutes"
                    >
                      -
                    </button>
                    <div className="flex-1 relative flex items-center min-w-0">
                      <input
                        type="number"
                        min={5}
                        step={5}
                        disabled={!isHost}
                        value={durationMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val)) setDurationMinutes(5);
                          else setDurationMinutes(Math.max(5, val));
                        }}
                        onBlur={() => {
                          setDurationMinutes((prev) => {
                            const snapped = Math.round(prev / 5) * 5;
                            return Math.max(5, snapped);
                          });
                        }}
                        className="neo-input w-full text-center font-mono font-bold text-sm"
                        style={{ paddingLeft: '0.75rem', paddingRight: '2rem' }}
                      />
                      <span className="absolute right-2.5 text-[11px] text-[#71717a] font-medium pointer-events-none">min</span>
                    </div>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => setDurationMinutes((prev) => prev + 5)}
                      className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-lg font-bold text-white transition-all select-none flex-shrink-0"
                      title="Increase by 5 minutes"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {[5, 15, 30, 45, 60, 120, 360, 1440].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        disabled={!isHost}
                        onClick={() => setDurationMinutes(mins)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          durationMinutes === mins
                            ? 'bg-[#FFD600] text-black font-bold shadow-sm'
                            : 'bg-white/[0.04] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : mins === 1440 ? '24h' : `${mins / 60}h`}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#52525b]">Min 5 mins. Step by 5 min.</span>
                </div>
              </div>

              <div className="border-b border-white/[0.06] pb-3 mt-4 mb-1 select-none text-left">
                <span className="text-xs uppercase tracking-wider text-[#a1a1aa] font-medium">
                  Access &amp; Toggles
                </span>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-4 text-left">
                <Switch
                  label="Room Visibility (Anyone with PIN)"
                  disabled={!isHost}
                  checked={roomVisibility}
                  onCheckedChange={(val) => {
                    setRoomVisibility(val);
                    if (isHost) updateRoomSettings({ roomVisibility: val });
                  }}
                />
                
                <Switch
                  label="Lock Room (Prevent new connections)"
                  disabled={!isHost}
                  checked={activeRoom?.isLocked || false}
                  onCheckedChange={(val) => {
                    showConfirm(
                      val ? 'Lock Room' : 'Unlock Room',
                      val 
                        ? 'Are you sure you want to lock the room? New members will not be able to join.' 
                        : 'Are you sure you want to unlock the room? This will allow new members to knock and join.',
                      () => toggleLockRoom()
                    );
                  }}
                />

                <Switch
                  label="Mute Members (Disables chat Composer)"
                  disabled={!isHost}
                  checked={activeRoom?.isMuted || false}
                  onCheckedChange={(val) => {
                    showConfirm(
                      val ? 'Mute Members' : 'Unmute Members',
                      val 
                        ? 'Are you sure you want to mute all members? Nobody will be able to send messages, snippets, or files.' 
                        : 'Are you sure you want to unmute all members? This will restore their chat composer access.',
                      () => toggleMuteChat()
                    );
                  }}
                />

                <Switch
                  label="File Sharing (Allow members to upload)"
                  disabled={!isHost}
                  checked={activeRoom?.isFileSharingEnabled || false}
                  onCheckedChange={(val) => {
                    showConfirm(
                      val ? 'Enable File Sharing' : 'Disable File Sharing',
                      val 
                        ? 'Are you sure you want to enable file sharing? Members will be allowed to upload files to the room feed.' 
                        : 'Are you sure you want to disable file sharing? Members will not be allowed to upload new files.',
                      () => toggleFileSharing()
                    );
                  }}
                />
              </div>

              {/* Save Button */}
              {isHost && (
                <Button 
                  type="submit" 
                  variant="yellow" 
                  size="md" 
                  className="w-full gap-2 mt-4 uppercase text-xs shadow-[0_0_20px_rgba(255,214,0,0.15)] justify-center"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </Button>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: Danger Zone & Info Cards */}
        <div className="lg:col-span-5 flex flex-col gap-6 select-none">
          
          {/* Card 1: Danger Zone */}
          {isHost && (
            <div className="glass-card p-4 flex flex-col gap-4">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2 text-xs uppercase tracking-wider text-[#EF4444] font-medium text-left">
                <ShieldAlert className="w-4 h-4" />
                <span>Danger Zone</span>
              </div>

              <div className="flex flex-col gap-4 text-xs text-[#a1a1aa] text-left">
                {/* Clear Feed Item */}
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#f4f4f5]">Clear Feed</span>
                    <p className="text-[10px] text-[#71717a] leading-tight mt-0.5">
                      Remove all messages and files from the live feed.
                    </p>
                  </div>
                  <Button 
                    variant="white" 
                    size="sm" 
                    className="text-xs"
                    onClick={handleClearFeed}
                  >
                    Clear
                  </Button>
                </div>

                {/* Delete Room Item */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#EF4444]">Delete Room</span>
                    <p className="text-[10px] text-[#71717a] leading-tight mt-0.5">
                      This action cannot be undone. All data will be scrubbed.
                    </p>
                  </div>
                  <Button 
                    variant="red" 
                    size="sm" 
                    className="text-xs"
                    onClick={handleDeleteRoom}
                  >
                    Delete Room
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Room Information */}
          <div className="glass-card p-4 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2 text-xs uppercase tracking-wider text-[#f4f4f5] font-medium">
              <Info className="w-4 h-4 text-[#FF6A00]" />
              <span>Room Information</span>
            </div>

            <div className="flex flex-col gap-2 text-xs text-[#a1a1aa]">
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-[#71717a]">Room PIN</span>
                <span className="font-mono font-bold text-[#f4f4f5]">#{activeRoom?.pin || pin}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-[#71717a]">Created By</span>
                <span className="text-[#f4f4f5]">{activeRoom?.createdBy || 'Aman (Host)'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-[#71717a]">Created At</span>
                <span className="text-[#f4f4f5]">{activeRoom?.createdAt || 'May 18, 2025, 11:40 AM'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-[#71717a]">Members</span>
                <span className="text-[#f4f4f5]">{members.length} / {activeRoom?.maxMembers || 20}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[#71717a]">Room Status</span>
                <span className="flex items-center gap-1.5 text-[#22C55E] uppercase text-[10px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
