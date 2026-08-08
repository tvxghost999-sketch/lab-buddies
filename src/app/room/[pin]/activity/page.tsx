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

export default function RoomActivityLog() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const activities = useRoomStore((state) => state.activities);
  const activeRoom = useRoomStore((state) => state.activeRoom);

  const [eventFilter, setEventFilter] = useState<'all' | 'joins' | 'files' | 'code' | 'controls'>('all');

  // Filter activities based on selection
  const filteredActivities = activities.filter((act) => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'joins') return act.type === 'join' || act.type === 'leave';
    if (eventFilter === 'files') return act.type === 'upload';
    if (eventFilter === 'code') return act.type === 'code_share';
    if (eventFilter === 'controls') return act.type === 'lock' || act.type === 'mute' || act.type === 'setting_change' || act.type === 'delete';
    return true;
  });

  // Resolve timeline icon design
  const getActivityDesign = (type: string) => {
    let icon = <Info className="w-4 h-4 text-neo-dark" />;
    let bgColor = 'bg-neo-blue';
    let borderStyle = 'border-neo-dark';

    switch (type) {
      case 'join':
        icon = <UserPlus className="w-4 h-4 text-neo-dark" />;
        bgColor = 'bg-neo-green';
        break;
      case 'leave':
        icon = <UserMinus className="w-4 h-4 text-white" />;
        bgColor = 'bg-neo-red';
        break;
      case 'upload':
        icon = <Upload className="w-4 h-4 text-white" />;
        bgColor = 'bg-neo-blue';
        break;
      case 'code_share':
        icon = <Code className="w-4 h-4 text-neo-dark" />;
        bgColor = 'bg-neo-yellow';
        break;
      case 'lock':
      case 'mute':
        icon = <Lock className="w-4 h-4 text-white" />;
        bgColor = 'bg-neo-red';
        break;
      case 'delete':
        icon = <Trash2 className="w-4 h-4 text-white" />;
        bgColor = 'bg-neo-red';
        break;
      case 'setting_change':
        icon = <Settings className="w-4 h-4 text-neo-dark" />;
        bgColor = 'bg-neo-orange';
        break;
      default:
        icon = <Info className="w-4 h-4 text-white" />;
        bgColor = 'bg-neo-purple';
        break;
    }

    return (
      <div className={`w-9 h-9 rounded-full ${bgColor} border-[2.5px] ${borderStyle} flex items-center justify-center flex-shrink-0 shadow-neo-sm z-10`}>
        {icon}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Room Info panel */}
      <div className="lg:col-span-3 flex flex-col gap-4 select-none">
        <Card variant="white" className="p-4 flex flex-col gap-3.5 border-[3px]">
          <span className="font-archivo text-xs uppercase tracking-wider text-neo-dark border-b-[2px] border-neo-dark pb-2">
            Room Created
          </span>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-neo-dark/85">
              <Calendar className="w-4 h-4 text-neo-orange" />
              <span>{activeRoom?.createdAt || 'May 18, 2025, 11:40 AM'}</span>
            </div>
            <p className="text-xs font-semibold text-neo-dark/65">
              Created by <strong className="text-neo-dark">{activeRoom?.createdBy || 'Aman (Host)'}</strong>. All data in this room is ephemeral and is cached in user instances only.
            </p>
          </div>
        </Card>
      </div>

      {/* Center Column: Activities Feed */}
      <div className="lg:col-span-9 flex flex-col gap-4">
        
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex flex-col gap-1">
            <h1 className="font-archivo text-2xl uppercase text-neo-dark flex items-center gap-2">
              <Activity className="w-6 h-6 text-neo-orange" />
              Room Activity
            </h1>
            <p className="text-xs font-bold text-neo-dark/70">
              Chronological log of events and updates inside this room.
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-neo-dark/60 uppercase">Filter</span>
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
                className="py-1 px-3 border-[2.5px] rounded-md font-bold text-xs"
              />
            </div>
          </div>
        </div>

        {/* Timeline Log Card */}
        <Card variant="white" className="p-6 relative">
          
          {/* Vertical Connecting Line (Timeline design) */}
          <div className="absolute left-[34px] top-8 bottom-8 w-[3px] bg-neo-dark/20 z-0" />

          {/* List items */}
          <div className="flex flex-col gap-6 relative">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center gap-2 select-none z-10 bg-white">
                <span className="text-2xl">⏳</span>
                <span className="font-archivo text-xs uppercase text-neo-dark">No events logged</span>
                <p className="text-[10px] font-bold text-neo-dark/50 max-w-xs">
                  Activities of selected type have not been recorded in this room yet.
                </p>
              </div>
            ) : (
              filteredActivities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 items-center relative z-10 group">
                  {getActivityDesign(activity.type)}

                  {/* Details box */}
                  <div className="flex-1 flex justify-between items-center gap-4 bg-cream/30 border-[2px] border-neo-dark/10 group-hover:border-neo-dark/35 rounded-lg p-3 transition-colors">
                    <span className="text-xs font-bold text-neo-dark leading-tight">
                      {activity.description}
                    </span>
                    <span className="text-[10px] text-neo-dark/40 font-black whitespace-nowrap ml-2">
                      {activity.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}
