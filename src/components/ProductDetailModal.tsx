'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { formatNumber, getLineOaUrl, calculateDiscountPercent, isPriceInquiry, generateLineMessage } from '@/lib/utils';
import {
  X,
  Copy,
  Check,
  Tag,
  Share2,
  Heart,
  Wrench,
  ExternalLink,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (sku: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [copiedSku, setCopiedSku] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset state when product changes
  useEffect(() => {
    setImgError(false);
    setCopiedSku(false);
    setCopiedLink(false);
  }, [product]);

  if (!isOpen || !product) return null;

  const isInquirePrice = isPriceInquiry(product);
  const hasDiscount = !isInquirePrice && Number(product.discount) > 0;
  const discountPercent = calculateDiscountPercent(product.base_price, product.discount);
  const lineUrl = getLineOaUrl(product);

  const handleCopySku = async () => {
    try {
      await navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  };

  const handleShare = async () => {
    const priceText = isInquirePrice ? 'ติดต่อสอบถามราคา' : `฿${formatNumber(product.final_price)}`;
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sku=${encodeURIComponent(product.sku)}`
      : `https://www.toolshop226catalog.com/?sku=${encodeURIComponent(product.sku)}`;
    const shareData = {
      title: `${product.brand} - ${product.name}`,
      text: `รหัส: ${product.sku} | ราคา: ${priceText} | TOOL SHOP 226 Plus`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${product.name} (รหัส: ${product.sku}) ราคา: ${priceText}\nดูรายละเอียด: ${shareUrl}`
        );
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-zinc-950 text-xs font-black px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wide whitespace-nowrap">
              {product.brand}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Favorite toggle */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(product.sku)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isFavorite
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
                    : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={isFavorite ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </button>
            )}

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
              title="แชร์สินค้านี้"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && (
                <span className="absolute -bottom-7 right-0 text-[10px] bg-amber-400 text-zinc-950 font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                  คัดลอกลิงก์แล้ว!
                </span>
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-5 items-start">
          {/* LEFT SIDE: Square Image */}
          <div className="md:w-5/12 w-full shrink-0">
            <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden aspect-square flex items-center justify-center p-4">
              {!imgError && product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Wrench className="w-12 h-12" />
                  <span className="text-xs text-zinc-500 font-medium">ไม่มีรูปสินค้า</span>
                </div>
              )}
            </div>

            {/* Additional Detail / Specification (if available) */}
            {product.detail && (
              <div className="mt-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block mb-1">
                  รายละเอียด / สเปกสินค้า
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {product.detail}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: 6 ข้อมูลแถวตามแบบ WIREFRAME */}
          <div className="md:w-7/12 w-full flex flex-col justify-between space-y-3">
            <div className="space-y-3 divide-y divide-zinc-800">
              {/* แถว 1: ชื่อ รายการสินค้า */}
              <div className="pt-1 first:pt-0">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  ชื่อ รายการสินค้า
                </span>
                <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                  {product.name}
                </h2>
              </div>

              {/* แถว 2: รหัสสินค้า (SKU) */}
              <div className="pt-2.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  รหัสสินค้า (SKU)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className={`inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                      copiedSku
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-zinc-800 hover:bg-zinc-700/80 text-amber-400 border-zinc-700 hover:border-amber-400/50'
                    }`}
                    title="คลิกเพื่อคัดลอกรหัสสินค้า"
                  >
                    <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="whitespace-nowrap">{product.sku}</span>
                    {copiedSku ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                  </button>
                  {copiedSku && (
                    <span className="text-xs font-bold text-emerald-400 animate-in fade-in">
                      คัดลอกแล้ว!
                    </span>
                  )}
                </div>
              </div>

              {/* แถว 3: ราคาตั้ง */}
              <div className="pt-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  ราคาตั้ง
                </span>
                <div>
                  {isInquirePrice ? (
                    <span className="text-xs text-zinc-500">-</span>
                  ) : hasDiscount ? (
                    <span className="text-sm font-semibold text-zinc-500 line-through">
                      ฿{formatNumber(product.base_price)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-300">
                      ฿{formatNumber(product.base_price)}
                    </span>
                  )}
                </div>
              </div>

              {/* แถว 4: ส่วนลดพิเศษ */}
              <div className="pt-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  ส่วนลดพิเศษ
                </span>
                <div>
                  {!isInquirePrice && hasDiscount ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                      <span>ลด ฿{formatNumber(product.discount)}</span>
                      <span className="bg-emerald-400 text-zinc-950 px-1.5 py-0.2 rounded font-black text-[11px]">
                        -{discountPercent}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">-</span>
                  )}
                </div>
              </div>

              {/* แถว 5: ราคาหลังลด พร้อมสถานะสต็อก */}
              <div className="pt-2.5 flex items-center justify-between bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                    {isInquirePrice ? 'ราคา' : 'ราคาหลังลด'}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    {isInquirePrice ? (
                      <span className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">
                        สอบถาม
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                          ฿{formatNumber(product.final_price)}
                        </span>
                        <span className="text-xs text-zinc-400 font-normal">/ ชิ้น</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ORDER / CONTACT ACTION BUTTON (LINE OFFICIAL ACCOUNT) */}
            <div className="pt-4 mt-2">
              <a
                href={lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(generateLineMessage(product));
                  } catch {
                    // ignore
                  }
                }}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] ${
                  isInquirePrice
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/40'
                    : 'bg-[#06C755] hover:bg-[#05b34c] text-white shadow-emerald-950/40'
                }`}
              >
                <svg
                  className="w-5 h-5 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.066.51.25l2.449 3.326V8.108c0-.345.282-.63.63-.63.345 0 .627.285.627.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                <span>
                  {isInquirePrice
                    ? 'ทัก LINE สอบถามราคาสินค้านี้'
                    : 'ทัก LINE สอบถาม/สั่งซื้อสินค้านี้'}
                </span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
