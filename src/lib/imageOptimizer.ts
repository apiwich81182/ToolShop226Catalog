/**
 * Client-side Image Optimization Utility
 * Automatically compresses, resizes, and converts user-uploaded photos to modern WebP format
 * before sending to Supabase Storage or server.
 *
 * Typical reduction: 5MB camera photo -> 60KB - 150KB WebP (95%+ smaller)
 * Resolution: Capped at 1200x1200 while preserving exact aspect ratio.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (default 0.82)
}

export async function compressAndResizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  // If running in SSR or file is not an image, return original
  if (typeof window === 'undefined' || !file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // If already an SVG or tiny vector, keep original
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Check if image is already small in dimensions
      if (width <= maxWidth && height <= maxHeight && file.size < 150 * 1024 && file.type === 'image/webp') {
        resolve(file);
        return;
      }

      // Calculate scaled dimensions preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // High-quality bicubic-like downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'image';

      // Attempt to export as WebP, falling back to JPEG if not supported
      const tryExport = (mime: string, q: number) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const ext = mime === 'image/webp' ? 'webp' : 'jpg';
              const optimizedFile = new File([blob], `${baseName}.${ext}`, {
                type: mime,
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else if (mime === 'image/webp') {
              tryExport('image/jpeg', q);
            } else {
              resolve(file);
            }
          },
          mime,
          q
        );
      };

      tryExport('image/webp', quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Graceful fallback on error
    };

    img.src = objectUrl;
  });
}
