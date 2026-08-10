/**
 * fileCache.ts
 *
 * Smart local file caching + PWA-friendly open system.
 *
 * Strategy (in order of preference):
 *  1. Web Share API (navigator.share with File object) — triggers native
 *     "Open with…" sheet on Android/iOS PWA. Best UX, no Chrome download bar needed.
 *  2. <a download> click — triggers Chrome's download notification.
 *     Works in desktop browser but unreliable in PWA standalone mode.
 *  3. window.open(blobUrl) — fallback for desktop tabs.
 *
 * Caching uses the browser's Cache API so files are stored locally after
 * the first download, eliminating repeat Cloudinary bandwidth usage.
 */

const CACHE_NAME = 'lab-buddies-files-v1';

// ─── Capability detection ────────────────────────────────────────────────────

/** True if the browser Cache API is available */
function isCacheAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** True if we are running as an installed PWA (standalone/fullscreen) */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari standalone
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * True if the browser supports sharing File objects via Web Share API.
 * This is the best way to open files in PWA — triggers the native "Open with" sheet.
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    'share' in navigator &&
    'canShare' in navigator &&
    navigator.canShare({ files: [new File([], 'test')] })
  );
}

// ─── Cache key helpers ───────────────────────────────────────────────────────

function cacheKey(fileId: string): string {
  return `/__file_cache__/${fileId}`;
}

// ─── Cache read/write ────────────────────────────────────────────────────────

/** Returns true if the file is already stored in the local browser cache */
export async function isFileCached(fileId: string): Promise<boolean> {
  if (!isCacheAvailable()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(cacheKey(fileId));
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Fetch a file from the network, store it in the browser cache, and
 * return the Blob for immediate use.
 *
 * @param onProgress  Optional 0–100 progress callback (only fires when
 *                    the server sends a Content-Length header)
 */
export async function fetchAndCacheFile(
  fileId: string,
  fileUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<Blob | null> {
  try {
    const response = await fetch(fileUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentLength = response.headers.get('Content-Length');
    let blob: Blob;

    if (contentLength && onProgress) {
      const total = parseInt(contentLength, 10);
      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let received = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            onProgress(Math.round((received / total) * 100));
          }
        }
        blob = new Blob(chunks as BlobPart[]);
      } else {
        blob = await response.blob();
        onProgress(100);
      }
    } else {
      blob = await response.blob();
      onProgress?.(100);
    }

    // Persist in Cache API (if available)
    if (isCacheAvailable()) {
      const cache = await caches.open(CACHE_NAME);
      const syntheticResponse = new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-File-Id': fileId,
          'X-File-Name': fileName,
          'X-Cached-At': new Date().toISOString(),
        },
      });
      await cache.put(cacheKey(fileId), syntheticResponse);
    }

    return blob;
  } catch (err) {
    console.warn('[fileCache] fetchAndCacheFile failed:', err);
    return null;
  }
}

/** Get a cached blob from the browser cache, or null if not stored */
export async function getCachedBlob(fileId: string): Promise<Blob | null> {
  if (!isCacheAvailable()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(fileId));
    if (!response) return null;
    return response.blob();
  } catch {
    return null;
  }
}

// ─── Open / share helpers ────────────────────────────────────────────────────

/**
 * Result of an open attempt, so the UI can show the right toast/fallback.
 */
export type OpenResult =
  | 'shared'       // Opened via Web Share API (native sheet)
  | 'downloaded'   // Triggered via <a download> click
  | 'opened-tab'   // Opened in a new browser tab
  | 'failed';      // All methods failed

/**
 * Open a Blob using the best available method for the current environment.
 *
 * Priority:
 *  1. Web Share API (PWA + mobile) → "Open with…" native sheet
 *  2. <a download> click           → Chrome download bar (desktop)
 *  3. window.open(blobUrl)         → New tab (last resort)
 */
export async function openBlob(blob: Blob, fileName: string): Promise<OpenResult> {
  // 1. Web Share API — best on PWA / Android / iOS
  if (canShareFiles()) {
    try {
      // Guess MIME type from filename if blob.type is generic
      const mimeType = blob.type || guessMime(fileName);
      const file = new File([blob], fileName, { type: mimeType });
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (err: unknown) {
      // User cancelled the share sheet — not a real error
      if (err instanceof Error && err.name === 'AbortError') return 'failed';
      // Share failed for other reason — fall through to next method
      console.warn('[fileCache] Web Share failed, falling back:', err);
    }
  }

  // 2. <a download> — works reliably in desktop Chrome
  const blobUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 90_000);
    return 'downloaded';
  } catch {
    // 3. Last resort: open in new tab
    try {
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 90_000);
      return 'opened-tab';
    } catch {
      URL.revokeObjectURL(blobUrl);
      return 'failed';
    }
  }
}

/**
 * Open a file from the browser cache.
 * @returns OpenResult, or 'failed' if the file is not cached.
 */
export async function openCachedFile(
  fileId: string,
  fileName: string,
): Promise<OpenResult> {
  const blob = await getCachedBlob(fileId);
  if (!blob) return 'failed';
  return openBlob(blob, fileName);
}

/** Remove a specific file from the cache */
export async function evictCachedFile(fileId: string): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheKey(fileId));
  } catch {
    // silent
  }
}

/** Get metadata about a cached file */
export async function getCachedFileMeta(
  fileId: string,
): Promise<{ fileName: string; cachedAt: string } | null> {
  if (!isCacheAvailable()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(fileId));
    if (!response) return null;
    return {
      fileName: response.headers.get('X-File-Name') || '',
      cachedAt: response.headers.get('X-Cached-At') || '',
    };
  } catch {
    return null;
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  txt: 'text/plain',
  csv: 'text/csv',
  html: 'text/html',
  js: 'text/javascript',
  ts: 'text/typescript',
  css: 'text/css',
  py: 'text/x-python',
  cpp: 'text/x-c++src',
  c: 'text/x-csrc',
  java: 'text/x-java-source',
};

function guessMime(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
}
