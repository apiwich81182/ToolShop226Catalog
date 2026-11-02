import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product } from '@/types/product';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined): string {
  const num = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function formatNumber(price: number | string | null | undefined): string {
  const num = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function calculateDiscountPercent(basePrice: number, discount: number): number {
  if (!basePrice || basePrice <= 0 || !discount || discount <= 0) return 0;
  const pct = (discount / basePrice) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10)); // e.g. 19.5%
}

export function calculateDiscountFromPercent(basePrice: number, percent: number): number {
  if (!basePrice || basePrice <= 0 || !percent || percent <= 0) return 0;
  const amount = (basePrice * percent) / 100;
  return Math.min(basePrice, Math.max(0, Math.round(amount * 100) / 100));
}

export function cleanAndFormatImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Convert Google Drive share link to direct image URL
  const gdriveRegex1 = /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmed.match(gdriveRegex1);
  if (match1 && match1[1]) {
    return `https://lh3.googleusercontent.com/d/${match1[1]}`;
  }

  const gdriveRegex2 = /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmed.match(gdriveRegex2);
  if (match2 && match2[1]) {
    return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  }

  // Convert Dropbox share links
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }

  return trimmed;
}

/**
 * Check if product price is set to "สอบถาม" (Inquire / Price on Request)
 */
export function isPriceInquiry(product: {
  base_price?: number | string | null;
  final_price?: number | string | null;
} | null | undefined): boolean {
  if (!product) return false;
  const base = Number(product.base_price);
  const final = Number(product.final_price);
  return (isNaN(base) || base <= 0) && (isNaN(final) || final <= 0);
}

export function generateLineMessage(product: Product): string {
  const isInquire = isPriceInquiry(product);
  const priceDisplay = isInquire ? 'ติดต่อสอบถามราคา' : `฿${formatNumber(product.final_price)}`;

  return `สนใจสินค้า: ${product.name}
รหัสสินค้า: ${product.sku}
ราคา: ${priceDisplay}
(จากหน้าเว็บแคตาล็อก)`;
}

export function getLineOaUrl(product?: Product, lineOaId?: string): string {
  const configured = (lineOaId || process.env.NEXT_PUBLIC_LINE_OA_ID || 'https://lin.ee/ZLqm2Z6').trim();
  if (configured.startsWith('http://') || configured.startsWith('https://')) {
    return configured;
  }
  const formattedId = configured.startsWith('@') ? configured.slice(1) : configured;
  if (!product) {
    return `https://line.me/R/ti/p/@${formattedId}`;
  }
  const message = generateLineMessage(product);
  const encoded = encodeURIComponent(message);
  return `https://line.me/R/oaMessage/@${formattedId}/?text=${encoded}`;
}
