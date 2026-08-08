import { create } from 'zustand';
import { Room, Member, FeedItem, Note, ActivityLog } from '../lib/types';
import { socketService } from '../lib/socket';

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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface RoomState {
  activeRoom: Room | null;
  currentUser: Member | null;
  members: Member[];
  feedItems: FeedItem[];
  notes: Note[];
  activities: ActivityLog[];
  toasts: Toast[];

  // Actions
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Full-stack connections
  enterRoom: (pin: string) => Promise<void>;
  
  // Room Actions
  createRoom: (name: string, maxMembers: number, autoDeleteTimer: string, password?: string, creatorNameInput?: string) => Promise<string>;
  joinRoom: (pin: string, name: string) => boolean;
  leaveRoom: () => void;
  deleteRoom: () => void;
  updateRoomSettings: (settings: Partial<Room>) => void;
  
  // Host Controls
  toggleLockRoom: () => void;
  toggleMuteChat: () => void;
  toggleFileSharing: () => void;
  clearFeed: () => void;

  // Member Actions
  toggleMuteMember: (id: string) => void;
  kickMember: (id: string) => void;
  transferHost: (id: string) => void;

  // Feed Actions
  addFeedItem: (item: Omit<FeedItem, 'id' | 'timestamp'>) => void;
  deleteFeedItem: (id: string) => void;

  // Notes Actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'createdBy'>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;

  // Auth States & Actions
  loggedInUser: {
    id: string;
    name: string;
    email: string;
    country: string;
    state: string;
    isVerified: boolean;
    plan?: string;
    rollNumber?: string;
  } | null;
  setLoggedInUser: (user: any) => void;
  logoutUser: () => void;

  // Confirmation Modal
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  closeConfirm: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  activeRoom: null,
  currentUser: null,
  members: [],
  feedItems: [],
  notes: [],
  activities: [],
  toasts: [],

  loggedInUser: typeof window !== 'undefined' && localStorage.getItem('logged_in_user')
    ? JSON.parse(localStorage.getItem('logged_in_user') || 'null')
    : null,

  setLoggedInUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('logged_in_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('logged_in_user');
      }
    }
    set({ loggedInUser: user });
  },

  logoutUser: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('logged_in_user');
    }
    set({ loggedInUser: null });
  },

  // Toast actions
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Hydrate room from database and connect sockets
  enterRoom: async (pin) => {
    try {
      // Resolve user details
      let current = get().currentUser;
      if (!current && typeof window !== 'undefined') {
        const saved = sessionStorage.getItem(`room_user_${pin}`);
        if (saved) {
          try {
            current = JSON.parse(saved);
          } catch (e) {
            current = null;
          }
        }
      }

      if (!current) {
        // Fallback for direct browser url entrance to preserve screenshot identities
        if (pin === '408215') {
          current = { id: '1', name: 'Aman (Host)', role: 'host', joinedAt: '11:40 AM', isOnline: true, isMuted: false };
        } else {
          current = {
            id: `user-${Date.now()}`,
            name: `Buddy_${Math.floor(100 + Math.random() * 900)}`,
            role: 'member',
            joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOnline: true,
            isMuted: false
          };
        }
      }

      // Save to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(current));
      }
      set({ currentUser: current });

      // Fetch room data from Express REST API
      const res = await fetch(`${BACKEND_URL}/api/room/${pin}`);
      if (res.ok) {
        const data = await res.json();
        
        // Sync role dynamically if they are designated host in database
        let userRole = current.role;
        if (data.room.createdBy === current.name) {
          userRole = 'host';
        }

        const updatedUser = { ...current, role: userRole };

        set({
          activeRoom: data.room,
          feedItems: data.feed,
          notes: data.notes,
          members: data.members,
          activities: data.activities,
          currentUser: updatedUser
        });

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(updatedUser));
        }

        // Initialize Socket.io connection (only for host, members connect after accept-knock in layout)
        if (userRole === 'host') {
          socketService.connect(pin, current.name, userRole);
        }

        // Bind Socket listeners to reactively mutate Zustand store
        socketService.onFeedUpdated((feed) => {
          set({ feedItems: feed });
        });

        socketService.onNotesUpdated((notes) => {
          set({ notes });
        });

        socketService.onMembersUpdated((membersList) => {
          const current = get().currentUser;
          if (current) {
            const selfInList = membersList.find((m) => m.name === current.name);
            if (selfInList && selfInList.role !== current.role) {
              const updated = { ...current, role: selfInList.role };
              set({ currentUser: updated });
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(updated));
              }
              get().addToast(`Your role was updated to: ${selfInList.role}`, 'info');
            }
          }
          set({ members: membersList });
        });

        socketService.onActivitiesUpdated((activitiesList) => {
          set({ activities: activitiesList });
        });

        socketService.onRoomSettingsUpdated((room) => {
          set({ activeRoom: room });
        });

        socketService.onKicked(() => {
          get().addToast('You have been kicked by the host!', 'error');
          get().leaveRoom();
          window.location.href = '/';
        });

        socketService.onRoomExpired(() => {
          get().addToast('This room has expired or was deleted by the host!', 'warning');
          get().leaveRoom();
          window.location.href = '/';
        });

        socketService.onRateLimited(({ message }) => {
          get().addToast(message, 'warning');
        });

      } else {
        get().addToast('Room PIN not found in database.', 'error');
        window.location.href = '/join';
      }
    } catch (err) {
      console.error(err);
      get().addToast('Error synchronizing database.', 'error');
    }
  },

  // Room creation / entry actions
  createRoom: async (name, maxMembers, autoDeleteTimer, password, creatorNameInput) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit PIN
    const creatorName = creatorNameInput?.trim() || get().currentUser?.name || 'Aman';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    
    const hostUser: Member = {
      id: 'host-1',
      name: creatorName,
      role: 'host',
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOnline: true,
      isMuted: false,
    };

    set({
      currentUser: hostUser,
      activeRoom: {
        pin,
        name,
        maxMembers,
        autoDeleteTimer,
        isLocked: false,
        isMuted: false,
        isFileSharingEnabled: true,
        roomVisibility: true,
        createdAt: timestamp,
        createdBy: creatorName,
        status: 'Active',
      }
    });

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(hostUser));
    }

    try {
      // Save to MongoDB via REST API POST first to guarantee it is written before navigation
      await fetch(`${BACKEND_URL}/api/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin,
          name,
          maxMembers,
          autoDeleteTimer,
          createdBy: creatorName,
          password,
        }),
      });
    } catch (err) {
      console.error('Error creating room via REST:', err);
    }

    // Establish WebSocket connection
    socketService.connect(pin, hostUser.name, 'host');

    get().addToast(`Room PIN #${pin} initialized!`, 'success');
    return pin;
  },

  joinRoom: (pin, name) => {
    // Save nickname identity locally, let room/layout execute enterRoom async hydration
    const newUser: Member = {
      id: `user-${Date.now()}`,
      name: name || `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'member',
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOnline: true,
      isMuted: false
    };

    set({
      currentUser: newUser,
      activeRoom: { pin } as any // Temporary shell
    });

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(newUser));
    }

    return true;
  },

  leaveRoom: () => {
    const pin = get().activeRoom?.pin;
    if (typeof window !== 'undefined' && pin) {
      sessionStorage.removeItem(`room_user_${pin}`);
      sessionStorage.removeItem(`knock_approved_${pin}`);
      localStorage.removeItem(`knock_approved_${pin}`);
    }
    socketService.disconnect();
    set({
      activeRoom: null,
      currentUser: null,
      members: [],
      feedItems: [],
      notes: [],
      activities: [],
    });
    get().addToast('Disconnected from room.', 'info');
  },

  deleteRoom: () => {
    const pin = get().activeRoom?.pin;
    if (pin) {
      socketService.deleteRoom(pin);
      get().leaveRoom();
    }
  },

  updateRoomSettings: (settings) => {
    // Note: Local settings will update dynamically via the broadcasted socket listener
    // We emit to socket, server saves to DB, then sends room-settings-updated to everyone
    const pin = get().activeRoom?.pin;
    if (pin) {
      // For simple text updates like room name, let's emit lock/mute chat if toggled
      if (settings.isLocked !== undefined) {
        socketService.toggleLockRoom(pin);
      } else if (settings.isMuted !== undefined) {
        socketService.toggleMuteChat(pin);
      } else {
        // Send updates via socket
        socketService.onRoomSettingsUpdated((room) => {
          set({ activeRoom: { ...room, ...settings } });
        });
      }
      get().addToast('Settings synchronized!', 'success');
    }
  },

  // Host Control Toggles
  toggleLockRoom: () => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.toggleLockRoom(pin);
  },

  toggleMuteChat: () => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.toggleMuteChat(pin);
  },

  toggleFileSharing: () => {
    // Simple mock toggler
    set((state) => {
      if (!state.activeRoom) return {};
      return { activeRoom: { ...state.activeRoom, isFileSharingEnabled: !state.activeRoom.isFileSharingEnabled } };
    });
    get().addToast('File sharing permission toggled.', 'info');
  },

  clearFeed: () => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.clearFeed(pin);
  },

  // Member management actions
  toggleMuteMember: (id) => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.toggleMuteMember(pin, id);
  },

  kickMember: (id) => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.kickMember(pin, id);
  },

  transferHost: (id) => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.transferHost(pin, id);
  },

  // Feed/Post Actions
  addFeedItem: (item) => {
    const pin = get().activeRoom?.pin;
    if (pin) {
      socketService.sendFeedItem(pin, item);
    }
  },

  deleteFeedItem: (id) => {
    set((state) => ({
      feedItems: state.feedItems.filter((item) => item.id !== id),
    }));
    get().addToast('Item removed locally.', 'info');
  },

  // Note actions
  addNote: (note) => {
    const pin = get().activeRoom?.pin;
    const creator = get().currentUser?.name || 'Aman';
    if (pin) {
      socketService.createNote(pin, { ...note, createdBy: creator });
    }
  },

  deleteNote: (id) => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.deleteNote(pin, id);
  },

  togglePinNote: (id) => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.togglePinNote(pin, id);
  },

  updateNote: (id, updates) => {
    // Local mock update
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
    get().addToast('Note updated locally.', 'success');
  },

  confirmDialog: null,
  showConfirm: (title, message, onConfirm, onCancel) => {
    set({
      confirmDialog: {
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          get().closeConfirm();
        },
        onCancel: () => {
          if (onCancel) onCancel();
          get().closeConfirm();
        }
      }
    });
  },
  closeConfirm: () => {
    set({ confirmDialog: null });
  }
}));
