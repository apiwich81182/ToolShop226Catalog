'use client';

import React, { useState } from 'react';
import { Product } from '@/types/product';
import { formatNumber, calculateDiscountPercent, isPriceInquiry } from '@/lib/utils';
import {
  Wrench,
  Tag,
  Check,
  Heart,
  Share2,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode?: 'list' | 'grid';
  isFavorite?: boolean;
  onToggleFavorite?: (sku: string) => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  viewMode = 'list',
  isFavorite = false,
  onToggleFavorite,
  onSelectProduct,
}) => {
  const [imgError, setImgError] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const isInquirePrice = isPriceInquiry(product);
  const hasDiscount = !isInquirePrice && Number(product.discount) > 0;
  const discountPercent = calculateDiscountPercent(product.base_price, product.discount);

  const handleCopySku = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const priceText = isInquirePrice ? 'ติดต่อสอบถามราคา' : `฿${formatNumber(product.final_price)}`;
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sku=${encodeURIComponent(product.sku)}`
      : '';
    const shareData = {
      title: `${product.brand} - ${product.name}`,
      text: `รหัส: ${product.sku} | ราคา: ${priceText}`,
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
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch (err) {
        console.error('Failed to copy share info:', err);
      }
    }
  };

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  // ==========================================================================
  // LIST VIEW (รูปแบบแถวรายการ กะทัดรัด ถอดแบบมาจาก twctoolsofficial 1:1)
  // ==========================================================================
  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="bg-zinc-900 hover:bg-zinc-850/90 border border-zinc-800 hover:border-amber-400/60 rounded-xl transition-all duration-150 p-2.5 sm:p-3 flex items-center gap-3 group cursor-pointer text-left shadow-2xs relative select-none"
      >
        {/* Left: Square Thumbnail Image */}
        <div className="w-18 h-18 sm:w-20 sm:h-20 bg-zinc-950 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-zinc-800 p-1 relative">
          {!imgError && product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              loading="lazy"
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-600">
              <Wrench className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Center: Information (Brand/Tag, Name, Price) */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Top badges: Brand / Discount / SKU */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="bg-amber-400 text-zinc-950 text-[10px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap shrink-0">
              {product.brand}
            </span>
            {hasDiscount && (
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-extrabold px-1 rounded">
                -{discountPercent}%
              </span>
            )}
            {/* SKU Tag with Copy button */}
            <button
              type="button"
              onClick={handleCopySku}
              title="คลิกเพื่อคัดลอกรหัสสินค้า"
              className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-medium px-1 rounded border transition-colors ${
                copiedSku
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-amber-400 border-zinc-700'
              }`}
            >
              <Tag className="w-2.5 h-2.5 text-zinc-500" />
              <span className="truncate max-w-[80px]">{product.sku}</span>
              {copiedSku && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </button>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-400 line-clamp-2 leading-snug transition-colors">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isInquirePrice ? (
              <span className="text-sm sm:text-base font-black text-rose-500 tracking-tight">
                สอบถาม
              </span>
            ) : (
              <div className="flex items-baseline gap-1">
                {hasDiscount && (
                  <span className="text-[11px] text-zinc-500 line-through">
                    ฿{formatNumber(product.base_price)}
                  </span>
                )}
                <span className="text-sm sm:text-base font-black text-rose-500 tracking-tight">
                  ฿{formatNumber(product.final_price)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Heart & Share action buttons */}
        <div className="flex flex-col items-center justify-between self-stretch py-0.5 shrink-0">
          {/* Heart / Wishlist button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleFavorite) onToggleFavorite(product.sku);
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-500'
                : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title={isFavorite ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
            title="แชร์สินค้า"
          >
            <Share2 className="w-4 h-4" />
            {copiedShare && (
              <span className="absolute -top-7 right-0 text-[10px] bg-amber-400 text-zinc-950 font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                คัดลอกแล้ว!
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // GRID VIEW (รูปแบบตาราง 2 คอลัมน์บนมือถือ / 3-4 คอลัมน์บนจอใหญ่)
  // ==========================================================================
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-400/60 rounded-xl transition-all duration-150 overflow-hidden flex flex-col justify-between group cursor-pointer text-left shadow-2xs h-full relative"
    >
      {/* Thumbnail Area */}
      <div className="relative bg-zinc-950 aspect-square w-full flex items-center justify-center p-2.5 overflow-hidden border-b border-zinc-800">
        {!imgError && product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-1 p-2 text-center">
            <Wrench className="w-6 h-6" />
            <span className="text-[10px] text-zinc-500">ไม่มีรูป</span>
          </div>
        )}

        {/* Brand Badge */}
        <span className="absolute top-2 left-2 bg-amber-400 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded shadow-xs uppercase whitespace-nowrap">
          {product.brand}
        </span>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(product.sku);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-xs border transition-colors ${
            isFavorite
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-500'
              : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-white'
          }`}
          title={isFavorite ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Grid Card Content */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-2">
        <div className="space-y-1">
          {/* SKU */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handleCopySku}
              title="คลิกเพื่อคัดลอกรหัสสินค้า"
              className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                copiedSku
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-amber-400 border-zinc-700'
              }`}
            >
              <Tag className="w-2.5 h-2.5 text-zinc-500" />
              <span className="truncate max-w-[90px]">{product.sku}</span>
              {copiedSku && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </button>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-400 line-clamp-2 leading-snug transition-colors min-h-[2.4em]">
            {product.name}
          </h3>
        </div>

        {/* Price Area */}
        <div className="pt-2 border-t border-zinc-800 mt-auto flex items-baseline justify-between">
          <div>
            {!isInquirePrice && hasDiscount && (
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-zinc-500 line-through">
                  ฿{formatNumber(product.base_price)}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-1 rounded">
                  -{discountPercent}%
                </span>
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-rose-500 tracking-tight">
                {isInquirePrice ? 'สอบถาม' : `฿${formatNumber(product.final_price)}`}
              </span>
              {!isInquirePrice && (
                <span className="text-[10px] text-zinc-500">/ ชิ้น</span>
              )}
            </div>
          </div>

          <span className="text-[11px] font-medium text-amber-400 group-hover:translate-x-0.5 transition-transform">
            ดูรายละเอียด &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
