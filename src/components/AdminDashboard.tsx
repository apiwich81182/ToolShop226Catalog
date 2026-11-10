'use client';

import React, { useState, useRef, useTransition, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Product, ProductInput } from '@/types/product';
import {
  saveProduct,
  deleteProduct,
  bulkDeleteProducts,
  uploadProductImage,
  bulkUpsertProducts,
  batchUploadImagesBySku,
  fetchBrands,
  saveBrands,
  queryProducts,
  fetchMissingImagesCount,
  fetchAllProductsForExport,
} from '@/lib/productsApi';
import {
  formatNumber,
  cleanAndFormatImageUrl,
  calculateDiscountPercent,
  calculateDiscountFromPercent,
  isPriceInquiry,
} from '@/lib/utils';
import { SearchableCombobox } from './SearchableCombobox';
import { BrandCategoryManagerModal } from './BrandCategoryManagerModal';
import { AdminGuideModal } from './AdminGuideModal';
import {
  Package,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit,
  X,
  Search,
  ArrowLeft,
  Image as ImageIcon,
  Images,
  Tag,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LogOut,
  Wrench,
  HelpCircle,
  ImageOff,
  CheckSquare,
} from 'lucide-react';

interface AdminDashboardProps {
  products: Product[];
  onRefresh: () => void;
  onBackToCatalog: () => void;
  onProductsUpdate?: (products: Product[]) => void;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

type AdminSortField =
  | 'sku'
  | 'name'
  | 'brand'
  | 'base_price'
  | 'discount'
  | 'final_price'
  | 'created_at';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  onRefresh,
  onBackToCatalog,
  onProductsUpdate,
}) => {
  const [localProducts, setLocalProducts] = useState<Product[]>(products || []);
  const [tableProducts, setTableProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [missingImagesCount, setMissingImagesCount] = useState<number>(0);

  const [searchFilter, setSearchFilter] = useState('');
  const [debouncedSearchFilter, setDebouncedSearchFilter] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('All');
  const [filterNoImage, setFilterNoImage] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const [importProgressText, setImportProgressText] = useState<string>('');

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Brands state (sorted A-Z)
  const [brands, setBrands] = useState<string[]>([]);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<AdminSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formBasePrice, setFormBasePrice] = useState<number | string>('');
  const [formFinalPrice, setFormFinalPrice] = useState<number | string>('');
  const [formDiscount, setFormDiscount] = useState<number | string>(0);
  const [formDiscountPercent, setFormDiscountPercent] = useState<number | string>(0);
  const [pricingMode, setPricingMode] = useState<'new_price' | 'amount' | 'percent' | 'inquire'>('new_price');
  const [formDetail, setFormDetail] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  // Image Upload State (Single file)
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Excel / CSV File Input Ref
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Batch Image Upload State
  const batchImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState('');

  // Load brands on mount and ensure sorted A-Z
  useEffect(() => {
    fetchBrands().then((b) => {
      const sorted = [...b].sort((x, y) => x.localeCompare(y, 'en', { sensitivity: 'base' }));
      setBrands(sorted);
    });
  }, []);

  // Debounce search filter input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchFilter(searchFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Load missing images count from server/db
  const refreshMissingImagesCount = useCallback(() => {
    fetchMissingImagesCount().then(setMissingImagesCount).catch(console.warn);
  }, []);

  useEffect(() => {
    refreshMissingImagesCount();
  }, [refreshMissingImagesCount]);

  // Load table data with Server-side query
  const loadTableData = useCallback(() => {
    setIsLoadingTable(true);
    queryProducts({
      search: debouncedSearchFilter,
      brand: selectedBrandFilter,
      onlyWithoutImage: filterNoImage,
      sortField,
      sortOrder,
      page: currentPage,
      pageSize,
    })
      .then((res) => {
        setTableProducts(res.products);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setIsLoadingTable(false);
      })
      .catch((err) => {
        console.error('Admin table query error:', err);
        setIsLoadingTable(false);
      });
  }, [debouncedSearchFilter, selectedBrandFilter, filterNoImage, sortField, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchFilter, selectedBrandFilter, filterNoImage, pageSize]);

  // Sync props change with local state
  useEffect(() => {
    setLocalProducts(products || []);
  }, [products]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_auth');
    }
    fetch('/api/admin-login', { method: 'DELETE' }).catch(() => {});
    onBackToCatalog();
  };

  // --------------------------------------------------------------------------
  // 2. Open Add / Edit Modal
  // --------------------------------------------------------------------------
  const openAddModal = () => {
    setEditingProduct(null);
    setFormSku('');
    setFormName('');
    setFormBrand(brands[0] || 'SATA');
    setFormBasePrice('');
    setFormFinalPrice('');
    setFormDiscount(0);
    setFormDiscountPercent(0);
    setPricingMode('new_price');
    setFormDetail('');
    setFormImageUrl('');
    setImagePreview(null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormSku(product.sku);
    setFormName(product.name);
    setFormBrand(product.brand);

    const isInquire = isPriceInquiry(product);

    if (isInquire) {
      setPricingMode('inquire');
      setFormBasePrice(0);
      setFormFinalPrice(0);
      setFormDiscount(0);
      setFormDiscountPercent(0);
    } else {
      setPricingMode('new_price');
      setFormBasePrice(product.base_price);
      setFormFinalPrice(product.final_price);
      setFormDiscount(product.discount || 0);

      const base = Number(product.base_price) || 0;
      const disc = Number(product.discount) || 0;
      setFormDiscountPercent(calculateDiscountPercent(base, disc));
    }

    setFormDetail(product.detail || '');
    setFormImageUrl(product.image_url || '');
    setImagePreview(product.image_url || null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // Pricing Calculations (กรอกราคาใหม่ -> คำนวณส่วนลด ฿ และ % อัตโนมัติ)
  // --------------------------------------------------------------------------
  const handleBasePriceChange = (baseVal: string) => {
    setFormBasePrice(baseVal);
    const base = Number(baseVal) || 0;

    if (pricingMode === 'new_price') {
      const finalP = Number(formFinalPrice) || 0;
      if (formFinalPrice !== '' && base > 0) {
        const disc = Math.max(0, base - finalP);
        setFormDiscount(disc);
        setFormDiscountPercent(calculateDiscountPercent(base, disc));
      }
    } else if (pricingMode === 'percent') {
      const pct = Number(formDiscountPercent) || 0;
      const disc = calculateDiscountFromPercent(base, pct);
      setFormDiscount(disc);
      setFormFinalPrice(Math.max(0, base - disc));
    } else {
      const disc = Number(formDiscount) || 0;
      setFormDiscountPercent(calculateDiscountPercent(base, disc));
      setFormFinalPrice(Math.max(0, base - disc));
    }
  };

  const handleNewPriceChange = (newVal: string) => {
    setFormFinalPrice(newVal);
    const newP = Number(newVal) || 0;
    const base = Number(formBasePrice) || 0;
    if (base > 0) {
      const disc = Math.max(0, base - newP);
      setFormDiscount(disc);
      setFormDiscountPercent(calculateDiscountPercent(base, disc));
    } else {
      setFormDiscount(0);
      setFormDiscountPercent(0);
    }
  };

  const handleDiscountAmountChange = (amtVal: string) => {
    setFormDiscount(amtVal);
    const amt = Number(amtVal) || 0;
    const base = Number(formBasePrice) || 0;
    setFormDiscountPercent(calculateDiscountPercent(base, amt));
    setFormFinalPrice(Math.max(0, base - amt));
  };

  const handleDiscountPercentChange = (pctVal: string) => {
    setFormDiscountPercent(pctVal);
    const pct = Number(pctVal) || 0;
    const base = Number(formBasePrice) || 0;
    const calculatedDiscount = calculateDiscountFromPercent(base, pct);
    setFormDiscount(calculatedDiscount);
    setFormFinalPrice(Math.max(0, base - calculatedDiscount));
  };

  // Single Image Upload Handling
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'กรุณาอัปโหลดไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้น');
      return;
    }
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim() || !formName.trim() || !formBrand.trim()) {
      showToast('error', 'กรุณากรอกรหัสสินค้า (SKU), ชื่อสินค้า และยี่ห้อให้ครบถ้วน');
      return;
    }

    startTransition(async () => {
      let finalImageUrl = formImageUrl;

      if (selectedFile) {
        try {
          setUploadingImage(true);
          finalImageUrl = await uploadProductImage(selectedFile, formSku);
          showToast('info', 'อัปโหลดรูปภาพไปยัง Storage เรียบร้อย');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'อัปโหลดรูปภาพไม่สำเร็จ';
          showToast('error', msg);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const isInquireMode = pricingMode === 'inquire';
      const basePriceNum = isInquireMode ? 0 : (Number(formBasePrice) || 0);
      const discountNum = isInquireMode ? 0 : (Number(formDiscount) || 0);
      const input: ProductInput = {
        id: editingProduct?.id,
        sku: formSku.trim(),
        name: formName.trim(),
        brand: formBrand.trim(),
        category: 'ทั่วไป',
        detail: formDetail.trim() || null,
        base_price: basePriceNum,
        discount: discountNum,
        image_url: finalImageUrl || null,
      };

      try {
        await saveProduct(input);
        showToast('success', editingProduct ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าใหม่สำเร็จ');
        setIsModalOpen(false);
        loadTableData();
        refreshMissingImagesCount();
        onRefresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'บันทึกสินค้าไม่สำเร็จ';
        showToast('error', msg);
      }
    });
  };

  // Delete Product
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`คุณต้องการลบสินค้า [${product.sku}] ${product.name} ใช่หรือไม่?`)) return;

    try {
      await deleteProduct(product.id);
      showToast('success', `ลบสินค้า [${product.sku}] เรียบร้อย`);
      loadTableData();
      refreshMissingImagesCount();
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ลบสินค้าไม่สำเร็จ';
      showToast('error', msg);
    }
  };

  // --------------------------------------------------------------------------
  // 3. Excel Batch Import & Export (6 คอลัมน์ตามภาพ)
  // --------------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        sku: 'SATA-09014',
        name: 'ชุดประแจรวม 14 ชิ้น ขนาด 8-24 มม. มาตรฐานเยอรมัน',
        brand: 'SATA',
        base_price: 1850,
        new_price: 1800,
        image_url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800',
      },
      {
        sku: 'ASAHI-CLS100',
        name: 'ประแจแหวนข้างปากตาย คอยาวพิเศษ Lightool',
        brand: 'ASAHI',
        base_price: 2400,
        new_price: 2000,
        image_url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800',
      },
      {
        sku: 'PB-212H-10RB',
        name: 'ชุดประแจหกเหลี่ยมหัวบอล สีรุ้ง Rainbow 9 ชิ้น',
        brand: 'PB Swiss Tools',
        base_price: 3200,
        new_price: 3000,
        image_url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData, {
      header: ['sku', 'name', 'brand', 'base_price', 'new_price', 'image_url'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductsTemplate');
    XLSX.writeFile(workbook, 'hardware_products_template.xlsx');
    showToast('info', 'ดาวน์โหลดเทมเพลต Excel เรียบร้อย (6 คอลัมน์: sku, name, brand, base_price, new_price, image_url)');
  };

  const handleExportCatalog = async () => {
    try {
      showToast('info', 'กำลังเตรียมข้อมูลแคตาล็อกสำหรับ Export...');
      const allProducts = await fetchAllProductsForExport();

      if (!allProducts || allProducts.length === 0) {
        showToast('error', 'ไม่มีข้อมูลสินค้าสำหรับ Export');
        return;
      }

      const exportRows = allProducts.map((p) => {
        const isInquire = isPriceInquiry(p);
        return {
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          base_price: isInquire ? 'สอบถาม' : p.base_price,
          new_price: isInquire ? 'สอบถาม' : p.final_price,
          image_url: p.image_url || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows, {
        header: ['sku', 'name', 'brand', 'base_price', 'new_price', 'image_url'],
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'HardwareCatalog');
      XLSX.writeFile(workbook, `hardware_catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('success', `Export แคตาล็อก ${allProducts.length} รายการสำเร็จ`);
    } catch (e) {
      console.error('Export error:', e);
      showToast('error', 'เกิดข้อผิดพลาดในการ Export แคตาล็อก');
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawData || rawData.length === 0) {
          throw new Error('ไม่พบข้อมูลในไฟล์ที่เลือก');
        }

        const validProducts: ProductInput[] = rawData
          .filter((row) => (row.sku || row['SKU'] || row['รหัสสินค้า'] || row['รหัส']) && (row.name || row['ชื่อสินค้า'] || row['รายการ']))
          .map((row) => {
            const rawSku = row.sku || row['SKU'] || row['รหัสสินค้า'] || row['รหัส'];
            const rawName = row.name || row['ชื่อสินค้า'] || row['รายการ'] || row['ชื่อรายการ'];
            const rawBrand = row.brand || row['ยี่ห้อ'] || row['แบรนด์'] || 'General';

            const basePriceRaw = row.base_price ?? row['ราคาตั้ง'] ?? row['ราคา'];
            const newPriceRaw = row.new_price ?? row['ราคาใหม่'] ?? row.final_price;

            const isBaseInquire =
              typeof basePriceRaw === 'string' &&
              (basePriceRaw.includes('สอบถาม') ||
                basePriceRaw.includes('ถาม') ||
                basePriceRaw.toLowerCase().includes('inquire'));
            const isNewInquire =
              typeof newPriceRaw === 'string' &&
              (newPriceRaw.includes('สอบถาม') ||
                newPriceRaw.includes('ถาม') ||
                newPriceRaw.toLowerCase().includes('inquire'));

            const isInquire = isBaseInquire || isNewInquire;

            const rawBasePrice = isInquire ? 0 : Number(basePriceRaw || 0);
            const rawNewPrice = isInquire
              ? 0
              : newPriceRaw !== undefined
              ? Number(newPriceRaw)
              : undefined;

            let discount = 0;
            if (isInquire || rawBasePrice <= 0) {
              discount = 0;
            } else if (rawNewPrice !== undefined && rawBasePrice > 0) {
              discount = Math.max(0, rawBasePrice - rawNewPrice);
            } else if (row.discount !== undefined) {
              discount = Number(row.discount) || 0;
            }

            const rawImage =
              row.image_url ||
              row['image_url'] ||
              row['imageUrl'] ||
              row['image'] ||
              row['รูปภาพ'] ||
              row['รูป'] ||
              null;

            const cleanedImageUrl = cleanAndFormatImageUrl(rawImage as string);

            return {
              sku: String(rawSku).trim(),
              name: String(rawName).trim(),
              brand: String(rawBrand).trim(),
              category: 'ทั่วไป',
              detail: null,
              base_price: rawBasePrice,
              discount: discount,
              image_url: cleanedImageUrl,
            };
          });

        if (validProducts.length === 0) {
          throw new Error('ไม่พบแถวข้อมูลสินค้าที่มีคอลัมน์ sku และ name ที่ถูกต้อง');
        }

        setIsImporting(true);
        setImportProgressText(`กำลังเตรียมนำเข้า ${validProducts.length.toLocaleString()} รายการ...`);

        const count = await bulkUpsertProducts(validProducts, (processed, total) => {
          setImportProgressText(
            `กำลังนำเข้า ${processed.toLocaleString()} / ${total.toLocaleString()} รายการ (${Math.round(
              (processed / total) * 100
            )}%)...`
          );
        });

        showToast('success', `นำเข้าข้อมูลสินค้าสำเร็จ ${count.toLocaleString()} รายการ`);
        loadTableData();
        refreshMissingImagesCount();
        onRefresh();

        // Also update brands
        const newBrands = new Set(brands);
        validProducts.forEach((p) => {
          if (p.brand) newBrands.add(p.brand);
        });
        const sortedBrands = Array.from(newBrands).sort((a, b) =>
          a.localeCompare(b, 'en', { sensitivity: 'base' })
        );
        setBrands(sortedBrands);
        saveBrands(sortedBrands);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ Excel';
        showToast('error', msg);
      } finally {
        setIsImporting(false);
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // --------------------------------------------------------------------------
  // 4. Batch Upload Images by SKU
  // --------------------------------------------------------------------------
  const handleBatchImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBatchUploading(true);
    setBatchProgressText(`กำลังเตรียมอัปโหลด ${files.length} ไฟล์...`);

    try {
      const fileList = Array.from(files);
      const result = await batchUploadImagesBySku(
        fileList,
        (current: number, total: number, currentSku: string) => {
          setBatchProgressText(`อัปโหลด (${current}/${total}): ${currentSku}...`);
        }
      );

      if (result.matchedSkus.length > 0) {
        showToast(
          'success',
          `อัปโหลดและจับคู่รูปภาพสำเร็จ ${result.matchedSkus.length} สินค้า (อัปโหลดไป ${result.successCount} ไฟล์)`
        );
        loadTableData();
        refreshMissingImagesCount();
        onRefresh();
      } else {
        showToast(
          'info',
          `อัปโหลด ${result.successCount} ไฟล์แล้ว แต่ไม่พบรหัสสินค้า (SKU) ที่ตรงกับชื่อไฟล์`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดรูปชุด';
      showToast('error', msg);
    } finally {
      setIsBatchUploading(false);
      setBatchProgressText('');
      if (batchImageInputRef.current) batchImageInputRef.current.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // Table Sorting and Filtering (รองรับการกรองด้วย Dropdown ยี่ห้อ)
  // --------------------------------------------------------------------------
  const handleSortHeader = (field: AdminSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const isAll = pageSize === -1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = tableProducts;
  const startIndex = isAll ? 0 : (safePage - 1) * pageSize;
  const endIndex = isAll ? totalCount : Math.min(startIndex + pageSize, totalCount);

  // Checkbox Selection Helpers
  const currentPageIds = useMemo(() => paginatedProducts.map((p) => p.id), [paginatedProducts]);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmMessage = `คุณต้องการลบสินค้าที่เลือกทั้งหมด ${selectedIds.length} รายการใช่หรือไม่?\n(การลบนี้จะนำออกจากฐานข้อมูลและไม่สามารถย้อนคืนได้)`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await bulkDeleteProducts(selectedIds);
      showToast('success', `ลบสินค้า ${selectedIds.length} รายการเรียบร้อยแล้ว`);
      setSelectedIds([]);
      loadTableData();
      refreshMissingImagesCount();
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสินค้าเป็นชุด';
      showToast('error', msg);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 selection:bg-amber-400 selection:text-zinc-950">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-300 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-950/95 text-rose-300 border-rose-700'
                : 'bg-zinc-900/95 text-zinc-100 border-zinc-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <FileSpreadsheet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            <span className="flex-1 font-medium">{toast.text}</span>
          </div>
        ))}
      </div>

      {/* Brand Manager Modal */}
      <BrandCategoryManagerModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        brands={brands}
        products={localProducts}
        onSaveBrands={(updated) => {
          const sorted = [...updated].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
          setBrands(sorted);
          saveBrands(sorted);
        }}
        onBrandDeleted={async (deletedBrand, reassignTo) => {
          if (reassignTo) {
            setLocalProducts((prev) =>
              prev.map((p) =>
                (p.brand || '').trim().toLowerCase() === deletedBrand.trim().toLowerCase()
                  ? { ...p, brand: reassignTo }
                  : p
              )
            );
          }
          if (selectedBrandFilter.toLowerCase() === deletedBrand.toLowerCase()) {
            setSelectedBrandFilter(reassignTo || 'All');
          }
          if (onRefresh) {
            await onRefresh();
          }
        }}
      />

      {/* Admin SOP / How-to Guide Modal */}
      <AdminGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* Header Bar (Black & Yellow Theme) */}
      <header className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-3">
          {/* Row 1: Brand & Top Utilities (Back, Title, Product Count, Guide, Logout) */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-zinc-850/80">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBackToCatalog}
                className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                title="กลับหน้าแคตาล็อก"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="TOOL SHOP 226 Plus"
                    className="w-full h-full object-contain drop-shadow"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black text-white truncate">
                      TOOL SHOP 226 Plus Admin
                    </h1>
                    <span className="bg-zinc-850 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-zinc-700/80 shrink-0">
                      {totalCount.toLocaleString()} สินค้า
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                    จัดการแคตาล็อกสินค้า อัปโหลดรูปภาพ และซิงค์ข้อมูลผ่าน Excel / CSV
                  </p>
                </div>
              </div>
            </div>

            {/* Top Right: Guide & Logout */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Guide / SOP Button */}
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 hover:text-amber-300 rounded-xl border border-amber-400/40 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="คู่มือและวิธีใช้งานแถบเครื่องมือหลังบ้าน (SOP)"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>วิธีใช้งาน</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 sm:px-3.5 sm:py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/80 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="ออกจากระบบแอดมิน (กลับเป็นโหมดแคตาล็อก)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">ออกจากระบบ</span>
                <span className="xs:hidden">ออก</span>
              </button>
            </div>
          </div>

          {/* Row 2: Action Command Toolbar (Grouped logically) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            {/* Operational Tools (Excel, Images, Brands) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Excel Group */}
              <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 shadow-2xs">
                {/* Template Download */}
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="ดาวน์โหลดเทมเพลต Excel เปล่า (6 คอลัมน์)"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>โหลดเทมเพลต</span>
                </button>

                {/* Export Catalog */}
                <button
                  onClick={handleExportCatalog}
                  className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border-l border-zinc-800"
                  title="ส่งออกข้อมูลทั้งหมดเป็น Excel (6 คอลัมน์)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export</span>
                </button>

                {/* Import Excel */}
                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelImport}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => excelInputRef.current?.click()}
                  disabled={isImporting}
                  className="text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer ml-0.5"
                  title="นำเข้าไฟล์ Excel หรือ CSV"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isImporting ? (importProgressText || 'กำลังนำเข้า...') : 'Import Excel'}</span>
                </button>
              </div>

              {/* Batch Images Upload */}
              <input
                type="file"
                ref={batchImageInputRef}
                onChange={handleBatchImagesUpload}
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
              />
              <button
                onClick={() => batchImageInputRef.current?.click()}
                disabled={isBatchUploading}
                className="text-xs font-semibold px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
                title="เลือกรูปหลายไฟล์พร้อมกัน โดยตั้งชื่อไฟล์เป็นรหัสสินค้า เช่น SATA-09014.jpg"
              >
                {isBatchUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Images className="w-3.5 h-3.5" />}
                <span>{isBatchUploading ? (batchProgressText || 'กำลังอัปโหลด...') : 'อัปโหลดรูปชุด'}</span>
              </button>

              {/* Manage Brands */}
              <button
                onClick={() => setIsBrandModalOpen(true)}
                className="text-xs font-semibold px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 rounded-xl border border-zinc-800 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="จัดการรายชื่อยี่ห้อสินค้า"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>จัดการยี่ห้อ</span>
              </button>
            </div>

            {/* Primary Action: Add Product */}
            <button
              onClick={openAddModal}
              className="text-xs font-black px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-amber-400/20 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มสินค้าใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5">
        {/* Table Search & Brand Dropdown Filter Bar */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3.5 mb-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหา (SKU, ชื่อ, ยี่ห้อ)..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-zinc-100 placeholder-zinc-500 font-medium"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Brand Dropdown Search Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                ยี่ห้อ:
              </span>
              <select
                value={selectedBrandFilter}
                onChange={(e) => {
                  setSelectedBrandFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 py-2 px-3 rounded-xl font-medium focus:outline-none focus:border-amber-400 text-xs cursor-pointer hover:border-zinc-700"
              >
                <option value="All">ทุกยี่ห้อ ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Missing Image Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setFilterNoImage((prev) => !prev);
                setCurrentPage(1);
              }}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                filterNoImage
                  ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-sm font-bold'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
              }`}
              title="แสดงเฉพาะสินค้าที่ยังไม่มีรูปภาพประกอบ"
            >
              <ImageOff className="w-3.5 h-3.5" />
              <span>ยังไม่มีรูป</span>
              {missingImagesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    filterNoImage
                      ? 'bg-zinc-950 text-amber-400'
                      : 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  }`}
                >
                  {missingImagesCount}
                </span>
              )}
            </button>

            {(searchFilter || selectedBrandFilter !== 'All' || filterNoImage) && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setSelectedBrandFilter('All');
                  setFilterNoImage(false);
                  setCurrentPage(1);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <span>
                พบสินค้า: <strong className="text-amber-400 font-bold">{totalCount}</strong> รายการ
              </span>
              {isLoadingTable && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-amber-400/10 border border-amber-400/40 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-md">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-300">
              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                เลือกอยู่ <strong className="text-white font-bold">{selectedIds.length}</strong> รายการ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-medium px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                ยกเลิกการเลือก
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="text-xs font-bold px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบที่เลือก ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Product Management Table (Theme: ดำเป็นหลัก เหลืองเป็นรอง) */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-950/90 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[11px] select-none">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAllCurrentPage}
                      aria-label="เลือกสินค้าทั้งหมดในหน้านี้"
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-400"
                    />
                  </th>
                  <th className="py-3 px-4">รูปภาพ</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-800/60 transition-colors whitespace-nowrap min-w-[130px]"
                    onClick={() => handleSortHeader('sku')}
                  >
                    <div className="flex items-center gap-1">
                      <span>รหัส (SKU)</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 min-w-[220px] cursor-pointer hover:bg-zinc-800/60 transition-colors"
                    onClick={() => handleSortHeader('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>ชื่อสินค้า</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-800/60 transition-colors whitespace-nowrap min-w-[120px]"
                    onClick={() => handleSortHeader('brand')}
                  >
                    <div className="flex items-center gap-1">
                      <span>ยี่ห้อ</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-800/60 transition-colors"
                    onClick={() => handleSortHeader('base_price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ราคาตั้ง</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-800/60 transition-colors"
                    onClick={() => handleSortHeader('discount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ส่วนลด</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-zinc-800/60 transition-colors"
                    onClick={() => handleSortHeader('final_price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ราคาขายใหม่</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-normal">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((p) => {
                    const discountPct = calculateDiscountPercent(p.base_price, p.discount);
                    const isSelected = selectedIds.includes(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-amber-400/10 hover:bg-amber-400/15' : 'hover:bg-zinc-850/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(p.id)}
                            aria-label={`เลือก ${p.sku}`}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer accent-amber-400"
                          />
                        </td>

                        {/* Image Thumbnail */}
                        <td className="py-3 px-4">
                          <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-zinc-950 text-amber-400 rounded-md border border-zinc-800 whitespace-nowrap inline-block">
                            {p.sku}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-100 leading-snug">{p.name}</div>
                        </td>

                        {/* Brand */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded text-xs border border-zinc-700 whitespace-nowrap inline-block">
                            {p.brand}
                          </span>
                        </td>

                        {/* Base Price */}
                        <td className="py-3 px-4 text-right font-medium text-zinc-500">
                          {isPriceInquiry(p) ? (
                            <span className="text-zinc-600">-</span>
                          ) : (
                            `฿${formatNumber(p.base_price)}`
                          )}
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-4 text-right">
                          {isPriceInquiry(p) ? (
                            <span className="text-zinc-600">-</span>
                          ) : p.discount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-emerald-400">
                                -฿{formatNumber(p.discount)}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 px-1 rounded">
                                (-{discountPct}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>

                        {/* Final Price (ราคาขายใหม่ หรือ สอบถาม) */}
                        <td className="py-3 px-4 text-right font-black text-sm sm:text-base">
                          {isPriceInquiry(p) ? (
                            <span className="text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 font-black text-xs inline-block">
                              สอบถาม
                            </span>
                          ) : (
                            <span className="text-rose-500">
                              ฿{formatNumber(p.final_price)}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="แก้ไขข้อมูลสินค้า"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-zinc-500">
                      ไม่พบข้อมูลสินค้าที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-zinc-800 gap-3 text-xs text-zinc-400">
              <div>
                แสดง {startIndex + 1} - {endIndex} จากทั้งหมด {totalCount} รายการ
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (page === 1 || page === totalPages || (page >= safePage - 1 && page <= safePage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg font-bold transition-all ${
                          page === safePage
                            ? 'bg-amber-400 text-zinc-950 shadow-md'
                            : 'border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-colors"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* PRODUCT FORM MODAL (ADD / EDIT) (Dark Theme)                    */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-zinc-800 max-h-[92vh] flex flex-col text-zinc-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Row 1: SKU & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    รหัสสินค้า (SKU) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="เช่น SATA-09014"
                    className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none font-mono text-zinc-100 placeholder-zinc-500"
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="ยี่ห้อ (Brand)"
                    required
                    value={formBrand}
                    onChange={setFormBrand}
                    options={brands}
                    placeholder="เลือกหรือค้นหายี่ห้อ..."
                    onAddNewOption={(newBrand) => {
                      const updated = [...brands, newBrand].sort((a, b) =>
                        a.localeCompare(b, 'en', { sensitivity: 'base' })
                      );
                      setBrands(updated);
                      saveBrands(updated);
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Name (Full Width) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ชื่อรายการสินค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น ชุดประแจแหวนข้างปากตาย 14 ชิ้น"
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none font-medium text-zinc-100 placeholder-zinc-500"
                />
              </div>

              {/* Row 3: Pricing & Discount */}
              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-400">การตั้งราคาและส่วนลด</span>
                  {/* Mode Switcher */}
                  <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs flex-wrap gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPricingMode('new_price');
                        if (Number(formBasePrice) === 0) setFormBasePrice('');
                        if (Number(formFinalPrice) === 0) setFormFinalPrice('');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        pricingMode === 'new_price'
                          ? 'bg-amber-400 text-zinc-950 shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="กรอกราคาตั้ง และกรอกราคาขายใหม่ ระบบจะคำนวณส่วนลดให้อัตโนมัติ"
                    >
                      กรอกราคาใหม่ (฿)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPricingMode('amount');
                        if (Number(formBasePrice) === 0) setFormBasePrice('');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        pricingMode === 'amount'
                          ? 'bg-amber-400 text-zinc-950 shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      กรอกส่วนลด (฿)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPricingMode('percent');
                        if (Number(formBasePrice) === 0) setFormBasePrice('');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        pricingMode === 'percent'
                          ? 'bg-amber-400 text-zinc-950 shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      กรอกส่วนลด (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPricingMode('inquire');
                        setFormBasePrice(0);
                        setFormFinalPrice(0);
                        setFormDiscount(0);
                        setFormDiscountPercent(0);
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        pricingMode === 'inquire'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-400 hover:text-rose-300'
                      }`}
                      title="เปลี่ยนราคาเป็น 'สอบถาม' (ไม่แสดงตัวเลขราคาบนหน้าเว็บ)"
                    >
                      💬 ราคา: สอบถาม
                    </button>
                  </div>
                </div>

                {pricingMode === 'inquire' ? (
                  /* Inquire Price Callout Banner */
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-rose-500">
                          ตั้งราคาเป็น: &ldquo;สอบถาม&rdquo;
                        </span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        สินค้านี้จะไม่แสดงตัวเลขราคาบนหน้าเว็บ โดยจะแสดงเป็นข้อความสีแดง <strong>&ldquo;สอบถาม&rdquo;</strong> และลูกค้ากดเพื่อแอด LINE สอบถามราคาได้ทันที
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-rose-500">
                        สอบถาม
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Base Price (ราคาตั้ง) */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        ราคาตั้ง (Base Price) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-zinc-500 text-sm">฿</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formBasePrice}
                          onChange={(e) => handleBasePriceChange(e.target.value)}
                          placeholder="1850"
                          className="w-full pl-7 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none text-zinc-100 font-medium"
                        />
                      </div>
                    </div>

                    {/* Mode 1: กรอกราคาใหม่ (New Price) */}
                    {pricingMode === 'new_price' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          ราคาขายใหม่ (New Price) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-zinc-500 text-sm">฿</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formFinalPrice}
                            onChange={(e) => handleNewPriceChange(e.target.value)}
                            placeholder="1800"
                            className="w-full pl-7 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none text-rose-500 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode 2: กรอกส่วนลดเป็นบาท */}
                    {pricingMode === 'amount' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          ส่วนลด (จำนวนเงิน ฿)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-zinc-500 text-sm">฿</span>
                          <input
                            type="number"
                            step="0.01"
                            value={formDiscount}
                            onChange={(e) => handleDiscountAmountChange(e.target.value)}
                            placeholder="360"
                            className="w-full pl-7 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none text-emerald-400 font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode 3: กรอกส่วนลดเป็น % */}
                    {pricingMode === 'percent' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          ส่วนลด (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formDiscountPercent}
                            onChange={(e) => handleDiscountPercentChange(e.target.value)}
                            placeholder="15"
                            className="w-full pl-3 pr-7 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none text-emerald-400 font-medium"
                          />
                          <span className="absolute right-3 top-2 text-zinc-500 text-sm">%</span>
                        </div>
                      </div>
                    )}

                    {/* Result Summary Box */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        สรุปราคาและส่วนลด
                      </label>
                      <div className="py-2 px-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs flex flex-col justify-center min-h-[38px]">
                        <div className="flex items-center justify-between font-bold text-rose-500">
                          <span>฿{formatNumber(Math.max(0, (Number(formBasePrice) || 0) - (Number(formDiscount) || 0)))}</span>
                          {Number(formDiscount) > 0 && (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-extrabold px-1.5 py-0.5 rounded text-[11px]">
                              ลด ฿{formatNumber(formDiscount)} (-{formDiscountPercent}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: Detail */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  รายละเอียดสินค้า (Specifications / Materials)
                </label>
                <textarea
                  rows={2}
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder="เช่น สเปก วัสดุ ขนาด ขนาดเบอร์ประแจ..."
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none text-zinc-100 placeholder-zinc-500"
                />
              </div>

              {/* Row 6: Image Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  รูปภาพสินค้า (อัปโหลดเข้า Supabase Storage bucket: product-images)
                </label>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-20 h-20 bg-zinc-950 rounded-lg border border-zinc-800 p-1 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-amber-400 block">
                          {selectedFile ? 'เลือกไฟล์ใหม่แล้ว' : 'ใช้รูปภาพปัจจุบัน'}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          คลิกหรือลากไฟล์ใหม่มาวางเพื่อเปลี่ยนรูป
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto" />
                      <div className="text-xs font-semibold text-zinc-300">
                        ลากรูปมาวางที่นี่ หรือ <span className="text-amber-400 underline font-bold">เลือกไฟล์</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        รองรับไฟล์ JPG, PNG, WebP
                      </div>
                    </div>
                  )}
                </div>

                {/* Image URL fallback */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 shrink-0">หรือใส่ URL รูปตรง:</span>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => {
                      setFormImageUrl(e.target.value);
                      if (e.target.value) setImagePreview(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-amber-400 font-mono text-zinc-100 placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage || isPending}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-black transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {uploadingImage || isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
