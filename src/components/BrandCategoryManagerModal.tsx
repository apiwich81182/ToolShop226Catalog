'use client';

import React, { useState } from 'react';
import { Product } from '@/types/product';
import { X, Plus, Trash2, Tag, CheckCircle, AlertCircle } from 'lucide-react';

interface BrandCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: string[];
  categories?: string[];
  products: Product[];
  onSaveBrands: (brands: string[]) => void;
  onSaveCategories?: (categories: string[]) => void;
}

export const BrandCategoryManagerModal: React.FC<BrandCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  brands,
  products,
  onSaveBrands,
}) => {
  const [newBrandInput, setNewBrandInput] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
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

  // Delete Brand
  const handleDeleteBrand = (brandToDelete: string) => {
    const usageCount = products.filter(
      (p) => p.brand.toLowerCase() === brandToDelete.toLowerCase()
    ).length;

    const confirmText =
      usageCount > 0
        ? `ยี่ห้อ "${brandToDelete}" มีสินค้าใช้งานอยู่ ${usageCount} รายการ คุณต้องการลบออกจากรายการแนะนำใช่หรือไม่?`
        : `คุณต้องการลบยี่ห้อ "${brandToDelete}" ใช่หรือไม่?`;

    if (!confirm(confirmText)) return;

    const updated = brands.filter((b) => b !== brandToDelete);
    onSaveBrands(updated);
    showMsg(`ลบยี่ห้อ "${brandToDelete}" เรียบร้อย`);
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

        {/* Brand List (Sorted A-Z) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar my-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 mb-1">
            <span>รายชื่อยี่ห้อทั้งหมด (เรียง A-Z)</span>
            <span className="font-semibold text-amber-400">{brands.length} ยี่ห้อ</span>
          </div>

          <div className="space-y-1.5">
            {brands.map((brand) => {
              const count = products.filter(
                (p) => p.brand.toLowerCase() === brand.toLowerCase()
              ).length;

              return (
                <div
                  key={brand}
                  className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-100">{brand}</span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-full font-medium">
                      {count} สินค้า
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBrand(brand)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
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
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
