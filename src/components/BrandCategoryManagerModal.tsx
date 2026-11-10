'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { deleteBrand, fetchBrandProductCounts } from '@/lib/productsApi';
import { X, Plus, Trash2, Tag, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface BrandCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: string[];
  categories?: string[];
  products?: Product[];
  onSaveBrands: (brands: string[]) => void;
  onSaveCategories?: (categories: string[]) => void;
  onBrandDeleted?: (deletedBrand: string, reassignTo?: string) => Promise<void> | void;
}

export const BrandCategoryManagerModal: React.FC<BrandCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  brands,
  products = [],
  onSaveBrands,
  onBrandDeleted,
}) => {
  const [newBrandInput, setNewBrandInput] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // In-modal Delete & Reassign confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    brand: string;
    count: number;
    similarBrand?: string;
  } | null>(null);
  const [reassignBrand, setReassignBrand] = useState<string>('');
  const [deleteMode, setDeleteMode] = useState<'reassign' | 'keep_products'>('reassign');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch real product counts directly from database whenever modal opens
  const loadCounts = () => {
    setIsLoadingCounts(true);
    fetchBrandProductCounts()
      .then((counts) => {
        setBrandCounts(counts);
      })
      .catch((err) => {
        console.warn('Failed to load brand counts:', err);
      })
      .finally(() => {
        setIsLoadingCounts(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadCounts();
      setDeleteTarget(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Add Brand
  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBrandInput.trim();
    if (!trimmed) return;
    if (brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      showMsg(`ยี่ห้อ "${trimmed}" มีอยู่ในระบบแล้ว`, 'error');
      return;
    }
    const updated = [...brands, trimmed].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    onSaveBrands(updated);
    setNewBrandInput('');
    showMsg(`เพิ่มยี่ห้อ "${trimmed}" สำเร็จ`);
  };

  // Trigger Delete confirmation
  const startDeleteBrand = (brand: string) => {
    const key = brand.trim().toLowerCase();
    const count = brandCounts[key] ?? products.filter(
      (p) => (p.brand || '').trim().toLowerCase() === key
    ).length;

    // Check if there is another brand in the list with same letters but different casing
    const similar = brands.find(
      (b) => b.trim().toLowerCase() === key && b.trim() !== brand.trim()
    );

    const otherBrands = brands.filter((b) => b.trim() !== brand.trim());
    const defaultReassign = similar || otherBrands[0] || '';

    setDeleteTarget({
      brand,
      count,
      similarBrand: similar,
    });
    setReassignBrand(defaultReassign);
    setDeleteMode(similar || count > 0 ? 'reassign' : 'keep_products');
  };

  // Execute Brand Deletion (with optional product reassignment)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const brandToDelete = deleteTarget.brand;
      const targetReassign =
        deleteTarget.count > 0 && deleteMode === 'reassign' && reassignBrand
          ? reassignBrand
          : undefined;

      // 1. Permanently delete from Supabase and reassign products if chosen
      await deleteBrand(brandToDelete, targetReassign);

      // 2. Call external callback if provided
      if (onBrandDeleted) {
        await onBrandDeleted(brandToDelete, targetReassign);
      }

      // 3. Update local list of brands
      let updated = brands.filter((b) => b !== brandToDelete);
      if (targetReassign && !updated.includes(targetReassign)) {
        updated.push(targetReassign);
      }
      updated.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      onSaveBrands(updated);

      // 4. Reload brand product counts
      loadCounts();

      // 5. Show toast
      if (targetReassign) {
        showMsg(`ย้ายสินค้า ${deleteTarget.count} รายการไปยัง "${targetReassign}" และลบยี่ห้อ "${brandToDelete}" เรียบร้อย`);
      } else {
        showMsg(`ลบยี่ห้อ "${brandToDelete}" เรียบร้อยแล้ว`);
      }

      setDeleteTarget(null);
    } catch (err: unknown) {
      console.error('Failed to delete brand:', err);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบยี่ห้อ';
      showMsg(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-zinc-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-950 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">จัดการยี่ห้อสินค้า (Brands)</h2>
              <p className="text-xs text-zinc-400">
                เพิ่มหรือลบรายชื่อยี่ห้อ เพื่อเชื่อมต่อกับฟอร์มสินค้าและตัวกรองค้นหา
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`my-3 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Brand Form */}
        <form onSubmit={handleAddBrand} className="flex gap-2 my-4">
          <input
            type="text"
            value={newBrandInput}
            onChange={(e) => setNewBrandInput(e.target.value)}
            placeholder="พิมพ์ชื่อยี่ห้อใหม่ เช่น Milwaukee, Bosch, SATA..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มยี่ห้อ</span>
          </button>
        </form>

        {/* In-Modal Delete Confirmation Box */}
        {deleteTarget && (
          <div className="my-3 p-4 bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>ยืนยันการลบยี่ห้อ</span>
                    <span className="text-amber-400 underline decoration-amber-400/50">&ldquo;{deleteTarget.brand}&rdquo;</span>
                  </h3>
                  {deleteTarget.count > 0 ? (
                    <p className="text-xs text-zinc-300 mt-1">
                      มียอดสินค้าใช้งานอยู่ <span className="font-bold text-amber-400">{deleteTarget.count}</span> รายการในระบบ
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 mt-1">
                      ยี่ห้อนี้ไม่มีสินค้าค้างอยู่ในระบบ ยืนยันที่จะลบออกจากระบบอย่างถาวรหรือไม่?
                    </p>
                  )}
                </div>

                {deleteTarget.count > 0 && (
                  <div className="space-y-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs">
                    <p className="font-semibold text-zinc-200">เลือกวิธีจัดการสินค้าของยี่ห้อนี้:</p>

                    {/* Option 1: Reassign / Merge */}
                    <label className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-amber-400/50 transition-colors">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="reassign"
                        checked={deleteMode === 'reassign'}
                        onChange={() => setDeleteMode('reassign')}
                        className="mt-0.5 accent-amber-400"
                      />
                      <div className="flex-1 space-y-1">
                        <span className="font-medium text-zinc-200 block">
                          ย้ายสินค้าไปยังยี่ห้ออื่น (แนะนำ)
                        </span>
                        {deleteTarget.similarBrand && (
                          <span className="inline-block text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono">
                            พบชื่อสะกดคล้ายกัน: {deleteTarget.similarBrand}
                          </span>
                        )}
                        {deleteMode === 'reassign' && (
                          <select
                            value={reassignBrand}
                            onChange={(e) => setReassignBrand(e.target.value)}
                            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          >
                            {brands
                              .filter((b) => b !== deleteTarget.brand)
                              .map((b) => (
                                <option key={b} value={b}>
                                  ย้ายไป {b} {b === deleteTarget.similarBrand ? '⭐ (แนะนำ)' : ''}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </label>

                    {/* Option 2: Keep products as-is, just delete brand recommendation */}
                    <label className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="keep_products"
                        checked={deleteMode === 'keep_products'}
                        onChange={() => setDeleteMode('keep_products')}
                        className="mt-0.5 accent-amber-400"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-zinc-300 block">
                          ลบเฉพาะยี่ห้อออกจากรายการแนะนำ (คงชื่อสินค้าเดิมไว้)
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          สินค้าจะยังไม่เปลี่ยนชื่อ แต่ยี่ห้อนี้จะถูกลบออกจากแถบตัวกรองหน้าเว็บ
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Confirm / Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting || (deleteTarget.count > 0 && deleteMode === 'reassign' && !reassignBrand)}
                    onClick={handleConfirmDelete}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังดำเนินการ...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ยืนยันการลบ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand List (Sorted A-Z) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar my-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 mb-1">
            <span className="flex items-center gap-1.5">
              <span>รายชื่อยี่ห้อทั้งหมด (เรียง A-Z)</span>
              <button
                type="button"
                onClick={loadCounts}
                title="รีเฟรชจำนวนสินค้าล่าสุด"
                className="hover:text-amber-400 transition-colors cursor-pointer p-0.5"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingCounts ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </span>
            <span className="font-semibold text-amber-400">{brands.length} ยี่ห้อ</span>
          </div>

          <div className="space-y-1.5">
            {brands.map((brand) => {
              const key = brand.trim().toLowerCase();
              const count = brandCounts[key] ?? products.filter(
                (p) => (p.brand || '').trim().toLowerCase() === key
              ).length;

              const isCurrentDeleteTarget = deleteTarget?.brand === brand;

              return (
                <div
                  key={brand}
                  className={`flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border transition-colors ${
                    isCurrentDeleteTarget
                      ? 'border-rose-500/70 bg-rose-950/20'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-100">{brand}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                        count > 0
                          ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                          : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      {isLoadingCounts && Object.keys(brandCounts).length === 0 ? '...' : `${count} สินค้า`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => startDeleteBrand(brand)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title={`ลบยี่ห้อ ${brand}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
