export interface Room {
  pin: string; // 6-digit PIN
  name: string;
  maxMembers: number;
  autoDeleteTimer: string;
  isLocked: boolean;
  isMuted: boolean;
  isFileSharingEnabled: boolean;
  roomVisibility: boolean; // true = Anyone with PIN, false = Restricted
  createdAt: string;
  createdBy: string;
  status: 'Active' | 'Locked' | 'Expired';
  storageLimit?: number;
}

export interface Member {
  id: string;
  _id?: string;
  name: string;
  role: 'host' | 'member';
  joinedAt: string;
  isOnline: boolean;
  isMuted: boolean;
}

export interface FeedItem {
  id: string;
  _id?: string;
  type: 'message' | 'code' | 'file';
  senderId: string;
  senderName: string;
  senderRole: 'host' | 'member';
  timestamp: string;
  content?: string; // For text messages or comments
  code?: string; // For code snippets
  language?: string; // For code snippets (e.g., C++, Python, JavaScript)
  fileName?: string; // For files
  fileSize?: string; // For files
  fileType?: string; // For files (pdf, zip, cpp, png, txt, etc.)
  fileUrl?: string;  // For files (downloadable URL)
  cloudinaryPublicId?: string; // For files hosted on Cloudinary
  fileSizeBytes?: number; // Raw file size in bytes
  createdAt?: string;
  createdAtMs?: number;
}

export interface Note {
  id: string;
  _id?: string;
  title: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'orange';
  pinned: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  _id?: string;
  type: 'join' | 'leave' | 'upload' | 'code_share' | 'lock' | 'mute' | 'delete' | 'setting_change' | 'info';
  description: string;
  timestamp: string;
  user?: string;
}
