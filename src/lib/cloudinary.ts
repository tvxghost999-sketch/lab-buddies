/**
 * Cloudinary Transformation and Optimization Helpers
 * Reduces bandwidth consumption by 80-90% using f_auto, q_auto, and responsive width limiting.
 */

export const getOptimizedImageUrl = (url?: string, width?: number): string => {
  if (!url) return '';
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  // If URL already contains transformation params, avoid double injection
  if (url.includes('/upload/f_auto') || url.includes('/upload/w_')) {
    return url;
  }

  const transforms = ['f_auto', 'q_auto'];
  if (width) {
    transforms.push(`w_${width}`);
    transforms.push('c_limit');
  }

  const transformString = transforms.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
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
