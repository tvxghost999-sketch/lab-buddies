'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
  Calendar, Clock, CheckCircle, Plus, Users, 
  Download, Play, Square, AlertCircle, ShieldCheck, X, Settings2
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

export default function LabAttendancePage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const currentUser = useRoomStore((state) => state.currentUser);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);
  const addFeedItem = useRoomStore((state) => state.addFeedItem);
  const addToast = useRoomStore((state) => state.addToast);

  const isHost = currentUser?.role === 'host';
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const [sessionTitle, setSessionTitle] = useState('');
  const [minMinutesInput, setMinMinutesInput] = useState('10');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [rollInput, setRollInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live seconds dictionary synced over websockets
  const [realTimeSeconds, setRealTimeSeconds] = useState<Record<string, number>>({});

  // Socket listener for real-time student active timers
  useEffect(() => {
    socketService.onAttendanceHeartbeatReceived(({ rollNumber, activeSeconds }) => {
      setRealTimeSeconds(prev => ({
        ...prev,
        [rollNumber]: activeSeconds
      }));
    });
  }, [pin]);

  // Pre-fill inputs from storage/Zustand on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('attendance_name') || '';
      const storedRoll = localStorage.getItem('attendance_roll') || '';

      const nameVal = storedName || loggedInUser?.name || currentUser?.name || '';
      const rollVal = storedRoll || loggedInUser?.rollNumber || '';

      setNameInput(nameVal);
      setRollInput(rollVal);
    }
  }, [loggedInUser, currentUser, isCheckInModalOpen]);

  // Compile active and past sessions from feed items
  const { activeSession, pastSessions, checkinsMap, minMinutesRules, overridesMap } = useMemo(() => {
    const sessionsList: { id: string; name: string; creatorName: string; timestamp: string; active: boolean }[] = [];
    const checkins: Record<string, { name: string; rollNumber: string; role: string; timestamp: string; initialSeconds: number }[]> = {};
    const closedSessions = new Set<string>();
    
    // session_id -> minMinutes (default to 10 if not set)
    const rules: Record<string, number> = {};
    // session_id -> rollNumber -> 'present' | 'absent' | 'auto'
    const overrides: Record<string, Record<string, 'present' | 'absent' | 'auto'>> = {};

    // Process feed items chronologically
    const sortedFeed = [...feedItems].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    sortedFeed.forEach(item => {
      const content = item.content || '';
      
      if (content.startsWith('__attendance_start__')) {
        const parts = content.split('__');
        const name = parts[2] || 'Lab Session';
        const id = parts[3] || item._id || item.id || '';
        sessionsList.push({
          id,
          name,
          creatorName: item.senderName || 'Host',
          timestamp: item.timestamp || 'Just now',
          active: true
        });
      } else if (content.startsWith('__attendance_end__')) {
        const parts = content.split('__');
        const id = parts[2];
        if (id) {
          closedSessions.add(id);
        }
      } else if (content.startsWith('__attendance_rules__')) {
        const parts = content.split('__');
        const sessionId = parts[2];
        const minMins = parseInt(parts[3] || '10', 10);
        if (sessionId) {
          rules[sessionId] = minMins;
        }
      } else if (content.startsWith('__attendance_override__')) {
        const parts = content.split('__');
        const sessionId = parts[2];
        const roll = parts[3];
        const status = parts[4] as 'present' | 'absent' | 'auto';
        if (sessionId && roll && status) {
          if (!overrides[sessionId]) overrides[sessionId] = {};
          overrides[sessionId][roll] = status;
        }
      } else if (content.startsWith('__attendance_checkin__')) {
        const parts = content.split('__');
        const sessionId = parts[2];
        const enteredName = parts[3] || item.senderName || 'Anonymous';
        const enteredRoll = parts[4] || 'N/A';
        const initialSec = parseInt(parts[5] || '0', 10);
        
        if (sessionId) {
          if (!checkins[sessionId]) checkins[sessionId] = [];
          
          const alreadyCheckedIn = checkins[sessionId].some(c => c.rollNumber === enteredRoll);
          if (!alreadyCheckedIn) {
            checkins[sessionId].push({
              name: enteredName,
              rollNumber: enteredRoll,
              role: item.senderRole || 'member',
              timestamp: item.timestamp || 'Just now',
              initialSeconds: initialSec
            });
          }
        }
      }
    });

    sessionsList.forEach(s => {
      if (closedSessions.has(s.id)) {
        s.active = false;
      }
    });

    const active = sessionsList.find(s => s.active) || null;
    const past = sessionsList.filter(s => !s.active).reverse();

    return {
      activeSession: active,
      pastSessions: past,
      checkinsMap: checkins,
      minMinutesRules: rules,
      overridesMap: overrides
    };
  }, [feedItems]);

  const activeMinMinutes = useMemo(() => {
    if (!activeSession) return 10;
    return minMinutesRules[activeSession.id] !== undefined ? minMinutesRules[activeSession.id] : 10;
  }, [activeSession, minMinutesRules]);

  // Sync inputs on rule change
  useEffect(() => {
    if (activeSession) {
      setMinMinutesInput(activeMinMinutes.toString());
    }
  }, [activeMinMinutes, activeSession]);

  const activeCheckins = useMemo(() => {
    if (!activeSession) return [];
    return checkinsMap[activeSession.id] || [];
  }, [activeSession, checkinsMap]);

  const filteredCheckins = useMemo(() => {
    if (isHost) return activeCheckins;

    const storedName = typeof window !== 'undefined' ? localStorage.getItem('attendance_name') : '';
    const storedRoll = typeof window !== 'undefined' ? localStorage.getItem('attendance_roll') : '';
    const matchName = storedName || currentUser?.name;
    const matchRoll = storedRoll || loggedInUser?.rollNumber;

    return activeCheckins.filter(
      c => c.name === matchName || (matchRoll && c.rollNumber === matchRoll)
    );
  }, [activeCheckins, isHost, currentUser, loggedInUser]);

  const isAlreadyCheckedIn = useMemo(() => {
    if (!activeSession || !currentUser) return false;
    const list = checkinsMap[activeSession.id] || [];
    
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('attendance_name') : '';
    const storedRoll = typeof window !== 'undefined' ? localStorage.getItem('attendance_roll') : '';
    const matchName = storedName || currentUser.name;
    const matchRoll = storedRoll || loggedInUser?.rollNumber;

    return list.some(c => c.name === matchName || (matchRoll && c.rollNumber === matchRoll));
  }, [activeSession, checkinsMap, currentUser, loggedInUser]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost) return;
    if (!sessionTitle.trim()) {
      addToast('Please enter a session title.', 'warning');
      return;
    }
    if (activeSession) {
      addToast('An attendance session is already active.', 'error');
      return;
    }

    const sessionId = `session-${Date.now()}`;
    addFeedItem({
      type: 'message',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: `__attendance_start__${sessionTitle.trim()}__${sessionId}`,
    });
    setSessionTitle('');
    addToast('Lab attendance session started!', 'success');
  };

  const handleEndSession = () => {
    if (!isHost || !activeSession) return;

    addFeedItem({
      type: 'message',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: `__attendance_end__${activeSession.id}`,
    });
    addToast('Lab attendance session closed.', 'info');
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !currentUser) return;

    if (!nameInput.trim()) {
      addToast('Please enter your full name.', 'warning');
      return;
    }
    if (!rollInput.trim()) {
      addToast('Please enter your Roll Number.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = nameInput.trim();
      const finalRoll = rollInput.trim();

      if (typeof window !== 'undefined') {
        localStorage.setItem('attendance_name', finalName);
        localStorage.setItem('attendance_roll', finalRoll);
      }

      const tempKey = `temp_active_time_${pin}`;
      const tempTime = typeof window !== 'undefined' ? parseInt(localStorage.getItem(tempKey) || '0', 10) : 0;

      // Sync user profile if logged in
      if (loggedInUser) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/update-profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: loggedInUser.email,
              name: finalName,
              rollNumber: finalRoll
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setLoggedInUser({
                ...loggedInUser,
                name: data.user.name,
                rollNumber: data.user.rollNumber
              });
            }
          }
        } catch (dbErr) {
          console.error('Error syncing attendance checkin to DB:', dbErr);
        }
      }

      addFeedItem({
        type: 'message',
        senderId: currentUser.id,
        senderName: finalName,
        senderRole: currentUser.role,
        content: `__attendance_checkin__${activeSession.id}__${finalName}__${finalRoll}__${tempTime}`,
      });

      setIsCheckInModalOpen(false);
      addToast('Attendance marked successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to mark attendance.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost || !activeSession) return;

    const mins = parseInt(minMinutesInput, 10);
    if (isNaN(mins) || mins < 0) {
      addToast('Please enter a valid number of minutes.', 'warning');
      return;
    }

    addFeedItem({
      type: 'message',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: `__attendance_rules__${activeSession.id}__${mins}`,
    });
    addToast(`Minimum presence required updated to ${mins} minutes.`, 'success');
  };

  const handleOverrideStatus = (rollNumber: string, status: 'present' | 'absent' | 'auto') => {
    if (!isHost || !activeSession) return;

    addFeedItem({
      type: 'message',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: `__attendance_override__${activeSession.id}__${rollNumber}__${status}`,
    });
    addToast(`Updated status overwrite rule for ${rollNumber}`, 'info');
  };

  // Helper to format seconds -> mins/secs string
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleExportCSV = (sessionId: string, sessionName: string) => {
    const list = checkinsMap[sessionId] || [];
    if (list.length === 0) {
      addToast('No attendance records to export.', 'warning');
      return;
    }

    const minReq = minMinutesRules[sessionId] !== undefined ? minMinutesRules[sessionId] : 10;
    const sessionOverrides = overridesMap[sessionId] || {};

    const headers = ['Name', 'Roll Number', 'Role', 'Active Duration', 'Status', 'Attendance Criteria'];
    const rows = list.map(c => {
      const liveSec = realTimeSeconds[c.rollNumber] !== undefined ? realTimeSeconds[c.rollNumber] : c.initialSeconds;
      
      let finalStatus = 'Absent';
      const overrideVal = sessionOverrides[c.rollNumber];
      if (overrideVal === 'present') {
        finalStatus = 'Present (Manual)';
      } else if (overrideVal === 'absent') {
        finalStatus = 'Absent (Manual)';
      } else {
        finalStatus = (liveSec / 60) >= minReq ? 'Present' : 'Absent';
      }

      return [
        c.name,
        c.rollNumber,
        c.role === 'host' ? 'Host' : 'Member',
        formatDuration(liveSec),
        finalStatus,
        `Min ${minReq} mins`
      ];
    });

    const csvContent = [
      `Session Name,${sessionName}`,
      `Exported At,${new Date().toLocaleString()}`,
      `Class Pass Requirement,Min ${minReq} minutes`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${sessionName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Attendance sheet CSV exported successfully!', 'success');
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none text-left">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#FF6A00]" />
            Lab Attendance Tracker
          </h1>
          <p className="text-xs text-[#71717a]">
            Manage student check-ins, record present logs, and download attendance sheets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main interactive panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Session Status */}
          {activeSession ? (
            <div className="p-5 border border-[#22C55E]/20 bg-[#22C55E]/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(34,197,94,0.05)] text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/25 flex items-center justify-center text-[#22C55E] flex-shrink-0 animate-pulse">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-[#22C55E] tracking-wider">Active Attendance Session</span>
                  <h3 className="text-base font-bold text-[#f4f4f5]">{activeSession.name}</h3>
                  <span className="text-xs text-[#71717a]">Started by {activeSession.creatorName} • Minimum Presence: <span className="font-bold text-[#FFD600]">{activeMinMinutes} mins</span></span>
                </div>
              </div>

              {isHost ? (
                <Button variant="red" size="sm" onClick={handleEndSession} className="gap-1.5 font-semibold text-xs py-2 px-4">
                  <Square className="w-3.5 h-3.5 fill-white" />
                  Close Session
                </Button>
              ) : (
                <div>
                  {isAlreadyCheckedIn ? (
                    <div className="flex items-center gap-1.5 bg-[#22C55E]/15 border border-[#22C55E]/20 rounded-xl px-4 py-2 text-[#22C55E] text-xs font-semibold select-none">
                      <CheckCircle className="w-4 h-4 fill-[#22C55E]/10" />
                      Attendance Marked Present
                    </div>
                  ) : (
                    <Button variant="yellow" size="sm" onClick={() => setIsCheckInModalOpen(true)} className="gap-1.5 font-semibold text-xs py-2 px-5 shadow-[0_0_15px_rgba(255,214,0,0.15)]">
                      <Play className="w-3.5 h-3.5 fill-black" />
                      Check In Now
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 border border-white/[0.08] bg-[#0f0f10] rounded-2xl flex items-center gap-4 text-left select-none shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#71717a] flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-bold text-[#f4f4f5]">No Active Session</h4>
                <p className="text-xs text-[#71717a]">
                  {isHost 
                    ? "Start a new session on the right panel to begin recording student attendance." 
                    : "The lab instructor will open an attendance session when required. Please stay tuned."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Current Session Attendees list */}
          {activeSession && (
            <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FFD600]" />
                  <h3 className="text-sm font-semibold text-[#f4f4f5]">
                    {isHost ? `Attendees in Current Session (${activeCheckins.length})` : 'Your Attendance Status'}
                  </h3>
                </div>
                {isHost && activeCheckins.length > 0 && (
                  <button 
                    onClick={() => handleExportCSV(activeSession.id, activeSession.name)}
                    className="flex items-center gap-1.5 text-xs text-[#FFD600] hover:text-[#ffd600]/80 transition-colors font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {filteredCheckins.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center select-none gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#71717a]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#f4f4f5]">
                      {isHost ? 'No Check-ins Yet' : 'Not Checked In'}
                    </span>
                    <span className="text-[10px] text-[#71717a]">
                      {isHost 
                        ? 'Students will appear here as they check in.' 
                        : 'Please click "Check In Now" above to register attendance.'
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse select-none">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-[#a1a1aa]">
                        <th className="px-5 py-3">Student Name</th>
                        <th className="px-5 py-3">Roll Number</th>
                        <th className="px-5 py-3">Active Duration</th>
                        <th className="px-5 py-3">Calculated Status</th>
                        {isHost && <th className="px-5 py-3 text-right">Actions / Overwrites</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-xs text-[#a1a1aa]">
                      {filteredCheckins.map((attendee, index) => {
                        const activeSec = realTimeSeconds[attendee.rollNumber] !== undefined 
                          ? realTimeSeconds[attendee.rollNumber] 
                          : attendee.initialSeconds;
                        const activeMins = activeSec / 60;
                        const meetsCriteria = activeMins >= activeMinMinutes;

                        // Check status overwrite rules
                        const sessionOverrides = overridesMap[activeSession.id] || {};
                        const statusOverride = sessionOverrides[attendee.rollNumber];

                        let displayStatus = 'Absent';
                        let pillColor = 'bg-[#EF4444]/15 border-[#EF4444]/20 text-[#EF4444]';
                        
                        if (statusOverride === 'present') {
                          displayStatus = 'Present (Manual)';
                          pillColor = 'bg-[#22C55E]/15 border-[#22C55E]/20 text-[#22C55E]';
                        } else if (statusOverride === 'absent') {
                          displayStatus = 'Absent (Manual)';
                          pillColor = 'bg-[#EF4444]/15 border-[#EF4444]/20 text-[#EF4444]';
                        } else {
                          if (meetsCriteria) {
                            displayStatus = 'Present';
                            pillColor = 'bg-[#22C55E]/15 border-[#22C55E]/20 text-[#22C55E]';
                          } else {
                            displayStatus = 'Short Attendance';
                            pillColor = 'bg-[#F59E0B]/15 border-[#F59E0B]/20 text-[#F59E0B]';
                          }
                        }

                        return (
                          <tr key={index} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-[#f4f4f5]">{attendee.name}</td>
                            <td className="px-5 py-3.5 font-mono text-[#f4f4f5]">{attendee.rollNumber}</td>
                            <td className="px-5 py-3.5 text-[#71717a] font-mono text-[11px] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                              {formatDuration(activeSec)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center text-[10px] font-bold border px-2 py-0.5 rounded-full ${pillColor}`}>
                                {displayStatus}
                              </span>
                            </td>
                            {isHost && (
                              <td className="px-5 py-3.5 text-right">
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => handleOverrideStatus(attendee.rollNumber, 'present')}
                                    className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                                      statusOverride === 'present' 
                                        ? 'bg-[#22C55E] border-[#22C55E] text-black' 
                                        : 'bg-transparent border-white/[0.08] text-[#a1a1aa] hover:border-[#22C55E]/50 hover:text-white'
                                    }`}
                                  >
                                    Force Present
                                  </button>
                                  <button
                                    onClick={() => handleOverrideStatus(attendee.rollNumber, 'absent')}
                                    className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                                      statusOverride === 'absent' 
                                        ? 'bg-[#EF4444] border-[#EF4444] text-white' 
                                        : 'bg-transparent border-white/[0.08] text-[#a1a1aa] hover:border-[#EF4444]/50 hover:text-white'
                                    }`}
                                  >
                                    Force Absent
                                  </button>
                                  {statusOverride && statusOverride !== 'auto' && (
                                    <button
                                      onClick={() => handleOverrideStatus(attendee.rollNumber, 'auto')}
                                      className="px-2 py-1 rounded text-[9px] font-bold border bg-transparent border-white/[0.08] text-[#71717a] hover:border-white/20 hover:text-white"
                                      title="Reset to calculate automatically"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Past Sessions List */}
          {isHost && (
            <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <div className="px-5 py-4 border-b border-white/[0.06] select-none text-left">
                <h3 className="text-sm font-semibold text-[#f4f4f5]">Past Attendance Log ({pastSessions.length})</h3>
              </div>

              {pastSessions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center select-none gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#71717a]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#f4f4f5]">No Previous Sessions</span>
                    <span className="text-[10px] text-[#71717a]">Completed sessions will be logged here.</span>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06] text-left">
                  {pastSessions.map((session) => {
                    const checkinCount = (checkinsMap[session.id] || []).length;
                    return (
                      <div key={session.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                        <div className="flex items-start gap-3.5">
                          <div className="w-8.5 h-8.5 rounded-lg bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-[#a1a1aa]" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-xs font-bold text-[#f4f4f5]">{session.name}</h4>
                            <span className="text-[10px] text-[#71717a]">Instructed by {session.creatorName} • Ended at {session.timestamp}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-xs select-none">
                            <span className="text-[#a1a1aa]">Present: </span>
                            <span className="font-bold text-[#FFD600]">{checkinCount} Students</span>
                          </div>
                          <button
                            onClick={() => handleExportCSV(session.id, session.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-[#f4f4f5] hover:bg-white/[0.06] hover:text-[#FFD600] text-[10px] font-semibold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right side controls (Host configuration) */}
        {isHost && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Create Session Card */}
            <Card className="p-5 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06] select-none">
                <Plus className="w-4 h-4 text-[#FFD600]" />
                <h3 className="text-sm font-bold text-[#f4f4f5]">Start New Log</h3>
              </div>

              <form onSubmit={handleStartSession} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#71717a] tracking-wider select-none">Session Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Session - Lab 1"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    disabled={!!activeSession}
                    className="neo-input w-full text-xs py-2.5"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="yellow" 
                  disabled={!!activeSession}
                  className="w-full justify-center gap-1.5 font-bold text-xs py-2.5 shadow-[0_0_15px_rgba(255,214,0,0.1)]"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  Launch Session
                </Button>
              </form>
            </Card>

            {/* Set Criteria Rules Card */}
            {activeSession && (
              <Card className="p-5 flex flex-col gap-4 text-left">
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06] select-none">
                  <Settings2 className="w-4 h-4 text-[#FFD600]" />
                  <h3 className="text-sm font-bold text-[#f4f4f5]">Attendance Criteria</h3>
                </div>

                <form onSubmit={handleUpdateRules} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#71717a] tracking-wider select-none">Min Presence (Minutes)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 45"
                      value={minMinutesInput}
                      onChange={(e) => setMinMinutesInput(e.target.value)}
                      className="neo-input w-full text-xs py-2.5"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="yellow" 
                    className="w-full justify-center gap-1.5 font-bold text-xs py-2.5"
                  >
                    Save Requirements
                  </Button>
                </form>
              </Card>
            )}

            {/* Attendance Rules Card */}
            <Card className="p-5 flex flex-col gap-3.5 text-left select-none text-[#a1a1aa] text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06] text-[#f4f4f5]">
                <ShieldCheck className="w-4.5 h-4.5 text-[#FFD600]" />
                <h3 className="text-sm font-bold">Attendance Security</h3>
              </div>
              <div className="flex flex-col gap-2 leading-relaxed text-[11px]">
                <p>⏱️ **Presence Duration**: Tracks real-time active student time in class. Resumes automatically if a student leaves and reconnects.</p>
                <p>⚖️ **Minimum Time Rule**: Host can set a minimum duration required to qualify for Auto Present status.</p>
                <p>✏️ **Teacher Override**: Host can click "Force Present" or "Force Absent" to manually override any student's calculated status.</p>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* Manual Check-in Dialog Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-6 relative flex flex-col gap-4 text-left border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCheckInModalOpen(false)}
              className="absolute top-4 right-4 text-[#71717a] hover:text-[#f4f4f5] p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1 pr-6">
              <h3 className="text-base font-bold text-[#f4f4f5] flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-[#FFD600]" />
                Verify Identity
              </h3>
              <p className="text-xs text-[#71717a]">
                Confirm your student details to record attendance.
              </p>
            </div>

            <form onSubmit={handleCheckInSubmit} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a1a1aa] tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="neo-input w-full text-xs py-2.5"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a1a1aa] tracking-wider">Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. CS2026-084"
                  value={rollInput}
                  onChange={(e) => setRollInput(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="neo-input w-full text-xs py-2.5"
                />
              </div>

              <Button
                type="submit"
                variant="yellow"
                disabled={isSubmitting}
                className="w-full justify-center gap-1.5 font-bold text-xs py-2.5 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Submit Check-in
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
