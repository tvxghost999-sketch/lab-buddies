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


export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useRoomStore((state) => state.createRoom);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);

  const [roomName, setRoomName] = useState('lab-row-1');
  const [maxMembers, setMaxMembers] = useState(10);
  const [autoDeleteTimer, setAutoDeleteTimer] = useState('1 Hour');
  const [hostName, setHostName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const isPremium = !!(loggedInUser?.plan && loggedInUser.plan !== 'free');

  // Adjust defaults based on plan
  useEffect(() => {
    if (isPremium) {
      setMaxMembers(20);
      setAutoDeleteTimer('2 Hours');
    } else {
      setMaxMembers(10);
      setAutoDeleteTimer('1 Hour');
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
    const newPin = await createRoom(roomName, maxMembers, autoDeleteTimer, roomPassword, creatorName);
    setIsAdOpen(false);
    router.push(`/room/${newPin}`);
  };


  const maxMembersOptions = isPremium ? [
    { value: 5, label: '5 Members' },
    { value: 10, label: '10 Members' },
    { value: 20, label: '20 Members' },
    { value: 50, label: '50 Members' },
    { value: 100, label: '100 Members' },
  ] : [
    { value: 5, label: '5 Members' },
    { value: 10, label: '10 Members' },
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
    <div className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      {/* Header */}
      <header className="border-b-[3px] border-neo-dark bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:scale-95 transition-all flex items-center h-full relative z-10">
            <img src="/logo.png" alt="Lab Buddies Logo" className="h-16 sm:h-20 w-auto object-contain max-h-none scale-105 origin-left" />
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 font-archivo text-xs uppercase tracking-wider text-neo-dark px-3 py-1.5 border-[3px] border-neo-dark rounded-[8px] bg-white shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column - Form Card */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card variant="white" className="p-6 sm:p-8">
              <div className="flex flex-col gap-2 mb-6">
                <h1 className="font-archivo text-2xl sm:text-3xl uppercase text-neo-dark">
                  Create a New Room
                </h1>
                <p className="text-sm font-bold text-neo-dark/70">
                  Set up your room and start sharing with your buddies instantly.
                </p>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-5">
                {/* Host Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-neo-dark">Your Nickname</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aman, Rohit..."
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="neo-input w-full text-sm font-semibold"
                  />
                  <span className="text-[10.5px] font-bold text-neo-dark/60">Choose a name that other members will recognize.</span>
                </div>

                {/* Room Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-neo-dark">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lab-row-1"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="neo-input w-full text-sm font-semibold"
                  />
                  <span className="text-[10.5px] font-bold text-neo-dark/60">Give your room a name so others know what it's for.</span>
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
                    <span className="text-[10px] font-bold text-neo-dark/60">Maximum number of students that can join.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Select
                      label="Auto Delete Timer"
                      options={autoDeleteOptions}
                      value={autoDeleteTimer}
                      onChange={(e) => setAutoDeleteTimer(e.target.value)}
                    />
                    <span className="text-[10px] font-bold text-neo-dark/60">Room and all data will be deleted after the selected time.</span>
                  </div>
                </div>

                {/* Optional Room Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-neo-dark">Room Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="e.g. 123456 (Leave blank for no password)"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="neo-input w-full text-sm font-semibold"
                  />
                  <span className="text-[10.5px] font-bold text-neo-dark/60">If set, users will need to enter this password to join.</span>
                </div>

                <Button type="submit" variant="yellow" size="lg" className="w-full gap-2 mt-2">
                  <span>Create Room</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-neo-dark/70 mt-2">
                  <ShieldCheck className="w-4 h-4 text-neo-green fill-neo-green/10" />
                  <span>You will become the host of this room.</span>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column - FAQ Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card variant="white" className="p-6 flex flex-col gap-6 relative overflow-hidden h-full">
              {/* Heading Badge */}
              <div className="bg-neo-purple text-white px-3 py-1.5 border-[2px] border-neo-dark rounded-md self-start text-[11px] font-black uppercase tracking-wider shadow-neo-sm">
                Why Create a Room?
              </div>

              {/* Bullet list of advantages */}
              <div className="flex flex-col gap-5">
                {[
                  {
                    title: 'Become the Host',
                    desc: 'Control your room, mute members, and manage room settings.',
                    color: '#FFD600', // Yellow
                    icon: <UserCheck className="w-5 h-5 text-neo-dark" />
                  },
                  {
                    title: 'Share Instantly',
                    desc: 'Share code snippets, files, and notes in real-time with zero latency.',
                    color: '#FF6A00', // Orange
                    icon: <Zap className="w-5 h-5 text-neo-dark" />
                  },
                  {
                    title: 'No Signups Needed',
                    desc: 'Classmates can join in one click with a simple 6-digit room PIN.',
                    color: '#4F7CFF', // Blue
                    icon: <Shield className="w-5 h-5 text-white" />
                  },
                  {
                    title: 'Auto Cleanup',
                    desc: 'Data automatically self-destructs after the timer, leaving no footprint.',
                    color: '#EF4444', // Red
                    icon: <Trash2 className="w-5 h-5 text-white" />
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div 
                      className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark flex items-center justify-center flex-shrink-0 shadow-neo-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-neo-dark uppercase tracking-wider leading-none mb-1">
                        {item.title}
                      </span>
                      <p className="text-xs font-bold text-neo-dark/70">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sun star decoration */}
              <div className="absolute top-4 right-4 text-neo-yellow animate-pulse">
                <Star className="w-8 h-8 fill-neo-yellow text-neo-dark border-3" />
              </div>

              {/* Playful Illustration bottom container */}
              <div className="mt-auto pt-6 flex items-end justify-between border-t-[2.5px] border-neo-dark border-dashed">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-neo-dark/50">Room Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-neo-green animate-ping" />
                    <span className="text-[11px] font-black text-neo-dark">Ready to deploy</span>
                  </div>
                </div>
                {/* Mini illustration */}
                <div className="relative w-36 h-24 bg-neo-green/10 border-[2.5px] border-neo-dark border-dashed rounded-[10px] flex items-center justify-center font-archivo text-xs uppercase font-black text-neo-dark">
                  💬 room builder
                </div>
              </div>
            </Card>
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
