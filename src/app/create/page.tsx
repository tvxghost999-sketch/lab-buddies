'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Shield, ShieldCheck, ArrowRight, UserCheck, ZapOff, Trash2, ArrowLeft, Star } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { useRoomStore } from '@/store/roomStore';
import AdInterstitial from '@/components/AdInterstitial';
import Image from 'next/image';


export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useRoomStore((state) => state.createRoom);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);

  const [roomName, setRoomName] = useState('lab-row-1');
  const [maxMembers, setMaxMembers] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [hostName, setHostName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const formatDurationDisplay = (mins: number) => {
    if (mins < 60) return `${mins} Minutes`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
    return `${h} ${h === 1 ? 'Hour' : 'Hours'} ${m} Minutes`;
  };

  const isPremium = !!(loggedInUser?.plan && loggedInUser.plan !== 'free');

  // Adjust defaults based on plan
  useEffect(() => {
    if (isPremium) {
      setMaxMembers(20);
      setDurationMinutes(120);
    } else {
      setMaxMembers(10);
      setDurationMinutes(60);
    }
  }, [isPremium]);

  // Autofill nickname if user is logged in
  useEffect(() => {
    if (loggedInUser?.name) {
      setHostName(loggedInUser.name);
    }
  }, [loggedInUser]);

  const [isAdOpen, setIsAdOpen] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    if (!isPremium) {
      setIsAdOpen(true);
    } else {
      proceedWithCreation();
    }
  };

  const proceedWithCreation = async () => {
    const creatorName = hostName.trim() || 'Aman';
    const autoDeleteTimer = formatDurationDisplay(durationMinutes);
    const newPin = await createRoom(roomName, maxMembers, autoDeleteTimer, roomPassword, creatorName);
    setIsAdOpen(false);
    router.push(`/room/${newPin}`);
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

  const autoDeleteOptions = isPremium ? [
    { value: '30 Minutes', label: '30 Minutes' },
    { value: '1 Hour', label: '1 Hour' },
    { value: '2 Hours', label: '2 Hours' },
    { value: '6 Hours', label: '6 Hours' },
    { value: '12 Hours', label: '12 Hours' },
    { value: '24 Hours', label: '24 Hours' },
  ] : [
    { value: '30 Minutes', label: '30 Minutes' },
    { value: '1 Hour', label: '1 Hour' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center h-full relative z-10">
            <Image src="/logo.png?v=5" alt="Lab Buddies Logo" width={150} height={48} className="h-12 sm:h-14 w-auto object-contain my-auto" />
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-[#a1a1aa] hover:text-[#f4f4f5] px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column - Form Card */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#f4f4f5]">
                  Create a New Room
                </h1>
                <p className="text-sm text-[#71717a]">
                  Set up your room and start sharing with your buddies instantly.
                </p>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-5">
                {/* Host Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Your Nickname</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aman, Rohit..."
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="neo-input w-full text-sm"
                  />
                  <span className="text-[10.5px] text-[#52525b]">Choose a name that other members will recognize.</span>
                </div>

                {/* Room Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lab-row-1"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="neo-input w-full text-sm"
                  />
                  <span className="text-[10.5px] text-[#52525b]">Give your room a name so others know what it&apos;s for.</span>
                </div>

                {/* Grid Inputs: Max Members & Timer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Select
                      label="Max Members"
                      options={maxMembersOptions}
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(Number(e.target.value))}
                    />
                    <span className="text-[10px] text-[#52525b]">Maximum number of students that can join.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center justify-between">
                      <span>Auto Delete Timer</span>
                      <span className="text-[#FFD600] font-bold font-mono lowercase">{formatDurationDisplay(durationMinutes)}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDurationMinutes((prev) => Math.max(5, prev - 5))}
                        disabled={durationMinutes <= 5}
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
                        onClick={() => setDurationMinutes((prev) => prev + 5)}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] active:scale-95 flex items-center justify-center text-lg font-bold text-white transition-all select-none flex-shrink-0"
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

                {/* Optional Room Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Room Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="e.g. 123456 (Leave blank for no password)"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="neo-input w-full text-sm"
                  />
                  <span className="text-[10.5px] text-[#52525b]">If set, users will need to enter this password to join.</span>
                </div>

                <Button type="submit" variant="yellow" size="lg" className="w-full gap-2 mt-2 shadow-[0_0_20px_rgba(255,214,0,0.2)]">
                  <span>Create Room</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[#71717a] mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>You will become the host of this room.</span>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - FAQ Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-card p-6 flex flex-col gap-6 relative overflow-hidden h-full">
              {/* Heading Badge */}
              <div className="bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 px-3 py-1.5 rounded-full self-start text-xs font-medium">
                Why Create a Room?
              </div>

              {/* Bullet list */}
              <div className="flex flex-col gap-5">
                {[
                  { title: 'Become the Host', desc: 'Control your room, mute members, and manage room settings.', color: '#FFD600', icon: <UserCheck className="w-4 h-4" /> },
                  { title: 'Share Instantly', desc: 'Share code snippets, files, and notes in real-time with zero latency.', color: '#FF6A00', icon: <Zap className="w-4 h-4" /> },
                  { title: 'No Signups Needed', desc: 'Classmates can join in one click with a simple 6-digit room PIN.', color: '#4F7CFF', icon: <Shield className="w-4 h-4" /> },
                  { title: 'Auto Cleanup', desc: 'Data automatically self-destructs after the timer, leaving no footprint.', color: '#EF4444', icon: <Trash2 className="w-4 h-4" /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15`, border: `1px solid ${item.color}25`, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#f4f4f5] mb-0.5">{item.title}</span>
                      <p className="text-xs text-[#71717a]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom status */}
              <div className="mt-auto pt-5 flex items-end justify-between border-t border-white/[0.06]">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-[#52525b] tracking-wider">Room Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                    <span className="text-xs text-[#22C55E]">Ready to deploy</span>
                  </div>
                </div>
                <div className="relative w-36 h-16 bg-white/[0.03] border border-white/[0.06] border-dashed rounded-xl flex items-center justify-center text-xs text-[#52525b]">
                  💬 room builder
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <AdInterstitial
        isOpen={isAdOpen}
        onComplete={proceedWithCreation}
        onClose={() => setIsAdOpen(false)}
        actionLabel="Creating Room"
      />
    </div>
  );
}
