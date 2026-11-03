'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types/product';
import { fetchProducts, fetchBrands } from '@/lib/productsApi';
import { CatalogPage } from '@/components/CatalogPage';
import { AdminDashboard } from '@/components/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'catalog' | 'admin'>('catalog');

  const loadData = useCallback(async () => {
    try {
      const [productsData, brandsData] = await Promise.all([
        fetchProducts(),
        fetchBrands(),
      ]);
      setProducts(productsData || []);
      setBrands(brandsData || []);
    } catch (err) {
      console.error('Failed to load catalog data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackToCatalog = useCallback(async () => {
    // Re-sync catalog data before showing catalog view
    await loadData();
    setView('catalog');
  }, [loadData]);

  const handleProductsUpdate = useCallback((updatedProducts: Product[]) => {
    setProducts(updatedProducts);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <span className="text-sm font-semibold text-zinc-300">
          กำลังโหลดแคตาล็อกสินค้า...
        </span>
      </div>
    );
  }

  return (
    <>
      {view === 'catalog' ? (
        <CatalogPage
          initialProducts={products}
          availableBrands={brands}
          onOpenAdmin={() => setView('admin')}
        />
      ) : (
        <AdminDashboard
          products={products}
          onRefresh={loadData}
          onBackToCatalog={handleBackToCatalog}
          onProductsUpdate={handleProductsUpdate}
        />
      )}
    </>
  );
}
