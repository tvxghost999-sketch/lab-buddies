'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  FolderOpen, Search, Download, Filter, 
  Grid, List, File, FileText, Image, Archive, 
  Code, Play, AlertCircle, FolderDown, CheckCircle2,
  Loader2, ExternalLink, Share2
} from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import { socketService } from '@/lib/socket';
import { Select } from '@/components/ui/input';
import Button from '@/components/ui/button';
import AdInterstitial from '@/components/AdInterstitial';
import { getBackendUrl } from '@/lib/adminAuth';
import { normalizeFileUrl } from '@/lib/cloudinary';
import {
  isFileCached,
  fetchAndCacheFile,
  openCachedFile,
  openBlob,
  canShareFiles,
  isPWA,
} from '@/lib/fileCache';

// ─── Per-file download state ──────────────────────────────────────────────────
type DownloadState = 'idle' | 'downloading' | 'cached';

export default function FilesPage() {
  const params = useParams();
  const pin = (params?.pin as string) || '408215';

  const feedItems = useRoomStore((state) => state.feedItems);
  const addToast  = useRoomStore((state) => state.addToast);
  const currentUser = useRoomStore((state) => state.currentUser);

  const filesList = feedItems.filter((item) => item.type === 'file');

  const [searchQuery,     setSearchQuery]     = useState('');
  const [typeFilter,      setTypeFilter]      = useState('All');
  const [activeCategory,  setActiveCategory]  = useState('All');
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid');
  const [isAdOpen,        setIsAdOpen]        = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{
    fileId: string; fileName: string; fileUrl?: string;
  } | null>(null);

  const lastDownloadTimesRef = useRef<Record<string, number>>({});

  /** Track download state per fileId */
  const [downloadStates,   setDownloadStates]   = useState<Record<string, DownloadState>>({});
  /** Track per-file download progress (0–100) */
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const BACKEND_URL  = getBackendUrl();

  // Is this a PWA install? Used to pick the right button label / icon.
  const [runningAsPWA,    setRunningAsPWA]    = useState(false);
  const [fileShareSupported, setFileShareSupported] = useState(false);

  useEffect(() => {
    setRunningAsPWA(isPWA());
    setFileShareSupported(canShareFiles());
  }, []);

  // ── On mount: check which files are already cached ────────────────────────
  useEffect(() => {
    if (filesList.length === 0) return;
    (async () => {
      const states: Record<string, DownloadState> = {};
      await Promise.all(
        filesList.map(async (file) => {
          const id = file._id || file.id;
          if (!id) return;
          if (await isFileCached(id)) states[id] = 'cached';
        }),
      );
      setDownloadStates((prev) => ({ ...prev, ...states }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesList.length]);

  // ── Resolve the full Cloudinary / backend URL ─────────────────────────────
  const resolveUrl = useCallback(
    (fileName: string, fileUrl?: string): string => {
      let targetUrl = fileUrl ? normalizeFileUrl(fileUrl) : '';
      if (!targetUrl || targetUrl.startsWith('/uploads/')) {
        targetUrl = `${BACKEND_URL}${targetUrl || `/uploads/${fileName}`}`;
      }
      return targetUrl;
    },
    [BACKEND_URL],
  );

  // ── Entry point ───────────────────────────────────────────────────────────
  const handleDownload = (fileId: string, fileName: string, fileUrl?: string) => {
    const state = downloadStates[fileId] || 'idle';

    // Already cached → open from device immediately
    if (state === 'cached') {
      openFromCache(fileId, fileName);
      return;
    }

    // Currently downloading → ignore extra clicks
    if (state === 'downloading') return;

    // 10-second anti-spam throttle
    const now = Date.now();
    if (now - (lastDownloadTimesRef.current[fileId] || 0) < 10_000) {
      addToast('Please wait before downloading again', 'warning');
      return;
    }
    lastDownloadTimesRef.current[fileId] = now;

    const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';
    if (isPremium) {
      proceedWithDownload(fileId, fileName, fileUrl);
      return;
    }

    const count = parseInt(
      typeof window !== 'undefined'
        ? localStorage.getItem('lab_buddies_downloads_count') || '0'
        : '0',
      10,
    );
    const nextCount = count + 1;

    if (nextCount > 0 && nextCount % 4 === 0) {
      setPendingDownload({ fileId, fileName, fileUrl });
      setIsAdOpen(true);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lab_buddies_downloads_count', nextCount.toString());
      }
      proceedWithDownload(fileId, fileName, fileUrl);
    }
  };

  /** Open a file that's already in the browser cache */
  const openFromCache = async (fileId: string, fileName: string) => {
    const result = await openCachedFile(fileId, fileName);
    if (result === 'failed') {
      // Cache may have been cleared by browser
      setDownloadStates((prev) => ({ ...prev, [fileId]: 'idle' }));
      addToast('Cache cleared by browser. Re-downloading…', 'warning');
    } else if (result === 'shared') {
      addToast(`Opening ${fileName} with your device apps…`, 'success');
    } else {
      addToast(`Opening ${fileName}…`, 'success');
    }
  };

  /**
   * Main download logic:
   *  1. Track server-side
   *  2. Fetch + cache the blob (with progress)
   *  3. Open using the best available method for this device/context
   */
  const proceedWithDownload = async (
    fileId: string,
    fileName: string,
    fileUrl?: string,
  ) => {
    socketService.trackDownload(pin, fileId, currentUser?.id || currentUser?.name || 'anonymous');

    const targetUrl = resolveUrl(fileName, fileUrl);

    setDownloadStates((prev)   => ({ ...prev, [fileId]: 'downloading' }));
    setDownloadProgress((prev) => ({ ...prev, [fileId]: 0 }));
    setIsAdOpen(false);
    setPendingDownload(null);

    addToast(`Downloading ${fileName}…`, 'success');

    const blob = await fetchAndCacheFile(
      fileId,
      targetUrl,
      fileName,
      (pct) => setDownloadProgress((prev) => ({ ...prev, [fileId]: pct })),
    );

    if (!blob) {
      // CORS / network error — fallback to raw URL
      window.open(targetUrl, '_blank');
      setDownloadStates((prev) => ({ ...prev, [fileId]: 'idle' }));
      return;
    }

    // Open the blob using the best method
    const result = await openBlob(blob, fileName);

    setDownloadStates((prev) => ({ ...prev, [fileId]: 'cached' }));

    if (result === 'shared') {
      addToast(`${fileName} — choose an app to open it!`, 'success');
    } else if (result === 'downloaded') {
      addToast(`${fileName} saved — tap it in your downloads bar`, 'success');
    } else if (result === 'opened-tab') {
      addToast(`${fileName} opened in a new tab`, 'success');
    } else {
      addToast(`${fileName} cached — tap Open to view anytime`, 'success');
    }
  };

  // ── Category helpers ──────────────────────────────────────────────────────
  const getFileCategory = (type?: string): string => {
    if (!type) return 'Others';
    const ext = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'Images';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'Documents';
    if (['cpp', 'c', 'py', 'js', 'ts', 'java', 'html', 'css'].includes(ext)) return 'Code';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
    return 'Others';
  };

  const filteredFiles = filesList.filter((file) => {
    const matchesSearch   = file.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || getFileCategory(file.fileType) === activeCategory;
    const matchesDropdown = typeFilter === 'All' || file.fileType?.toUpperCase() === typeFilter.toUpperCase();
    return matchesSearch && matchesCategory && matchesDropdown;
  });

  // ── File card design ──────────────────────────────────────────────────────
  const renderFileDesign = (ext?: string) => {
    const type = ext?.toLowerCase() || '';
    let accentColor = '#4F7CFF';
    let icon = <File className="w-8 h-8" />;

    if      (type === 'pdf')                            { accentColor = '#EF4444'; icon = <FileText className="w-8 h-8" />; }
    else if (type === 'zip' || type === 'rar')          { accentColor = '#8B5CF6'; icon = <Archive  className="w-8 h-8" />; }
    else if (['png','jpg','jpeg'].includes(type))        { accentColor = '#22C55E'; icon = <Image    className="w-8 h-8" />; }
    else if (['cpp','js','py','java','html'].includes(type)) { accentColor = '#4F7CFF'; icon = <Code  className="w-8 h-8" />; }
    else if (type === 'pptx' || type === 'ppt')         { accentColor = '#FF6A00'; icon = <Play     className="w-8 h-8" />; }
    else if (type === 'xlsx' || type === 'xls')         { accentColor = '#22C55E'; icon = <FileText className="w-8 h-8" />; }

    return (
      <div
        className="h-24 flex items-center justify-center relative rounded-t-2xl border-b border-white/[0.06]"
        style={{ background: `${accentColor}10`, color: accentColor }}
      >
        {icon}
        <span
          className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 border rounded"
          style={{ borderColor: `${accentColor}25`, background: `${accentColor}10`, color: accentColor }}
        >
          {type.toUpperCase()}
        </span>
      </div>
    );
  };

  /**
   * Render the action button depending on download state.
   * In PWA with file-share support: cached files show a "Share / Open" button.
   * In normal browser: cached files show "Open" (triggers <a download>).
   */
  const renderActionButton = (
    fileId: string,
    fileName: string,
    fileUrl?: string,
    compact = false,
  ) => {
    const state    = downloadStates[fileId] || 'idle';
    const progress = downloadProgress[fileId] ?? 0;

    const baseCompact  = 'gap-1 px-3 py-1.5 text-xs justify-center';
    const baseFullWidth = 'w-full gap-1.5 mt-1 text-[11px] justify-center';
    const cls = compact ? baseCompact : baseFullWidth;

    if (state === 'cached') {
      // PWA + Web Share API → "Open with…" (share icon)
      // Desktop / no share  → "Open" (external link icon)
      const ButtonIcon  = fileShareSupported && runningAsPWA ? Share2 : ExternalLink;
      const ButtonLabel = fileShareSupported && runningAsPWA
        ? (compact ? 'Open' : 'Open with…')
        : (compact ? 'Open' : 'Open (cached)');

      return (
        <Button
          variant="white"
          size="sm"
          onClick={() => handleDownload(fileId, fileName, fileUrl)}
          className={`${cls} bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20`}
          title="Stored on device — no download needed"
        >
          <ButtonIcon className="w-3.5 h-3.5" />
          {ButtonLabel}
        </Button>
      );
    }

    if (state === 'downloading') {
      return (
        <Button
          variant="white"
          size="sm"
          disabled
          className={`${cls} opacity-80 cursor-not-allowed`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {compact ? `${progress}%` : `Downloading ${progress}%`}
        </Button>
      );
    }

    return (
      <Button
        variant="white"
        size="sm"
        onClick={() => handleDownload(fileId, fileName, fileUrl)}
        className={cls}
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </Button>
    );
  };

  const cachedCount = Object.values(downloadStates).filter((s) => s === 'cached').length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-0">

      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#f4f4f5] flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#FF6A00]" />
            Shared Files
          </h1>
          <p className="text-xs text-[#71717a]">
            Downloaded files open instantly from your device — no re-download needed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="border border-white/[0.08] bg-white/[0.03] rounded-xl px-3.5 py-1.5 text-xs text-[#f4f4f5]">
            Total: {filesList.length}
          </div>
          {cachedCount > 0 && (
            <div className="border border-emerald-500/25 bg-emerald-500/10 rounded-xl px-3.5 py-1.5 text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {cachedCount} on device
            </div>
          )}
        </div>
      </div>

      {/* PWA info banner */}
      {runningAsPWA && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] text-xs text-blue-400">
          <Share2 className="w-4 h-4 shrink-0" />
          <span>
            You&apos;re on the <strong>app</strong>. Downloaded files will show an{' '}
            <strong>&quot;Open with&quot;</strong> sheet so you can open them in any installed app on your device.
          </span>
        </div>
      )}

      {/* Cached-files bandwidth banner */}
      {cachedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-xs text-emerald-400">
          <FolderDown className="w-4 h-4 shrink-0" />
          <span>
            <strong>{cachedCount} file{cachedCount > 1 ? 's' : ''}</strong> stored on your device — opening them won&apos;t use any server bandwidth.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f0f10] border border-white/[0.08] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
        <div className="relative w-full md:w-80 flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input has-icon-left pr-4 py-2 text-sm w-full"
          />
        </div>

        <div className="flex w-full md:w-auto items-center justify-end gap-3 select-none">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Filter className="w-4 h-4 text-[#71717a]" />
            <div className="w-44">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'All',  label: 'All Types' },
                  { value: 'PDF',  label: 'PDF Documents' },
                  { value: 'ZIP',  label: 'ZIP Archives' },
                  { value: 'PNG',  label: 'PNG Images' },
                  { value: 'CPP',  label: 'C++ Source' },
                  { value: 'PPTX', label: 'PowerPoint' },
                  { value: 'XLSX', label: 'Excel Sheets' },
                  { value: 'DOCX', label: 'Word Docs' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 hover:bg-white/[0.06] transition-colors ${viewMode === 'grid' ? 'text-[#FFD600] bg-white/[0.04]' : 'text-[#a1a1aa]'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 hover:bg-white/[0.06] transition-colors ${viewMode === 'list' ? 'text-[#FFD600] bg-white/[0.04]' : 'text-[#a1a1aa]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files display */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 select-none border border-white/[0.08] rounded-2xl bg-[#0f0f10]">
          <AlertCircle className="w-10 h-10 text-[#FF6A00]" />
          <h3 className="text-sm font-semibold text-[#f4f4f5]">No files match filters</h3>
          <p className="text-xs text-[#71717a] max-w-xs">
            Try adjusting your search query, or select another category tab.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const fileId  = file._id || file.id;
            const state   = downloadStates[fileId] || 'idle';
            const isCached = state === 'cached';

            return (
              <div
                key={fileId}
                className={`group overflow-hidden flex flex-col justify-between border rounded-2xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${
                  isCached
                    ? 'border-emerald-500/25 bg-[#0f1a0f]'
                    : 'border-white/[0.08] bg-[#0f0f10] hover:border-white/15'
                }`}
              >
                {/* "On device" ribbon */}
                {isCached && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved on device
                  </div>
                )}

                {renderFileDesign(file.fileType)}

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#f4f4f5] truncate block" title={file.fileName}>
                      {file.fileName}
                    </span>
                    <span className="text-[10px] text-[#71717a] mt-0.5 flex items-center gap-1.5">
                      <span>{file.fileSize}</span>
                      {file.totalDownloads !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-[#a1a1aa]">{file.totalDownloads} downloads</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px] text-[#71717a] select-none">
                    <span>By {file.senderName}</span>
                    <span>{file.timestamp}</span>
                  </div>

                  {renderActionButton(fileId, file.fileName || '', file.fileUrl)}

                  {/* Progress bar */}
                  {state === 'downloading' && (
                    <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FFD600] rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress[fileId] ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List */
        <div className="border border-white/[0.08] bg-[#0f0f10] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="divide-y divide-white/[0.06] select-none">
            {filteredFiles.map((file) => {
              const fileId   = file._id || file.id;
              const state    = downloadStates[fileId] || 'idle';
              const isCached = state === 'cached';

              return (
                <div
                  key={fileId}
                  className={`flex items-center justify-between p-4 transition-colors gap-4 ${
                    isCached ? 'bg-emerald-500/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold ${
                      isCached
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-white/[0.03] border-white/[0.08] text-[#FFD600]'
                    }`}>
                      {isCached ? <CheckCircle2 className="w-4 h-4" /> : file.fileType?.toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#f4f4f5] truncate">{file.fileName}</span>
                      <span className="text-[10px] text-[#71717a]">
                        {file.fileSize}
                        {file.totalDownloads !== undefined ? ` • ${file.totalDownloads} dls` : ''}
                        {' '}• {file.senderName} ({file.timestamp})
                        {isCached && <span className="ml-1 text-emerald-400 font-medium">• on device</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {state === 'downloading' && (
                      <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FFD600] rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress[fileId] ?? 0}%` }}
                        />
                      </div>
                    )}
                    {renderActionButton(fileId, file.fileName || '', file.fileUrl, true)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 justify-center mt-4 select-none">
        {['All', 'Images', 'Documents', 'Code', 'Archives', 'Others'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 border rounded-xl text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/25'
                : 'bg-white/[0.02] border-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/[0.04]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AdInterstitial
        isOpen={isAdOpen}
        onComplete={() => {
          if (typeof window !== 'undefined') {
            const c = parseInt(localStorage.getItem('lab_buddies_downloads_count') || '0', 10);
            localStorage.setItem('lab_buddies_downloads_count', (c + 1).toString());
          }
          if (pendingDownload) {
            proceedWithDownload(pendingDownload.fileId, pendingDownload.fileName, pendingDownload.fileUrl);
          }
        }}
        onClose={() => {
          setIsAdOpen(false);
          setPendingDownload(null);
          addToast('Ad was cancelled. Download aborted.', 'warning');
        }}
        actionLabel="Unlocking Download"
      />
    </div>
  );
}
