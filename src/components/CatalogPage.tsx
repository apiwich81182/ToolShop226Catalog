'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { AdminLoginModal } from './AdminLoginModal';
import { calculateDiscountPercent, isPriceInquiry } from '@/lib/utils';
import {
  Search,
  X,
  SlidersHorizontal,
  PackageX,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Heart,
  Home,
  Sparkles,
  Wrench,
  ChevronDown,
  Check,
} from 'lucide-react';

interface CatalogPageProps {
  initialProducts: Product[];
  onOpenAdmin?: () => void;
  availableBrands?: string[];
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialProducts,
  onOpenAdmin,
  availableBrands,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('created_at-desc');

  // Active Bottom Nav Tab (Mobile)
  const [activeNavTab, setActiveNavTab] = useState<'all' | 'new' | 'favorites'>('all');

  // View Mode: 'list' (TWC row-list default) vs 'grid' (2-col/4-col)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Product Detail Modal State (6-row wireframe sketch popup)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Admin Login Modal State (Guest mode vs Admin mode)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Searchable Brand Dropdown State
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const [brandSearchInput, setBrandSearchInput] = useState<string>('');
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Favorites state (persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Close brand dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    if (isBrandDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBrandDropdownOpen]);

  const handleAdminClick = () => {
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true';
    if (isAuth) {
      onOpenAdmin?.();
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const cachedView = localStorage.getItem('catalog_view_mode') as 'list' | 'grid';
      if (cachedView === 'list' || cachedView === 'grid') {
        setViewMode(cachedView);
      }
      const cachedFavs = localStorage.getItem('catalog_favorites');
      if (cachedFavs) {
        setFavorites(JSON.parse(cachedFavs));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleToggleFavorite = useCallback((sku: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(sku);
      const updated = exists ? prev.filter((id) => id !== sku) : [...prev, sku];
      try {
        localStorage.setItem('catalog_favorites', JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('catalog_view_mode', mode);
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  // Bottom Nav Bar Tab Switcher
  const handleNavTabClick = (tab: 'all' | 'new' | 'favorites') => {
    setActiveNavTab(tab);
    setCurrentPage(1);

    if (tab === 'all') {
      setSelectedBrand('All');
      setOnlyFavorites(false);
      setSortBy('created_at-desc');
    } else if (tab === 'new') {
      setSortBy('created_at-desc');
      setOnlyFavorites(false);
    } else if (tab === 'favorites') {
      setOnlyFavorites(true);
    }
  };

  // Extract unique brands dynamically and sort A-Z
  const brands = useMemo(() => {
    const list = new Set<string>();
    if (availableBrands) {
      availableBrands.forEach((b) => {
        if (b && b.trim()) list.add(b.trim());
      });
    }
    initialProducts.forEach((p) => {
      if (p.brand && p.brand.trim()) list.add(p.brand.trim());
    });
    const sorted = Array.from(list).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    return ['All', ...sorted];
  }, [initialProducts, availableBrands]);

  // Filtered brands for searchable dropdown
  const filteredBrandsForDropdown = useMemo(() => {
    if (!brandSearchInput.trim()) return brands;
    const q = brandSearchInput.toLowerCase().trim();
    return brands.filter((b) => b === 'All' || b.toLowerCase().includes(q));
  }, [brands, brandSearchInput]);

  // Configure Fuse.js for high-precision fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(initialProducts, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'sku', weight: 0.3 },
        { name: 'brand', weight: 0.2 },
        { name: 'detail', weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [initialProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = initialProducts;

    // 1. Fuzzy Search
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      result = fuse.search(trimmedQuery).map((r) => r.item);
    }

    // 2. Brand Filter
    if (selectedBrand !== 'All') {
      result = result.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    // 3. Favorites Filter
    if (onlyFavorites) {
      result = result.filter((p) => favorites.includes(p.sku));
    }

    return result;
  }, [
    fuse,
    initialProducts,
    searchQuery,
    selectedBrand,
    onlyFavorites,
    favorites,
  ]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];

    switch (sortBy) {
      case 'brand-asc':
        return list.sort((a, b) => a.brand.localeCompare(b.brand, 'th'));
      case 'brand-desc':
        return list.sort((a, b) => b.brand.localeCompare(a.brand, 'th'));
      case 'sku-asc':
        return list.sort((a, b) => a.sku.localeCompare(b.sku));
      case 'sku-desc':
        return list.sort((a, b) => b.sku.localeCompare(a.sku));
      case 'price-asc':
        return list.sort((a, b) => {
          const inqA = isPriceInquiry(a);
          const inqB = isPriceInquiry(b);
          if (inqA && !inqB) return 1;
          if (!inqA && inqB) return -1;
          return a.final_price - b.final_price;
        });
      case 'price-desc':
        return list.sort((a, b) => {
          const inqA = isPriceInquiry(a);
          const inqB = isPriceInquiry(b);
          if (inqA && !inqB) return 1;
          if (!inqA && inqB) return -1;
          return b.final_price - a.final_price;
        });
      case 'discount-desc':
        return list.sort((a, b) => b.discount - a.discount);
      case 'discount_pct-desc':
        return list.sort((a, b) => {
          const pctA = calculateDiscountPercent(a.base_price, a.discount);
          const pctB = calculateDiscountPercent(b.base_price, b.discount);
          return pctB - pctA;
        });
      case 'stock-desc':
        return list.sort((a, b) => (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0));
      case 'stock-asc':
        return list.sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
      case 'created_at-desc':
      default:
        return list.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, [filteredProducts, sortBy]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedBrand,
    onlyFavorites,
    sortBy,
    itemsPerPage,
  ]);

  // Paginated Slice
  const totalItems = sortedProducts.length;
  const isAllItems = itemsPerPage === -1;
  const totalPages = isAllItems ? 1 : Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    if (isAllItems) return sortedProducts;
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, isAllItems, safeCurrentPage, itemsPerPage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedBrand('All');
    setOnlyFavorites(false);
    setSortBy('created_at-desc');
    setActiveNavTab('all');
    setCurrentPage(1);
  };

  const startIndex = isAllItems ? 0 : (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = isAllItems ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);

  // Line OA deep link from env
  const lineOaId = process.env.NEXT_PUBLIC_LINE_OA_ID || 'https://lin.ee/ZLqm2Z6';
  const generalLineUrl = lineOaId.startsWith('http')
    ? lineOaId
    : `https://line.me/R/ti/p/${encodeURIComponent(lineOaId)}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24 sm:pb-16 selection:bg-amber-400 selection:text-zinc-950">
      {/* ============================================================== */}
      {/* TOP HEADER SECTION (ถอดแบบ twctoolsofficial: ดำเป็นหลัก เหลืองเป็นรอง) */}
      {/* ============================================================== */}
      <header className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-850 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          {/* Top Bar: Logo + Search + LINE & Admin Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Logo (TOOL SHOP 226 Plus) */}
            <div
              onClick={clearAllFilters}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0 select-none group"
              title="คลิกเพื่อกลับหน้าแรก / ล้างตัวกรอง"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="TOOL SHOP 226 Plus"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
              <div className="hidden xs:block leading-tight">
                <span className="text-sm sm:text-base font-black text-amber-400 tracking-tight block">
                  TOOL SHOP
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-zinc-300 tracking-wider">
                  226 PLUS
                </span>
              </div>
            </div>

            {/* Prominent Search Bar (Search across SKU, Name, Brand, Detail) */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสินค้า SKU ชื่อ หรือแบรนด์..."
                className="w-full pl-9 pr-8 py-2 sm:py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700/80 rounded-xl focus:bg-zinc-850 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-all text-zinc-100 placeholder-zinc-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-white"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons: LINE Official & Admin */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* LINE Button */}
              <a
                href={generalLineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#06C755] hover:bg-[#05b34c] text-white p-2 sm:px-3 sm:py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                title="ติดต่อทาง LINE OA"
              >
                <svg
                  className="w-4 h-4 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.066.51.25l2.449 3.326V8.108c0-.345.282-.63.63-.63.345 0 .627.285.627.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                <span className="hidden md:inline">LINE</span>
              </a>

              {/* Admin Button (Protected by Admin Password) */}
              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={handleAdminClick}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border border-zinc-800 transition-colors flex items-center gap-1.5"
                  title="เข้าสู่ระบบผู้ดูแลระบบ (Admin)"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="hidden lg:inline">หลังบ้าน</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Horizontal Chips for Brands (Sorted A-Z) */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {brands.map((brand) => {
              const active = selectedBrand.toLowerCase() === brand.toLowerCase();
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all select-none shrink-0 ${
                    active
                      ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {brand === 'All' ? 'ทั้งหมด' : brand}
                </button>
              );
            })}
          </div>

          {/* Secondary Filter & Sort Toolbar */}
          <div className="mt-2.5 pt-2 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Searchable Brand Dropdown (เรียง A-Z และพิมพ์ค้นหาใน Dropdown ได้) */}
            <div className="relative" ref={brandDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className="bg-zinc-900 border border-zinc-800 hover:border-amber-400 text-zinc-200 py-1.5 px-3 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-400">ยี่ห้อ:</span>
                <span className="font-bold text-amber-400">
                  {selectedBrand === 'All' ? 'ทุกยี่ห้อ' : selectedBrand}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
              </button>

              {isBrandDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in duration-100">
                  {/* Search input inside dropdown */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      autoFocus
                      value={brandSearchInput}
                      onChange={(e) => setBrandSearchInput(e.target.value)}
                      placeholder="พิมพ์ค้นหายี่ห้อ..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Scrollable list of brands (Sorted A-Z) */}
                  <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                    {filteredBrandsForDropdown.map((b) => {
                      const isSelected = selectedBrand === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setSelectedBrand(b);
                            setIsBrandDropdownOpen(false);
                            setBrandSearchInput('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-amber-400 text-zinc-950'
                              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <span>{b === 'All' ? 'ทุกยี่ห้อ' : b}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                    {filteredBrandsForDropdown.length === 0 && (
                      <div className="p-3 text-center text-xs text-zinc-500">
                        ไม่พบยี่ห้อ &ldquo;{brandSearchInput}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sorting Dropdown & View Mode Switcher */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 font-semibold hidden xs:flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                  เรียง:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 py-1 px-2 rounded-lg font-medium focus:outline-none focus:border-amber-400 text-xs"
                >
                  <option value="created_at-desc">สินค้ามาใหม่</option>
                  <option value="price-asc">ราคา: ต่ำสุด - สูงสุด</option>
                  <option value="price-desc">ราคา: สูงสุด - ต่ำสุด</option>
                  <option value="discount-desc">ส่วนลด: มากสุด (฿)</option>
                  <option value="discount_pct-desc">ส่วนลด: % สูงสุด</option>
                  <option value="brand-asc">ยี่ห้อ (A-Z)</option>
                  <option value="sku-asc">รหัสสินค้า (SKU)</option>
                  <option value="stock-desc">สต็อก: มากสุด</option>
                </select>
              </div>

              {/* View Switcher: List (twctools style) vs Grid */}
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('list')}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'list'
                      ? 'bg-amber-400 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="มุมมองรายการ (twctools style)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">รายการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid')}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-amber-400 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="มุมมองตาราง (2-4 คอลัมน์)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ตาราง</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* CATALOG MAIN CONTENT + RIGHT SIDEBAR BANNER                    */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
        {/* Results summary header */}
        <div className="flex flex-wrap items-center justify-between pb-3 gap-2 text-xs text-zinc-400">
          <div>
            พบสินค้าทั้งหมด <strong className="text-amber-400 font-bold">{totalItems}</strong> รายการ
            {totalItems > 0 && !isAllItems && (
              <span>
                {' '}(แสดง {startIndex + 1} - {endIndex})
              </span>
            )}
            {searchQuery && (
              <span>
                {' '}สำหรับ &ldquo;<span className="text-amber-400 font-medium">{searchQuery}</span>&rdquo;
              </span>
            )}
            {onlyFavorites && (
              <span className="text-rose-400 font-semibold ml-1">
                (เฉพาะรายการโปรด)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Items per page selector */}
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <span>แสดง:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-xs font-medium"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={-1}>ทั้งหมด</option>
              </select>
            </div>

            {(searchQuery ||
              selectedBrand !== 'All' ||
              onlyFavorites ||
              sortBy !== 'created_at-desc') && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline ml-1"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Content Layout with Right-Side Sticky Banner */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Products Grid/List Column */}
          <div className="flex-1 w-full min-w-0">
            {paginatedProducts.length > 0 ? (
              <>
                {viewMode === 'list' ? (
                  <div className="space-y-2 sm:space-y-2.5">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id || product.sku}
                        product={product}
                        viewMode="list"
                        isFavorite={favorites.includes(product.sku)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectProduct={handleSelectProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id || product.sku}
                        product={product}
                        viewMode="grid"
                        isFavorite={favorites.includes(product.sku)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectProduct={handleSelectProduct}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {!isAllItems && totalPages > 1 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-md">
                    <span className="text-xs text-zinc-400">
                      หน้า {safeCurrentPage} จาก {totalPages} (รวม {totalItems} รายการ)
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors"
                        title="หน้าก่อนหน้า"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= safeCurrentPage - 1 && page <= safeCurrentPage + 1)
                        ) {
                          const isCurrent = page === safeCurrentPage;
                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                isCurrent
                                  ? 'bg-amber-400 text-zinc-950 shadow-md'
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === safeCurrentPage - 2 ||
                          page === safeCurrentPage + 2
                        ) {
                          return (
                            <span key={page} className="px-1 text-zinc-600 text-xs">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors"
                        title="หน้าถัดไป"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty Search State */
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-12 text-center max-w-lg mx-auto my-12">
                <div className="w-16 h-16 rounded-full bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center mb-4">
                  <PackageX className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1">ไม่พบสินค้าที่ค้นหา</h3>
                <p className="text-sm text-zinc-400 mb-5">
                  {onlyFavorites
                    ? 'ยังไม่มีรายการโปรดที่บันทึกไว้ แตะรูปหัวใจ ♡ บนสินค้าเพื่อบันทึก'
                    : 'ลองพิมพ์คำค้นหาอื่น เช่น "ประแจ", "สว่าน", "SATA" หรือล้างตัวกรอง'}
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-300 transition-colors shadow-md"
                >
                  แสดงสินค้าทั้งหมด
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar: Sticky LINE Banner */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-20 space-y-4">
            <a
              href={generalLineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-900 border border-zinc-800 hover:border-[#06C755] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.02] group"
              title="คลิกเพื่อทัก LINE สอบถามและขอใบเสนอราคา"
            >
              <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                <img
                  src="/line-banner.jpg"
                  alt="สอบถามสินค้า และขอใบเสนอราคา ผ่าน LINE ได้เลยครับ"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 bg-zinc-900 border-t border-zinc-800/80 text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-transform active:scale-95 gap-2">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.066.51.25l2.449 3.326V8.108c0-.345.282-.63.63-.63.345 0 .627.285.627.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  <span>แอด LINE สอบถาม / สั่งซื้อ</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  คลิกที่แบนเนอร์หรือปุ่ม เพื่อแอดไลน์สอบถามสต็อก ขอใบเสนอราคา หรือสั่งซื้อได้ทันที
                </p>
              </div>
            </a>
          </aside>
        </div>
      </main>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR                                   */}
      {/* ============================================================== */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-40 px-2 py-1.5 flex justify-around items-center">
        {/* หน้าหลัก */}
        <button
          type="button"
          onClick={() => handleNavTabClick('all')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-semibold transition-colors ${
            activeNavTab === 'all' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>หน้าหลัก</span>
        </button>

        {/* สินค้าใหม่ */}
        <button
          type="button"
          onClick={() => handleNavTabClick('new')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-semibold transition-colors ${
            activeNavTab === 'new' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>สินค้าใหม่</span>
        </button>

        {/* รายการโปรด */}
        <button
          type="button"
          onClick={() => handleNavTabClick('favorites')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-semibold relative transition-colors ${
            activeNavTab === 'favorites' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>รายการโปรด</span>
          {favorites.length > 0 && (
            <span className="absolute top-0 right-1 bg-rose-500 text-white text-[9px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
              {favorites.length}
            </span>
          )}
        </button>

        {/* จัดการหลังบ้าน (ถ้ามีปุ่ม Admin - ต้องใส่รหัสผ่าน) */}
        {onOpenAdmin && (
          <button
            type="button"
            onClick={handleAdminClick}
            className="flex flex-col items-center gap-0.5 p-1 text-[10px] font-semibold text-zinc-500 hover:text-amber-400 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>จัดการ</span>
          </button>
        )}
      </nav>

      {/* ============================================================== */}
      {/* PRODUCT DETAIL MODAL (ถอดแบบรูปสเก็ตช์ WIREFRAME เป๊ะๆ 6 แถวข้อมูล)  */}
      {/* ============================================================== */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isFavorite={selectedProduct ? favorites.includes(selectedProduct.sku) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* ============================================================== */}
      {/* ADMIN LOGIN MODAL (เข้าสู่ระบบสำหรับแอดมิน - บุคคลทั่วไปเป็น Guest)   */}
      {/* ============================================================== */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminLoginOpen(false);
          onOpenAdmin?.();
        }}
      />
    </div>
  );
};
