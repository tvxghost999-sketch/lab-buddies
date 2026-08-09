'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, LayoutDashboard, DoorOpen, HardDrive, 
  Users, Radio, Trash2, Lock, Unlock, RefreshCw, 
  Search, Download, AlertTriangle, Check, X, 
  Eye, FileText, ArrowRight, LogOut, Activity, 
  Server, Cpu, Database, Clock, Sparkles, Filter,
  Archive, History, ShieldAlert, Zap
} from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';
import { getAdminHeaders, getStoredUser, getBackendUrl, clearAdminAuth, ADMIN_LOGIN_PATH } from '@/lib/adminAuth';
import { normalizeFileUrl } from '@/lib/cloudinary';

interface AdminMetrics {
  activeRooms: number;
  totalUsers: number;
  totalFiles: number;
  totalStorageMB: string;
  totalDownloads: number;
  onlineMembers: number;
  proUsers: number;
  serverUptimeSeconds: number;
  memoryUsageMB: string;
  lifetime?: {
    totalRoomsCreated: number;
    totalFilesUploaded: number;
    totalDownloadsServed: number;
    totalStorageMBProcessed: string;
    totalArchivedSessions: number;
  };
}

interface AdminRoom {
  pin: string;
  name: string;
  createdBy: string;
  status: string;
  isLocked: boolean;
  isMuted: boolean;
  autoDeleteTimer: string;
  createdAt: string;
  fileCount: number;
  memberCount: number;
  storageMB: string;
  storageLimitMB: number;
}

interface AdminArchive {
  _id: string;
  pin: string;
  name: string;
  createdBy: string;
  totalParticipants: number;
  totalFiles: number;
  totalStorageMB: string;
  totalDownloads: number;
  createdAt: string;
  destroyedAt: string;
  destructionReason: string;
  durationMinutes: number;
}

interface AdminAuditLog {
  _id: string;
  adminEmail: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

interface AdminFile {
  _id: string;
  roomPin: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  fileType: string;
  fileUrl: string;
  cloudinaryPublicId?: string;
  senderName: string;
  totalDownloads?: number;
  createdAt?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'premium' | 'student';
  country?: string;
  state?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const addToast = useRoomStore((state) => state.addToast);
  const showConfirm = useRoomStore((state) => state.showConfirm);
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);

  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'archives' | 'files' | 'users' | 'audit' | 'broadcast'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [archives, setArchives] = useState<AdminArchive[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filters
  const [roomSearch, setRoomSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>('info');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const BACKEND_URL = getBackendUrl();

  const resolveFileLink = (url?: string) => {
    if (!url) return '#';
    let resolved = normalizeFileUrl(url);
    if (resolved.startsWith('/uploads/')) {
      resolved = `${BACKEND_URL}${resolved}`;
    }
    return resolved;
  };

  // Verify Admin Authentication
  useEffect(() => {
    const user = loggedInUser || getStoredUser();
    if (!user) {
      router.push(ADMIN_LOGIN_PATH);
      return;
    }
    if (user.role !== 'admin') {
      addToast('Access Denied: Admin privileges required.', 'error');
      router.push(ADMIN_LOGIN_PATH);
      return;
    }
    if (!loggedInUser && user) {
      setLoggedInUser(user);
    }
  }, [loggedInUser, router, addToast, setLoggedInUser]);

  // Fetch metrics and data
  const fetchData = useCallback(async () => {
    const user = loggedInUser || getStoredUser();
    if (!user || user.role !== 'admin') {
      return;
    }

    setIsRefreshing(true);
    const headers = getAdminHeaders();

    try {
      const results = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/admin/metrics`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${BACKEND_URL}/api/admin/rooms`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${BACKEND_URL}/api/admin/archives`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${BACKEND_URL}/api/admin/audit-logs`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${BACKEND_URL}/api/admin/files`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${BACKEND_URL}/api/admin/users`, { headers }).then(r => r.ok ? r.json() : null),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) {
        setMetrics(results[0].value);
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        setRooms(results[1].value.rooms || []);
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        setArchives(results[2].value.archives || []);
      }
      if (results[3].status === 'fulfilled' && results[3].value) {
        setAuditLogs(results[3].value.logs || []);
      }
      if (results[4].status === 'fulfilled' && results[4].value) {
        setFiles(results[4].value.files || []);
      }
      if (results[5].status === 'fulfilled' && results[5].value) {
        setUsers(results[5].value.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [BACKEND_URL, loggedInUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Admin Actions: Delete Room
  const handleDeleteRoom = (pin: string) => {
    showConfirm(
      'Terminate Room & Purge Files',
      `Are you sure you want to permanently terminate Room #${pin}? All active messages and Cloudinary assets will be destroyed immediately. A privacy-safe summary will be archived.`,
      async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/admin/rooms/${pin}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            addToast(`Room #${pin} terminated and archived.`, 'success');
            fetchData();
          } else {
            addToast('Failed to terminate room.', 'error');
          }
        } catch (e) {
          addToast('Error terminating room.', 'error');
        }
      }
    );
  };

  // Admin Actions: Toggle Room Lock
  const handleToggleLock = async (pin: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/rooms/${pin}/toggle-lock`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        addToast(data.message, 'info');
        fetchData();
      }
    } catch (e) {
      addToast('Failed to toggle lock.', 'error');
    }
  };

  // Admin Actions: Delete File
  const handleDeleteFile = (id: string, fileName: string) => {
    showConfirm(
      'Purge File',
      `Are you sure you want to delete "${fileName}" from Cloudinary and room feed?`,
      async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/admin/files/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            addToast(`File ${fileName} purged.`, 'success');
            fetchData();
          }
        } catch (e) {
          addToast('Failed to delete file.', 'error');
        }
      }
    );
  };

  // Admin Actions: Update User Plan
  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/plan`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        addToast(`User plan updated to ${plan}.`, 'success');
        fetchData();
      }
    } catch (e) {
      addToast('Failed to update plan.', 'error');
    }
  };

  // Admin Actions: Update User Role
  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        addToast(`User role updated to ${role}.`, 'success');
        fetchData();
      }
    } catch (e) {
      addToast('Failed to update role.', 'error');
    }
  };

  // Admin Actions: Delete User
  const handleDeleteUser = (id: string, email: string) => {
    showConfirm(
      'Delete User Account',
      `Are you sure you want to delete user ${email}? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            addToast(`User ${email} deleted.`, 'success');
            fetchData();
          }
        } catch (e) {
          addToast('Failed to delete user.', 'error');
        }
      }
    );
  };

  // Admin Actions: Send Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          title: broadcastTitle.trim() || 'System Announcement',
          message: broadcastMessage.trim(),
          type: broadcastType,
        }),
      });

      if (res.ok) {
        addToast('Global broadcast published to all active rooms!', 'success');
        setBroadcastTitle('');
        setBroadcastMessage('');
        fetchData();
      } else {
        addToast('Failed to publish broadcast.', 'error');
      }
    } catch (e) {
      addToast('Broadcast failed.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleAdminLogout = () => {
    clearAdminAuth();
    setLoggedInUser(null);
    addToast('Admin signed out.', 'info');
    router.push(ADMIN_LOGIN_PATH);
  };

  // Filtered lists
  const filteredRooms = rooms.filter(
    (r) =>
      r.pin.includes(roomSearch) ||
      r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.createdBy.toLowerCase().includes(roomSearch.toLowerCase())
  );

  const filteredArchives = archives.filter(
    (a) =>
      a.pin.includes(archiveSearch) ||
      a.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      a.createdBy.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      a.destructionReason.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  const filteredFiles = files.filter(
    (f) =>
      f.fileName.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.roomPin.includes(fileSearch) ||
      (f.senderName && f.senderName.toLowerCase().includes(fileSearch.toLowerCase()))
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
        <header className="border-b border-white/[0.08] bg-[#050608]/90 h-16 flex items-center px-6">
          <Image src="/logo.png?v=6" alt="Lab Buddies Logo" width={120} height={40} className="h-10 w-auto object-contain my-auto" />
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#71717a] font-mono">Loading Admin Portal...</span>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Admin Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-85 transition-opacity flex items-center">
              <Image src="/logo.png?v=6" alt="Lab Buddies Logo" width={120} height={40} className="h-10 sm:h-11 w-auto object-contain my-auto" />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#FFD600]/15 border border-[#FFD600]/30 text-[#FFD600] px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Master Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[#a1a1aa] hover:text-[#f4f4f5] transition-all flex items-center gap-1.5 text-xs cursor-pointer select-none"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FFD600]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <span className="text-xs text-[#a1a1aa] hidden md:inline truncate max-w-[150px]">
                {loggedInUser?.email}
              </span>
              <button
                onClick={handleAdminLogout}
                className="p-2 rounded-xl border border-[#EF4444]/25 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/[0.02] border border-white/[0.08] rounded-2xl select-none">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard },
            { id: 'rooms', label: `Active Rooms (${rooms.length})`, icon: DoorOpen },
            { id: 'archives', label: `Room Archives (${archives.length})`, icon: Archive },
            { id: 'files', label: `Files & Cloudinary (${files.length})`, icon: HardDrive },
            { id: 'users', label: `Users & Plans (${users.length})`, icon: Users },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History },
            { id: 'broadcast', label: 'System Broadcast', icon: Radio },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FFD600] text-black shadow-[0_0_20px_rgba(255,214,0,0.3)]'
                    : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Overview & Metrics */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            
            {/* Live Real-Time Active Sessions */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#FFD600] uppercase tracking-wider">
                ⚡ Live Active Session Status
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Active Rooms */}
                <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                  <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                    <span>Active Rooms</span>
                    <DoorOpen className="w-4 h-4 text-[#FFD600]" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.activeRooms ?? 0}
                  </span>
                  <span className="text-[11px] text-[#22C55E]">Live Ephemeral Rooms</span>
                </div>

                {/* Online Users */}
                <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                  <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                    <span>Online Members</span>
                    <Activity className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.onlineMembers ?? 0}
                  </span>
                  <span className="text-[11px] text-[#71717a]">Connected via WebSockets</span>
                </div>

                {/* Cloudinary Storage */}
                <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                  <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                    <span>Active Cloudinary Storage</span>
                    <HardDrive className="w-4 h-4 text-[#FF6A00]" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.totalStorageMB ?? '0.00'} <span className="text-sm font-normal text-[#71717a]">MB</span>
                  </span>
                  <span className="text-[11px] text-[#71717a]">{metrics?.totalFiles ?? 0} active files</span>
                </div>

                {/* Registered Users */}
                <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                  <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                    <span>Total Users</span>
                    <Users className="w-4 h-4 text-[#A855F7]" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.totalUsers ?? 0}
                  </span>
                  <span className="text-[11px] text-[#A855F7]">{metrics?.proUsers ?? 0} Pro/Premium</span>
                </div>
              </div>
            </div>

            {/* Lifetime Persistent Platform Counters */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">
                📈 Preserved Lifetime Platform Metrics (All-Time)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 flex flex-col gap-1 border border-[#3B82F6]/20 bg-[#3B82F6]/5">
                  <span className="text-xs text-[#a1a1aa] font-semibold uppercase">Total Rooms Opened</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.lifetime?.totalRoomsCreated ?? 0}
                  </span>
                  <span className="text-[11px] text-[#3B82F6]">All-time sessions</span>
                </div>

                <div className="glass-card p-5 flex flex-col gap-1 border border-[#3B82F6]/20 bg-[#3B82F6]/5">
                  <span className="text-xs text-[#a1a1aa] font-semibold uppercase">Total Files Uploaded</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.lifetime?.totalFilesUploaded ?? 0}
                  </span>
                  <span className="text-[11px] text-[#3B82F6]">Lifetime uploads</span>
                </div>

                <div className="glass-card p-5 flex flex-col gap-1 border border-[#3B82F6]/20 bg-[#3B82F6]/5">
                  <span className="text-xs text-[#a1a1aa] font-semibold uppercase">Total Downloads Served</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.lifetime?.totalDownloadsServed ?? 0}
                  </span>
                  <span className="text-[11px] text-[#3B82F6]">Files downloaded</span>
                </div>

                <div className="glass-card p-5 flex flex-col gap-1 border border-[#3B82F6]/20 bg-[#3B82F6]/5">
                  <span className="text-xs text-[#a1a1aa] font-semibold uppercase">Total Bandwidth Handled</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#f4f4f5]">
                    {metrics?.lifetime?.totalStorageMBProcessed ?? '0.00'} <span className="text-sm font-normal text-[#71717a]">MB</span>
                  </span>
                  <span className="text-[11px] text-[#3B82F6]">Lifetime data transferred</span>
                </div>
              </div>
            </div>

            {/* Server Process Health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                  <span>Server RAM Usage</span>
                  <Cpu className="w-4 h-4 text-[#06B6D4]" />
                </div>
                <span className="text-2xl font-black text-[#f4f4f5]">
                  {metrics?.memoryUsageMB ?? '0'} <span className="text-sm font-normal text-[#71717a]">MB heap</span>
                </span>
                <span className="text-[11px] text-[#71717a]">Active Node.js process</span>
              </div>

              <div className="glass-card p-5 flex flex-col gap-1 border border-white/[0.08]">
                <div className="flex items-center justify-between text-[#71717a] text-xs font-medium uppercase">
                  <span>Server Uptime</span>
                  <Clock className="w-4 h-4 text-[#22C55E]" />
                </div>
                <span className="text-xl sm:text-2xl font-black text-[#f4f4f5]">
                  {metrics?.serverUptimeSeconds ? Math.floor(metrics.serverUptimeSeconds / 3600) + 'h ' + Math.floor((metrics.serverUptimeSeconds % 3600) / 60) + 'm ' + (metrics.serverUptimeSeconds % 60) + 's' : '0s'}
                </span>
                <span className="text-[11px] text-[#22C55E]">Process healthy & operational</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Active Rooms Hub */}
        {activeTab === 'rooms' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search by PIN, Room Name, or Host..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="neo-input has-icon-left w-full text-xs py-2"
                />
              </div>
              <span className="text-xs text-[#71717a] select-none">
                Showing {filteredRooms.length} of {rooms.length} active rooms
              </span>
            </div>

            {filteredRooms.length === 0 ? (
              <div className="glass-card p-12 text-center text-[#71717a] text-sm">
                No active rooms found matching your search.
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-[#a1a1aa] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">PIN</th>
                        <th className="py-3 px-4">Room Name</th>
                        <th className="py-3 px-4">Host / Creator</th>
                        <th className="py-3 px-4">Online</th>
                        <th className="py-3 px-4">Files</th>
                        <th className="py-3 px-4">Storage</th>
                        <th className="py-3 px-4">Self-Destruct</th>
                        <th className="py-3 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredRooms.map((room) => (
                        <tr key={room.pin} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#FFD600]">
                            #{room.pin}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#f4f4f5] max-w-[160px] truncate">
                            {room.name}
                          </td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{room.createdBy}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1 text-[#22C55E]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                              {room.memberCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{room.fileCount} files</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">
                            {room.storageMB} / {room.storageLimitMB} MB
                          </td>
                          <td className="py-3 px-4 text-[#71717a]">{room.autoDeleteTimer}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleLock(room.pin)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  room.isLocked
                                    ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                                    : 'bg-white/[0.04] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5]'
                                }`}
                                title={room.isLocked ? 'Room is Locked (Click to Unlock)' : 'Room is Unlocked (Click to Lock)'}
                              >
                                {room.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => handleDeleteRoom(room.pin)}
                                className="p-1.5 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all cursor-pointer"
                                title="Terminate Room & Purge All Cloudinary Assets"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Room Archives (Privacy-Safe Session Summaries) */}
        {activeTab === 'archives' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search archived room PIN, name, or reason..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="neo-input has-icon-left w-full text-xs py-2"
                />
              </div>
              <span className="text-xs text-[#71717a] select-none">
                Showing {filteredArchives.length} of {archives.length} archived room sessions
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#a1a1aa] leading-relaxed">
              🔒 <span className="text-[#FFD600] font-bold">Privacy-Preserving Architecture:</span> Only high-level session metadata is preserved here. All chat messages, notes, and Cloudinary media files were permanently purged upon room destruction.
            </div>

            {filteredArchives.length === 0 ? (
              <div className="glass-card p-12 text-center text-[#71717a] text-sm">
                No archived room sessions recorded yet.
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-[#a1a1aa] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Room PIN</th>
                        <th className="py-3 px-4">Room Name</th>
                        <th className="py-3 px-4">Host</th>
                        <th className="py-3 px-4">Buddies</th>
                        <th className="py-3 px-4">Files Hosted</th>
                        <th className="py-3 px-4">Storage Handled</th>
                        <th className="py-3 px-4">Downloads</th>
                        <th className="py-3 px-4">Session Duration</th>
                        <th className="py-3 px-4">Destruction Reason</th>
                        <th className="py-3 px-4 text-right">Destroyed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredArchives.map((a) => (
                        <tr key={a._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#FFD600]">#{a.pin}</td>
                          <td className="py-3 px-4 font-semibold text-[#f4f4f5] max-w-[150px] truncate">{a.name}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{a.createdBy}</td>
                          <td className="py-3 px-4 text-[#f4f4f5]">{a.totalParticipants}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{a.totalFiles} files</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{a.totalStorageMB} MB</td>
                          <td className="py-3 px-4 text-[#3B82F6] font-semibold">{a.totalDownloads}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{a.durationMinutes} mins</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.destructionReason === 'Admin Terminated'
                                ? 'bg-[#EF4444]/15 text-[#EF4444]'
                                : a.destructionReason === 'Host Deleted'
                                ? 'bg-[#FFD600]/15 text-[#FFD600]'
                                : 'bg-white/[0.06] text-[#a1a1aa]'
                            }`}>
                              {a.destructionReason}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-[#71717a]">
                            {new Date(a.destroyedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Files & Cloudinary Hub */}
        {activeTab === 'files' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search file name, room PIN, or uploader..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="neo-input has-icon-left w-full text-xs py-2"
                />
              </div>
              <span className="text-xs text-[#71717a] select-none">
                Showing {filteredFiles.length} of {files.length} active files
              </span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="glass-card p-12 text-center text-[#71717a] text-sm">
                No active uploaded files found on Cloudinary or local storage.
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-[#a1a1aa] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">File Name</th>
                        <th className="py-3 px-4">Room</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Uploader</th>
                        <th className="py-3 px-4">Downloads</th>
                        <th className="py-3 px-4">Cloudinary Public ID</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredFiles.map((file) => (
                        <tr key={file._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#f4f4f5] max-w-[200px] truncate">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] uppercase font-bold text-[#FFD600]">
                                {file.fileType || 'FILE'}
                              </span>
                              <span className="truncate">{file.fileName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#FFD600]">#{file.roomPin}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{file.fileSize}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{file.senderName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] font-bold text-[10px]">
                              📥 {file.totalDownloads ?? 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#71717a] font-mono text-[10px] max-w-[150px] truncate">
                            {file.cloudinaryPublicId || 'Local Storage'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={resolveFileLink(file.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5] transition-all cursor-pointer"
                                title="Open / Preview File"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file._id, file.fileName)}
                                className="p-1.5 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all cursor-pointer"
                                title="Purge File from Cloudinary & DB"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Users Directory & Plan Management */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="neo-input has-icon-left w-full text-xs py-2"
                />
              </div>
              <span className="text-xs text-[#71717a] select-none">
                Showing {filteredUsers.length} of {users.length} registered users
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="glass-card p-12 text-center text-[#71717a] text-sm">
                No users found.
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-[#a1a1aa] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">User Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Membership Plan</th>
                        <th className="py-3 px-4">Verified</th>
                        <th className="py-3 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#f4f4f5]">{user.name}</td>
                          <td className="py-3 px-4 text-[#a1a1aa]">{user.email}</td>
                          <td className="py-3 px-4">
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                              className="bg-black/50 border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-[#f4f4f5] focus:border-[#FFD600] outline-none cursor-pointer"
                            >
                              <option value="user" className="bg-[#0f0f10]">User</option>
                              <option value="admin" className="bg-[#0f0f10]">Admin ⭐</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={user.plan || 'free'}
                              onChange={(e) => handleUpdatePlan(user._id, e.target.value)}
                              className="bg-black/50 border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-[#FFD600] font-bold focus:border-[#FFD600] outline-none cursor-pointer"
                            >
                              <option value="free" className="bg-[#0f0f10] text-[#a1a1aa]">Free (5 MB cap)</option>
                              <option value="pro" className="bg-[#0f0f10] text-[#FFD600]">Pro (50 MB cap)</option>
                              <option value="premium" className="bg-[#0f0f10] text-[#22C55E]">Premium</option>
                              <option value="student" className="bg-[#0f0f10] text-[#3B82F6]">Student</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            {user.isVerified ? (
                              <span className="text-[#22C55E] flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-[#71717a]">Unverified</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user._id, user.email)}
                              className="p-1.5 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] transition-all cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Admin Action Audit Trail */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-4">
            <span className="text-xs text-[#71717a] select-none">
              Showing recent {auditLogs.length} administrator actions
            </span>

            {auditLogs.length === 0 ? (
              <div className="glass-card p-12 text-center text-[#71717a] text-sm">
                No admin actions recorded yet.
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0f0f10]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-[#a1a1aa] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Admin Email</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#f4f4f5]">{log.adminEmail}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-[#FFD600]/15 text-[#FFD600] font-mono text-[10px] font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#a1a1aa] font-mono">{log.target}</td>
                          <td className="py-3 px-4 text-[#71717a]">{log.details}</td>
                          <td className="py-3 px-4 text-right text-[#71717a]">
                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: System Broadcast */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl mx-auto w-full">
            <div className="glass-card p-6 sm:p-8 border border-white/[0.08] flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-[#FF6A00] flex items-center justify-center">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-[#f4f4f5]">Global Live Broadcast</h2>
                  <p className="text-xs text-[#71717a]">
                    Push a real-time banner or alert to all connected rooms and users immediately.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Quick Preset Templates (1-Click Fill)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: '⚠️ Server Maintenance (10m)',
                      title: 'Scheduled Server Maintenance',
                      message: 'Server will undergo a quick performance upgrade in 10 minutes (approx. 60 seconds downtime). Please save your files and active notes!',
                      type: 'warning' as const,
                    },
                    {
                      label: '🚀 E2EE Security Update',
                      title: 'Platform Upgrade: End-to-End Encryption',
                      message: 'All room messages, code snippets, and collaborative notes are now secured with client-side AES-256-GCM End-to-End Encryption!',
                      type: 'info' as const,
                    },
                    {
                      label: '🚨 Emergency Restart',
                      title: 'Urgent Server Restart in 60 Seconds',
                      message: 'A high-priority security patch is being applied. Connection will automatically restore in under 30 seconds.',
                      type: 'alert' as const,
                    },
                    {
                      label: '🎁 Free Storage Boost',
                      title: 'Storage Boost Activated',
                      message: 'Exam season bonus: All active rooms have received expanded high-speed file sharing capacity!',
                      type: 'info' as const,
                    },
                    {
                      label: '🛡️ Fair Usage Notice',
                      title: 'Community Guidelines & Privacy',
                      message: 'Reminder: Rooms and shared files self-destruct automatically. Please respect community guidelines and avoid copyrighted media.',
                      type: 'warning' as const,
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBroadcastTitle(preset.title);
                        setBroadcastMessage(preset.message);
                        setBroadcastType(preset.type);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-[#f4f4f5] font-medium transition-all hover:border-[#FFD600]/40 cursor-pointer select-none"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Scheduled Maintenance Notice / New Feature Alert"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="neo-input w-full text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Broadcast Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter broadcast message here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="neo-input w-full text-xs resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Alert Type</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'info', label: 'Info (Blue)' },
                      { id: 'warning', label: 'Warning (Yellow)' },
                      { id: 'alert', label: 'Critical Alert (Red)' },
                    ].map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setBroadcastType(t.id as any)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          broadcastType === t.id
                            ? 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30'
                            : 'bg-white/[0.02] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="yellow"
                  size="lg"
                  disabled={isBroadcasting}
                  className="w-full justify-center gap-2 mt-2 font-bold shadow-[0_0_20px_rgba(255,214,0,0.25)]"
                >
                  {isBroadcasting ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      <span>Publish Live Broadcast</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
