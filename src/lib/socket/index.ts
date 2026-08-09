import { io, Socket } from 'socket.io-client';

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `http://${window.location.hostname}:5000`;
  }
  return 'http://127.0.0.1:5000';
};

const BACKEND_URL = getBackendUrl();

let socket: Socket | null = null;
const activeListeners = new Map<string, any>();

// Helper to bind listener and save it in cache
const bindListener = (event: string, callback: any) => {
  activeListeners.set(event, callback);
  if (socket) {
    socket.off(event);
    socket.on(event, callback);
  }
};

// Helper to attach all cached listeners to a newly created socket instance
const attachAllListeners = (sock: Socket) => {
  activeListeners.forEach((callback, event) => {
    sock.off(event);
    sock.on(event, callback);
  });
};

export const socketService = {
  connect: (pin: string, name: string, role: 'host' | 'member') => {
    if (socket && socket.connected) {
      socket.emit('join-room', { pin, name, role });
      return;
    }
    
    if (socket) {
      socket.disconnect();
    }
    
    socket = io(BACKEND_URL);
    attachAllListeners(socket);
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
      socket?.emit('join-room', { pin, name, role });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  },

  connectKnock: (pin: string, name: string, password?: string) => {
    if (socket && socket.connected) {
      socket.emit('knock-room', { pin, name, password });
      return;
    }

    if (socket) {
      socket.disconnect();
    }

    socket = io(BACKEND_URL);
    attachAllListeners(socket);

    socket.on('connect', () => {
      console.log('Socket connected for knocking:', socket?.id);
      socket?.emit('knock-room', { pin, name, password });
    });
  },

  onKnockResult: (callback: (data: { status: 'accepted' | 'rejected' | 'error'; message?: string; autoJoin?: boolean; requiresPassword?: boolean; pin?: string }) => void) => {
    bindListener('knock-result', callback);
  },

  onMemberKnocking: (callback: (data: { name: string; socketId: string }) => void) => {
    bindListener('member-knocking', callback);
  },

  acceptKnock: (pin: string, targetSocketId: string) => {
    socket?.emit('accept-knock', { pin, targetSocketId });
  },

  rejectKnock: (pin: string, targetSocketId: string) => {
    socket?.emit('reject-knock', { pin, targetSocketId });
  },

  deleteRoom: (pin: string) => {
    socket?.emit('delete-room', { pin });
  },

  onRoomExpired: (callback: () => void) => {
    bindListener('room-expired', callback);
  },
  
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
  
  // Feed item events (chat, code, files)
  sendFeedItem: (pin: string, item: any) => {
    if (socket) {
      socket.emit('send-feed-item', { pin, item });
    }
  },
  onFeedUpdated: (callback: (feed: any[]) => void) => {
    bindListener('feed-updated', callback);
  },
  
  // Sticky notes events
  createNote: (pin: string, note: any) => {
    socket?.emit('create-note', { pin, note });
  },
  togglePinNote: (pin: string, noteId: string) => {
    socket?.emit('toggle-pin-note', { pin, noteId });
  },
  deleteNote: (pin: string, noteId: string) => {
    socket?.emit('delete-note', { pin, noteId });
  },
  onNotesUpdated: (callback: (notes: any[]) => void) => {
    bindListener('notes-updated', callback);
  },
  
  // Member & presence events
  onMembersUpdated: (callback: (members: any[]) => void) => {
    bindListener('room-members-updated', callback);
  },
  onActivitiesUpdated: (callback: (activities: any[]) => void) => {
    bindListener('activities-updated', callback);
  },
  onRoomSettingsUpdated: (callback: (room: any) => void) => {
    bindListener('room-settings-updated', callback);
  },
  onKicked: (callback: () => void) => {
    bindListener('kicked-from-room', callback);
  },
  onRateLimited: (callback: (data: { message: string }) => void) => {
    bindListener('rate-limited', callback);
  },

  // Host operations emitters
  toggleLockRoom: (pin: string) => {
    socket?.emit('toggle-lock-room', { pin });
  },
  toggleMuteChat: (pin: string) => {
    socket?.emit('toggle-mute-chat', { pin });
  },
  toggleMuteMember: (pin: string, memberId: string) => {
    socket?.emit('toggle-mute-member', { pin, memberId });
  },
  kickMember: (pin: string, memberId: string) => {
    socket?.emit('kick-member', { pin, memberId });
  },
  clearFeed: (pin: string) => {
    socket?.emit('clear-feed', { pin });
  },
  createRoom: (roomData: any) => {
    socket?.emit('create-room', roomData);
  },
  transferHost: (pin: string, targetMemberId: string) => {
    socket?.emit('transfer-host-role', { pin, targetMemberId });
  },
  emitMemberStorageFull: (pin: string, name: string) => {
    socket?.emit('member-storage-full', { pin, name });
  },
  onHostStorageAlert: (callback: (data: { name: string }) => void) => {
    bindListener('host-storage-alert', callback);
  },
  emitTriggerStorageAdRequest: (pin: string) => {
    socket?.emit('trigger-storage-ad-request', { pin });
  },
  onPlayStorageAd: (callback: () => void) => {
    bindListener('play-storage-ad', callback);
  },
  emitHostAdCompleted: (pin: string) => {
    socket?.emit('host-ad-completed', { pin });
  },
  onStorageLimitIncreased: (callback: (data: { newLimit: number }) => void) => {
    bindListener('storage-limit-increased', callback);
  },
  onStopStorageAd: (callback: () => void) => {
    bindListener('stop-storage-ad', callback);
  },
  sendLiveReaction: (pin: string, emoji: string, name: string) => {
    socket?.emit('send-live-reaction', { pin, emoji, name });
  },
  onLiveReactionReceived: (callback: (data: { emoji: string; name: string }) => void) => {
    bindListener('live-reaction-received', callback);
  },
  sendAttendanceHeartbeat: (pin: string, rollNumber: string, activeSeconds: number) => {
    socket?.emit('send-attendance-heartbeat', { pin, rollNumber, activeSeconds });
  },
  onAttendanceHeartbeatReceived: (callback: (data: { rollNumber: string; activeSeconds: number }) => void) => {
    bindListener('attendance-heartbeat-received', callback);
  },
  unlockStorage: (pin: string) => {
    socket?.emit('unlock-storage', { pin });
  },
  onStorageLimitUpdated: (callback: (data: { storageLimit: number; limitMB: number }) => void) => {
    bindListener('storage-limit-updated', callback);
  },
  trackDownload: (pin: string, fileId: string, downloaderId: string) => {
    socket?.emit('track-download', { pin, fileId, downloaderId });
  },
  onFileStatsUpdated: (callback: (data: { fileId: string; totalDownloads: number; uniqueDownloads: number }) => void) => {
    bindListener('file-stats-updated', callback);
  },
  onSystemBroadcast: (callback: (data: { title: string; message: string; type: 'info' | 'warning' | 'alert'; timestamp: string }) => void) => {
    bindListener('system-broadcast', callback);
  }
};
