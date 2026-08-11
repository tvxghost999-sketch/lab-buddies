'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Activity, ArrowLeftRight, UserPlus, UserMinus, 
  Upload, Code, Lock, VolumeX, ShieldAlert, Sparkles, 
  Settings, Info, Trash2, Calendar
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import Card from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import BannerAd from '@/components/BannerAd';

export default function RoomActivityLog() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const activities = useRoomStore((state) => state.activities);
  const activeRoom = useRoomStore((state) => state.activeRoom);

  const [eventFilter, setEventFilter] = useState<'all' | 'joins' | 'files' | 'code' | 'controls'>('all');

  const filteredActivities = activities.filter((act) => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'joins') return act.type === 'join' || act.type === 'leave';
    if (eventFilter === 'files') return act.type === 'upload';
    if (eventFilter === 'code') return act.type === 'code_share';
    if (eventFilter === 'controls') return act.type === 'lock' || act.type === 'mute' || act.type === 'setting_change' || act.type === 'delete';
    return true;
  });

  const getActivityDesign = (type: string) => {
    let icon = <Info className="w-4 h-4 text-[#050608]" />;
    let accent = '#FFD600';

    switch (type) {
      case 'join':
        icon = <UserPlus className="w-4 h-4 text-[#050608]" />;
        accent = '#22C55E';
        break;
      case 'leave':
        icon = <UserMinus className="w-4 h-4 text-white" />;
        accent = '#EF4444';
        break;
      case 'upload':
        icon = <Upload className="w-4 h-4 text-white" />;
        accent = '#4F7CFF';
        break;
      case 'code_share':
        icon = <Code className="w-4 h-4 text-[#050608]" />;
        accent = '#FFD600';
        break;
      case 'lock':
      case 'mute':
        icon = <Lock className="w-4 h-4 text-white" />;
        accent = '#EF4444';
        break;
      case 'delete':
        icon = <Trash2 className="w-4 h-4 text-white" />;
        accent = '#EF4444';
        break;
      case 'setting_change':
        icon = <Settings className="w-4 h-4 text-[#050608]" />;
        accent = '#FF6A00';
        break;
      default:
        icon = <Info className="w-4 h-4 text-white" />;
        accent = '#8B5CF6';
        break;
    }

    return (
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border shadow-md"
        style={{ backgroundColor: accent, color: '#050608', borderColor: `${accent}20` }}
      >
        {icon}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start p-4 md:p-0">
      
      {/* Left Column: Room Info panel */}
      <div className="lg:col-span-3 flex flex-col gap-4 select-none">
        <div className="glass-card p-4 flex flex-col gap-3.5">
          <span className="text-xs uppercase tracking-wider text-[#a1a1aa] border-b border-white/[0.06] pb-2 font-medium">
            Room Created
          </span>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f4f4f5]">
              <Calendar className="w-4 h-4 text-[#FF6A00]" />
              <span>{activeRoom?.createdAt || 'May 18, 2025, 11:40 AM'}</span>
            </div>
            <p className="text-xs text-[#71717a] leading-relaxed">
              Created by <strong className="text-[#f4f4f5] font-semibold">{activeRoom?.createdBy || 'Aman (Host)'}</strong>. All data in this room is ephemeral and is cached in user instances only.
            </p>
          </div>
        </div>
      </div>

      {/* Center Column: Activities Feed */}
      <div className="lg:col-span-9 flex flex-col gap-4">
        
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#FF6A00]" />
              Room Activity
            </h1>
            <p className="text-xs text-[#71717a]">
              Chronological log of events and updates inside this room.
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[#71717a] uppercase">Filter</span>
            <div className="w-44">
              <Select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'All Events' },
                  { value: 'joins', label: 'Joins / Leaves' },
                  { value: 'files', label: 'File Uploads' },
                  { value: 'code', label: 'Code Shares' },
                  { value: 'controls', label: 'Room Controls' }
                ]}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Banner Ad */}
        <div className="w-full select-none">
          <BannerAd dark={true} className="border-white/[0.08] !max-w-full" />
        </div>

        {/* Timeline Log Card */}
        <div className="glass-card p-6 relative">
          
          {/* Vertical Connecting Line (Timeline design) */}
          <div className="absolute left-[34px] top-8 bottom-8 w-[2px] bg-white/[0.08] z-0" />

          {/* List items */}
          <div className="flex flex-col gap-6 relative">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center gap-2 select-none z-10">
                <span className="text-2xl">⏳</span>
                <span className="text-xs uppercase text-[#a1a1aa] font-semibold">No events logged</span>
                <p className="text-xs text-[#71717a] max-w-xs">
                  No activity actions matching this event query have been captured in this room.
                </p>
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div key={act._id || act.id} className="flex gap-4 items-center z-10 text-left">
                  {getActivityDesign(act.type)}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-[#f4f4f5] leading-normal">
                      {act.description}
                    </span>
                    <span className="text-[10px] text-[#71717a]">{act.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
