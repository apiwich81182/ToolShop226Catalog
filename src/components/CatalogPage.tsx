'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, SortField, SortOrder } from '@/types/product';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { AdminLoginModal } from './AdminLoginModal';
import { PolicyModal, PolicyTab } from './PolicyModal';
import { queryProducts, fetchProductBySku } from '@/lib/productsApi';
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
  Wrench,
  ChevronDown,
  Check,
  Loader2,
  Download,
} from 'lucide-react';

interface CatalogPageProps {
  initialProducts?: Product[];
  onOpenAdmin?: () => void;
  availableBrands?: string[];
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialProducts = [],
  onOpenAdmin,
  availableBrands,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('created_at-desc');

  // Server-side paginated products state
  const [products, setProducts] = useState<Product[]>(() => initialProducts.slice(0, 15));
  const [totalItems, setTotalItems] = useState<number>(() => initialProducts.length);
  const [totalPages, setTotalPages] = useState<number>(() => Math.max(1, Math.ceil(initialProducts.length / 15)));
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // Active Bottom Nav Tab (Mobile)
  const [activeNavTab, setActiveNavTab] = useState<'all' | 'favorites'>('all');

  // View Mode: 'list' (TWC row-list default) vs 'grid' (2-col/4-col)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Product Detail Modal State (6-row wireframe sketch popup)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Admin Login Modal State (Guest mode vs Admin mode)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const logoClicksRef = useRef<{ count: number; timer: NodeJS.Timeout | null }>({ count: 0, timer: null });

  // PWA Install Prompt State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState<boolean>(false);
  const [isIosDevice, setIsIosDevice] = useState<boolean>(false);

  // Brand Chips Horizontal Scroll State
  const brandBarRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  // Policy & Terms Modal State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [policyTab, setPolicyTab] = useState<PolicyTab>('terms');

  const handleOpenPolicy = useCallback((tab: PolicyTab) => {
    setPolicyTab(tab);
    setIsPolicyModalOpen(true);
  }, []);

  // Searchable Brand Dropdown State
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const [brandSearchInput, setBrandSearchInput] = useState<string>('');
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  // Favorites state (persisted in localStorage)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const handleAdminClick = useCallback(() => {
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true';
    if (isAuth) {
      setIsAdminLoggedIn(true);
      onOpenAdmin?.();
    } else {
      setIsAdminLoginOpen(true);
    }
  }, [onOpenAdmin]);

  // Check admin session and secret URL query parameter (?admin=1 or ?admin=true)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAuth = sessionStorage.getItem('admin_auth') === 'true';
    setIsAdminLoggedIn(isAuth);

    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    if (adminParam === '1' || adminParam === 'true') {
      // Remove secret query parameter cleanly from address bar
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl || '/');

      if (isAuth) {
        onOpenAdmin?.();
      } else {
        setIsAdminLoginOpen(true);
      }
    }
  }, [onOpenAdmin]);

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

  // Detect Standalone PWA mode and iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
      setIsAlreadyInstalled(standalone);

      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(window as any).MSStream;
      setIsIosDevice(ios);
    }
  }, []);

  // Capture PWA install prompt event
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setCanInstallPwa(false);
        setIsAlreadyInstalled(true);
      }
      setDeferredInstallPrompt(null);
    } else {
      // If browser cannot prompt automatically (e.g. iOS Safari, or manual add), show instructions modal
      setIsInstallModalOpen(true);
    }
  };

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

  // Debounce search query to avoid firing queries on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check URL query parameter for direct product deep-link (?sku=... or ?p=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const skuParam = params.get('sku') || params.get('p');
    if (skuParam) {
      fetchProductBySku(skuParam).then((found) => {
        if (found) {
          setSelectedProduct(found);
          setIsDetailOpen(true);
        }
      });
    }
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('sku', product.sku);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('sku');
      url.searchParams.delete('p');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Bottom Nav Bar Tab Switcher
  const handleNavTabClick = (tab: 'all' | 'favorites') => {
    setActiveNavTab(tab);
    setCurrentPage(1);

    if (tab === 'all') {
      setSelectedBrand('All');
      setOnlyFavorites(false);
      setSortBy('created_at-desc');
    } else if (tab === 'favorites') {
      setOnlyFavorites(true);
    }
  };

  // Extract unique brands dynamically and sort A-Z (Authoritative list from availableBrands, case-insensitive deduplicated)
  const brands = useMemo(() => {
    const map = new Map<string, string>();

    // 1. If availableBrands is provided, use it as the source of truth for filters
    if (availableBrands && availableBrands.length > 0) {
      availableBrands.forEach((b) => {
        const trimmed = (b || '').trim();
        if (trimmed) {
          const key = trimmed.toLowerCase();
          if (!map.has(key)) {
            map.set(key, trimmed);
          }
        }
      });
    } else {
      // 2. Fallback: derive brands from loaded products if availableBrands is empty
      products.forEach((p) => {
        const trimmed = (p.brand || '').trim();
        if (trimmed) {
          const key = trimmed.toLowerCase();
          if (!map.has(key)) {
            map.set(key, trimmed);
          }
        }
      });
    }

    const sorted = Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    return ['All', ...sorted];
  }, [availableBrands, products]);

  // Brand Pills Horizontal Scroll logic
  const checkBrandScroll = useCallback(() => {
    if (brandBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = brandBarRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkBrandScroll();
    const el = brandBarRef.current;
    if (el) {
      el.addEventListener('scroll', checkBrandScroll, { passive: true });
      window.addEventListener('resize', checkBrandScroll);
      return () => {
        el.removeEventListener('scroll', checkBrandScroll);
        window.removeEventListener('resize', checkBrandScroll);
      };
    }
  }, [checkBrandScroll, brands]);

  const handleBrandWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && brandBarRef.current) {
      brandBarRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollBrandBar = (direction: 'left' | 'right') => {
    if (brandBarRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      brandBarRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Filtered brands for searchable dropdown
  const filteredBrandsForDropdown = useMemo(() => {
    if (!brandSearchInput.trim()) return brands;
    const q = brandSearchInput.toLowerCase().trim();
    return brands.filter((b) => b === 'All' || b.toLowerCase().includes(q));
  }, [brands, brandSearchInput]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedBrand, onlyFavorites, sortBy, itemsPerPage]);

  // Server-side High-Performance Query Execution
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProducts(true);

    let sortField: SortField = 'created_at';
    let sortOrder: SortOrder = 'desc';

    if (sortBy === 'brand-asc') {
      sortField = 'brand';
      sortOrder = 'asc';
    } else if (sortBy === 'brand-desc') {
      sortField = 'brand';
      sortOrder = 'desc';
    } else if (sortBy === 'sku-asc') {
      sortField = 'sku';
      sortOrder = 'asc';
    } else if (sortBy === 'sku-desc') {
      sortField = 'sku';
      sortOrder = 'desc';
    } else if (sortBy === 'price-asc') {
      sortField = 'final_price';
      sortOrder = 'asc';
    } else if (sortBy === 'price-desc') {
      sortField = 'final_price';
      sortOrder = 'desc';
    } else if (sortBy === 'discount-desc') {
      sortField = 'discount';
      sortOrder = 'desc';
    } else if (sortBy === 'discount_pct-desc') {
      sortField = 'discount_percent';
      sortOrder = 'desc';
    }

    queryProducts({
      search: debouncedSearchQuery,
      brand: selectedBrand,
      sortField,
      sortOrder,
      page: currentPage,
      pageSize: itemsPerPage,
      skus: onlyFavorites ? (favorites.length > 0 ? favorites : ['__no_favorites__']) : undefined,
    })
      .then((res) => {
        if (isMounted) {
          setProducts(res.products);
          setTotalItems(res.totalCount);
          setTotalPages(res.totalPages);
          setIsLoadingProducts(false);
        }
      })
      .catch((err) => {
        console.error('Catalog query error:', err);
        if (isMounted) setIsLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    debouncedSearchQuery,
    selectedBrand,
    onlyFavorites,
    favorites,
    sortBy,
    currentPage,
    itemsPerPage,
  ]);

  const isAllItems = itemsPerPage === -1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = products;

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedBrand('All');
    setOnlyFavorites(false);
    setSortBy('created_at-desc');
    setActiveNavTab('all');
    setCurrentPage(1);
  }, []);

  // Secret trigger: Clicking or tapping logo 3 times within 1.5 seconds opens admin login
  const handleLogoClick = useCallback(() => {
    clearAllFilters();

    logoClicksRef.current.count += 1;
    if (logoClicksRef.current.timer) {
      clearTimeout(logoClicksRef.current.timer);
    }

    if (logoClicksRef.current.count >= 3) {
      logoClicksRef.current.count = 0;
      handleAdminClick();
      return;
    }

    logoClicksRef.current.timer = setTimeout(() => {
      logoClicksRef.current.count = 0;
    }, 1500);
  }, [clearAllFilters, handleAdminClick]);

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
              onClick={handleLogoClick}
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

            {/* Action Buttons: Favorites, LINE Official, PWA Install & Admin */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Favorites Button (Desktop & Tablet) */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !onlyFavorites;
                  setOnlyFavorites(nextState);
                  setCurrentPage(1);
                  setActiveNavTab(nextState ? 'favorites' : 'all');
                }}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  onlyFavorites
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/50'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                }`}
                title={onlyFavorites ? 'แสดงสินค้าทั้งหมด' : 'ดูเฉพาะรายการโปรด'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    onlyFavorites
                      ? 'fill-rose-500 text-rose-500'
                      : favorites.length > 0
                      ? 'fill-rose-500/60 text-rose-400'
                      : 'text-zinc-400'
                  }`}
                />
                <span className="hidden lg:inline">รายการโปรด</span>
                {favorites.length > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none ${
                      onlyFavorites
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Install App Button (Visible on Mobile, Tablet & Desktop when not in standalone mode) */}
              {!isAlreadyInstalled && (
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-400/40 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  title="ติดตั้งแอป TOOL SHOP 226 Plus บนเครื่องของคุณ"
                >
                  <Download className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">ติดตั้งแอป</span>
                </button>
              )}

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

              {/* Admin Button (Only visible when admin is authenticated) */}
              {onOpenAdmin && isAdminLoggedIn && (
                <button
                  type="button"
                  onClick={handleAdminClick}
                  className="bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/40 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="โหมดผู้ดูแลระบบ: คลิกเพื่อจัดการหลังบ้าน"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="hidden lg:inline">จัดการหลังบ้าน</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Horizontal Chips for Brands (Scrollable on Desktop with Arrows & Wheel) */}
          <div className="relative mt-2.5 flex items-center group">
            {/* Left Scroll Arrow (Desktop) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollBrandBar('left')}
                className="hidden sm:flex absolute left-0 z-10 h-full w-9 items-center justify-start bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                aria-label="เลื่อนซ้าย"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-md hover:bg-zinc-800 text-zinc-300 hover:text-amber-400">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </button>
            )}

            {/* Chips Container */}
            <div
              ref={brandBarRef}
              onWheel={handleBrandWheel}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
            >
              {brands.map((brand) => {
                const active = selectedBrand.toLowerCase() === brand.toLowerCase();
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all select-none shrink-0 cursor-pointer ${
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

            {/* Right Scroll Arrow (Desktop) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollBrandBar('right')}
                className="hidden sm:flex absolute right-0 z-10 h-full w-9 items-center justify-end bg-gradient-to-l from-zinc-950 via-zinc-950/90 to-transparent text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                aria-label="เลื่อนขวา"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-md hover:bg-zinc-800 text-zinc-300 hover:text-amber-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>

          {/* Secondary Filter & Sort Toolbar */}
          <div className="mt-2.5 pt-2 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Left: Brand Dropdown & Favorites Quick Filter */}
            <div className="flex items-center gap-2">
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
                      const isSelected = selectedBrand.toLowerCase() === b.toLowerCase();
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

            {/* Quick Favorites Button on Desktop toolbar */}
            <button
              type="button"
              onClick={() => {
                const nextState = !onlyFavorites;
                setOnlyFavorites(nextState);
                setCurrentPage(1);
                setActiveNavTab(nextState ? 'favorites' : 'all');
              }}
              className={`hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                onlyFavorites
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-xs'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border-zinc-800'
              }`}
              title={onlyFavorites ? 'แสดงสินค้าทั้งหมด' : 'ดูเฉพาะรายการโปรด'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  onlyFavorites
                    ? 'fill-rose-500 text-rose-500'
                    : favorites.length > 0
                    ? 'fill-rose-500/60 text-rose-400'
                    : 'text-zinc-400'
                }`}
              />
              <span>รายการโปรด</span>
              {favorites.length > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none ${
                    onlyFavorites
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {favorites.length}
                </span>
              )}
            </button>
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              พบสินค้าทั้งหมด <strong className="text-amber-400 font-bold">{totalItems}</strong> รายการ
            </span>
            {isLoadingProducts && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
            )}
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
                {!isAllItems && totalItems > 0 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-md">
                    <span className="text-xs text-zinc-400">
                      หน้า {safeCurrentPage} จาก {totalPages} (รวม {totalItems} รายการ)
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                        disabled={safeCurrentPage === 1}
                        className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-amber-400 text-zinc-950 shadow-md scale-105'
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
                            <span key={page} className="px-1 text-zinc-600 text-xs select-none">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className="p-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
            {/* LINE Mascot Banner */}
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
              <div className="p-3.5 bg-zinc-900 border-t border-zinc-800/80 text-center">
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
              </div>
            </a>
          </aside>
        </div>
      </main>

      {/* ============================================================== */}
      {/* FOOTER & LEGAL POLICIES                                        */}
      {/* ============================================================== */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 mt-12 py-8 px-4 text-center text-xs text-zinc-500 pb-28 sm:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">TOOL SHOP 226 Plus</span>
            <span>&copy; {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-3.5 text-zinc-400">
            <button
              type="button"
              onClick={() => handleOpenPolicy('terms')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              ข้อกำหนดการใช้งาน
            </button>
            <span className="text-zinc-700">&bull;</span>
            <button
              type="button"
              onClick={() => handleOpenPolicy('privacy')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              นโยบายความเป็นส่วนตัว (PDPA)
            </button>
            <span className="text-zinc-700">&bull;</span>
            <button
              type="button"
              onClick={() => handleOpenPolicy('warranty')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              การรับประกันและจัดส่ง
            </button>
          </div>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR                                   */}
      {/* ============================================================== */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-40 px-6 py-2 flex justify-around items-center">
        {/* หน้าหลัก */}
        <button
          type="button"
          onClick={() => handleNavTabClick('all')}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-bold transition-colors ${
            activeNavTab === 'all' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>หน้าหลัก</span>
        </button>

        {/* รายการโปรด */}
        <button
          type="button"
          onClick={() => handleNavTabClick('favorites')}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-bold relative transition-colors ${
            activeNavTab === 'favorites' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>รายการโปรด</span>
          {favorites.length > 0 && (
            <span className="absolute top-0 right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none">
              {favorites.length}
            </span>
          )}
        </button>

        {/* ติดตั้งแอปบนมือถือ */}
        {!isAlreadyInstalled && (
          <button
            type="button"
            onClick={handleInstallPwa}
            className="flex flex-col items-center gap-1 p-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Download className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-extrabold">ติดตั้งแอป</span>
          </button>
        )}
      </nav>

      {/* ============================================================== */}
      {/* PRODUCT DETAIL MODAL                                           */}
      {/* ============================================================== */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
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
          setIsAdminLoggedIn(true);
          onOpenAdmin?.();
        }}
      />

      {/* ============================================================== */}
      {/* POLICIES, TERMS & WARRANTY MODAL                               */}
      {/* ============================================================== */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        initialTab={policyTab}
      />

      {/* ============================================================== */}
      {/* PWA INSTALLATION GUIDE MODAL                                    */}
      {/* ============================================================== */}
      {isInstallModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsInstallModalOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-zinc-100 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-950 flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">ติดตั้งแอป TOOL SHOP 226</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-zinc-300">
              {isIosDevice ? (
                <>
                  <p className="font-semibold text-amber-400">วิธีติดตั้งบน iPhone / iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                    <li>แตะที่ปุ่ม <strong className="text-white">แชร์ (Share)</strong> ด้านล่าง (ไอคอนรูปสี่เหลี่ยมลูกศรชี้ขึ้น)</li>
                    <li>เลื่อนลงมาแล้วเลือก <strong className="text-amber-400">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></li>
                    <li>แตะปุ่ม <strong className="text-white">"เพิ่ม" (Add)</strong> ที่มุมขวาบน</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-400">วิธีติดตั้งบน Android / Chrome:</p>
                  <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                    <li>แตะที่ปุ่ม <strong className="text-white">จุดสามจุด (⋮)</strong> ที่มุมขวาบนของเบราว์เซอร์</li>
                    <li>เลือกคำว่า <strong className="text-amber-400">"ติดตั้งแอป"</strong> หรือ <strong className="text-amber-400">"เพิ่มลงในหน้าจอหลัก"</strong></li>
                    <li>กดยืนยันเพื่อติดตั้งไอคอนแอปลงบนหน้าจอ</li>
                  </ol>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
