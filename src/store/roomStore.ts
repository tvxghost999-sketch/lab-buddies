import { create } from 'zustand';
import { Room, Member, FeedItem, Note, ActivityLog, LoggedInUser } from '../lib/types';
import { socketService } from '../lib/socket';
import { deriveRoomKey, encryptFeedItem, decryptFeedItem, encryptNote, decryptNote } from '../lib/crypto';

export const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (url.includes('lab-buddies-backend.onrender.com')) {
      return 'https://lab-buddies-7r70.onrender.com';
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000' 
      : 'https://lab-buddies-7r70.onrender.com';
  }
  return 'https://lab-buddies-7r70.onrender.com';
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
  roomCryptoKey: CryptoKey | null;
  systemBroadcast: { title: string; message: string; type: 'info' | 'warning' | 'alert'; timestamp: string } | null;

  // Actions
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  dismissBroadcast: () => void;
  
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
  claimHost: () => void;

  // Feed Actions
  addFeedItem: (item: Omit<FeedItem, 'id' | 'timestamp'>) => void;
  deleteFeedItem: (id: string) => void;

  // Notes Actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'createdBy'>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;

  // Auth States & Actions
  loggedInUser: LoggedInUser | null;
  setLoggedInUser: (user: LoggedInUser | null) => void;
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
  roomCryptoKey: null,

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

  systemBroadcast: null,
  dismissBroadcast: () => set({ systemBroadcast: null }),

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
        const loggedIn = get().loggedInUser;
        if (loggedIn?.name) {
          current = {
            id: loggedIn.id || `user-${Date.now()}`,
            name: loggedIn.name,
            role: 'member',
            joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOnline: true,
            isMuted: false
          };
        } else if (typeof window !== 'undefined') {
          // Name is compulsory — redirect user to join page to enter their name
          window.location.href = `/join?pin=${pin}`;
          return;
        }
      }

      if (!current) {
        if (typeof window !== 'undefined') {
          window.location.href = `/join?pin=${pin}`;
        }
        return;
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

        // Derive E2EE CryptoKey from Room PIN and stored room password
        let storedPassword = '';
        if (typeof window !== 'undefined') {
          storedPassword = sessionStorage.getItem(`room_pwd_${pin}`) || '';
        }
        const cryptoKey = await deriveRoomKey(pin, storedPassword);

        // Decrypt initial REST feed and notes
        const decryptedFeed = await Promise.all((data.feed || []).map((item: FeedItem) => decryptFeedItem(item, cryptoKey)));
        const decryptedNotes = await Promise.all((data.notes || []).map((note: Note) => decryptNote(note, cryptoKey)));

        set({
          activeRoom: data.room,
          feedItems: decryptedFeed,
          notes: decryptedNotes,
          members: data.members,
          activities: data.activities,
          currentUser: updatedUser,
          roomCryptoKey: cryptoKey,
        });

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(updatedUser));
        }

        // Initialize Socket.io connection (only for host, members connect after accept-knock in layout)
        if (userRole === 'host') {
          socketService.connect(pin, current.name, userRole);
        }

        // Bind Socket listeners to reactively mutate Zustand store
        socketService.onFeedUpdated(async (feed) => {
          const key = get().roomCryptoKey;
          const decrypted = await Promise.all((feed || []).map((item) => decryptFeedItem(item, key)));
          set({ feedItems: decrypted });
        });

        socketService.onNotesUpdated(async (notes) => {
          const key = get().roomCryptoKey;
          const decrypted = await Promise.all((notes || []).map((note) => decryptNote(note, key)));
          set({ notes: decrypted });
        });

        socketService.onMembersUpdated((membersList) => {
          const current = get().currentUser;
          if (current) {
            const selfInList = membersList.find((m) => m.name.toLowerCase() === current.name.toLowerCase());
            if (selfInList) {
              let updated = { ...current };
              let hasChanged = false;

              if (selfInList.role !== current.role) {
                updated.role = selfInList.role;
                hasChanged = true;
                get().addToast(`Your role was updated to: ${selfInList.role}`, 'info');
              }

              if (selfInList.name !== current.name) {
                updated.name = selfInList.name;
                hasChanged = true;
              }

              if (selfInList.isMuted !== current.isMuted) {
                updated.isMuted = selfInList.isMuted;
                hasChanged = true;
                get().addToast(
                  selfInList.isMuted 
                    ? 'You have been muted by the host.' 
                    : 'You have been unmuted by the host.', 
                  selfInList.isMuted ? 'error' : 'success'
                );
              }

              if (hasChanged) {
                set({ currentUser: updated });
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(`room_user_${pin}`, JSON.stringify(updated));
                }
              }
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

        socketService.onStorageLimitUpdated(({ storageLimit, limitMB }) => {
          const current = get().activeRoom;
          if (current) {
            set({ activeRoom: { ...current, storageLimit } });
          }
          get().addToast(`Room storage expanded to ${limitMB} MB!`, 'success');
        });

        socketService.onFileStatsUpdated(({ fileId, totalDownloads, uniqueDownloads }) => {
          const feedItems = (get().feedItems || []).map((item) => {
            if ((item.id === fileId || item._id === fileId) && item.type === 'file') {
              return { ...item, totalDownloads, uniqueDownloads };
            }
            return item;
          });
          set({ feedItems });
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

        socketService.onSystemBroadcast((data) => {
          set({ systemBroadcast: data });
          const toastType = data.type === 'alert' ? 'error' : data.type === 'warning' ? 'warning' : 'info';
          get().addToast(`📢 ${data.title}: ${data.message}`, toastType);
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
    const pin = get().activeRoom?.pin;
    if (pin) {
      if (settings.isLocked !== undefined) {
        socketService.toggleLockRoom(pin);
      } else if (settings.isMuted !== undefined) {
        socketService.toggleMuteChat(pin);
      } else {
        socketService.updateRoomSettings(pin, settings);
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
  claimHost: () => {
    const pin = get().activeRoom?.pin;
    if (pin) socketService.claimHost(pin);
  },

  // Feed/Post Actions
  addFeedItem: async (item) => {
    const pin = get().activeRoom?.pin;
    if (pin) {
      const key = get().roomCryptoKey;
      const encryptedItem = await encryptFeedItem(item, key);
      socketService.sendFeedItem(pin, encryptedItem);
    }
  },

  deleteFeedItem: (id) => {
    set((state) => ({
      feedItems: state.feedItems.filter((item) => item.id !== id),
    }));
    get().addToast('Item removed locally.', 'info');
  },

  // Note actions
  addNote: async (note) => {
    const pin = get().activeRoom?.pin;
    const creator = get().currentUser?.name || 'Aman';
    if (pin) {
      const key = get().roomCryptoKey;
      const encryptedNote = await encryptNote({ ...note, createdBy: creator }, key);
      socketService.createNote(pin, encryptedNote);
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
