/**
 * Cloudinary Transformation and Optimization Helpers
 * Reduces bandwidth consumption by 80-90% using f_auto, q_auto, and responsive width limiting.
 */

export const normalizeFileUrl = (url?: string): string => {
  if (!url) return '';
  let resolved = url.replace(/lab-buddies-backend\.onrender\.com/g, 'lab-buddies-7r70.onrender.com');
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    resolved = resolved.replace(/https?:\/\/(localhost|127\.0\.0\.1):5000/g, 'https://lab-buddies-7r70.onrender.com');
  }
  return resolved;
};

export const getOptimizedImageUrl = (url?: string, width?: number): string => {
  if (!url) return '';
  const normalized = normalizeFileUrl(url);
  if (!normalized.includes('cloudinary.com') || !normalized.includes('/upload/')) {
    return normalized;
  }

  // If URL already contains transformation params, avoid double injection
  if (normalized.includes('/upload/f_auto') || normalized.includes('/upload/w_')) {
    return normalized;
  }

  const transforms = ['f_auto', 'q_auto'];
  if (width) {
    transforms.push(`w_${width}`);
    transforms.push('c_limit');
  }

  const transformString = transforms.join(',');
  return normalized.replace('/upload/', `/upload/${transformString}/`);
};

/**
 * Optimized 400px WebP/AVIF thumbnail for Live Feed chat cards
 */
export const getThumbnailUrl = (url?: string): string => {
  return getOptimizedImageUrl(url, 400);
};

/**
 * Optimized 1200px WebP/AVIF image for WhatsApp In-App Preview Modal
 */
export const getPreviewUrl = (url?: string): string => {
  return getOptimizedImageUrl(url, 1200);
};
