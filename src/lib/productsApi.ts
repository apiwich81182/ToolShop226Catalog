import { Product, ProductInput } from '@/types/product';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { INITIAL_PRODUCTS, DEFAULT_BRANDS, DEFAULT_CATEGORIES } from './mockData';
import { cleanAndFormatImageUrl } from './utils';

const LOCAL_STORAGE_KEY = 'hardware_catalog_products';
const BRANDS_STORAGE_KEY = 'hardware_catalog_brands';
const CATEGORIES_STORAGE_KEY = 'hardware_catalog_categories';

// ============================================================================
// Brands & Categories API
// ============================================================================

export async function fetchBrands(): Promise<string[]> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(BRANDS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse cached brands', e);
      }
    }
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(DEFAULT_BRANDS));
  }
  return DEFAULT_BRANDS;
}

export async function saveBrands(brands: string[]): Promise<string[]> {
  const unique = Array.from(new Set(brands.map((b) => b.trim()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(unique));
  }
  return unique;
}

export async function fetchCategories(): Promise<string[]> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse cached categories', e);
      }
    }
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  }
  return DEFAULT_CATEGORIES;
}

export async function saveCategories(categories: string[]): Promise<string[]> {
  const unique = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(unique));
  }
  return unique;
}

// ============================================================================
// Products API
// ============================================================================

export async function fetchProducts(): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, fallback to local:', error.message);
      } else if (data && data.length > 0) {
        return data.map((item) => ({
          ...item,
          stock_quantity: item.stock_quantity ?? (item.is_in_stock ? 10 : 0),
        })) as Product[];
      }
    } catch (err) {
      console.warn('Supabase connection failed, using local storage fallback:', err);
    }
  }

  // Fallback to LocalStorage or Mock data
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed: Product[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize products so stock_quantity and is_in_stock are always consistent
          const normalized = parsed.map((item) => {
            const inStock = Boolean(item.is_in_stock);
            const qty = item.stock_quantity !== undefined
              ? Number(item.stock_quantity) || 0
              : (inStock ? 10 : 0);
            return {
              ...item,
              is_in_stock: inStock,
              stock_quantity: inStock ? Math.max(1, qty) : 0,
            };
          });
          // Update cached storage with normalized structure
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
          return normalized;
        }
      } catch (e) {
        console.error('Failed to parse cached products', e);
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  }
  return INITIAL_PRODUCTS;
}

export async function toggleProductStock(
  id: string,
  currentStatus: boolean,
  targetPromo?: string
): Promise<boolean> {
  const newStatus = !currentStatus;
  const newPromo = targetPromo || (newStatus ? 'พร้อมส่ง' : 'สินค้าหมด');
  const newQty = newStatus ? 10 : 0;

  if (isSupabaseConfigured()) {
    try {
      const updatePayload: Record<string, unknown> = {
        is_in_stock: newStatus,
        stock_quantity: newQty,
        promo_text: newPromo,
      };
      await supabase
        .from('products')
        .update(updatePayload)
        .or(`id.eq.${id},sku.eq.${id}`);
    } catch (err) {
      console.warn('Supabase toggleProductStock warning:', err);
    }
  }

  // Update local storage for demo/offline resilience
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const products: Product[] = JSON.parse(cached);
      const updated = products.map((p) => {
        if (p.id === id || p.sku === id) {
          return {
            ...p,
            is_in_stock: newStatus,
            stock_quantity: newQty,
            promo_text: newPromo,
          };
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  }

  return newStatus;
}

export async function updateProductStockQuantity(id: string, newQuantity: number): Promise<void> {
  const qty = Math.max(0, Number(newQuantity) || 0);
  const inStock = qty > 0;

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: qty, is_in_stock: inStock })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const products: Product[] = JSON.parse(cached);
      const updated = products.map((p) =>
        p.id === id ? { ...p, stock_quantity: qty, is_in_stock: inStock } : p
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  }
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const base_price = Number(input.base_price) || 0;
  const discount = Number(input.discount) || 0;
  const final_price = Math.max(0, base_price - discount);
  const formattedImageUrl = cleanAndFormatImageUrl(input.image_url);
  const is_in_stock = Boolean(input.is_in_stock);
  const stock_quantity = is_in_stock ? Math.max(1, Number(input.stock_quantity) || 10) : 0;

  const productData = {
    ...input,
    base_price,
    discount,
    stock_quantity,
    is_in_stock,
    image_url: formattedImageUrl,
  };

  if (isSupabaseConfigured()) {
    if (input.id) {
      // Update existing
      const { data, error } = await supabase
        .from('products')
        .update({
          sku: productData.sku,
          name: productData.name,
          brand: productData.brand,
          category: productData.category,
          detail: productData.detail,
          base_price: productData.base_price,
          discount: productData.discount,
          promo_text: productData.promo_text,
          image_url: productData.image_url,
          is_in_stock: productData.is_in_stock,
          stock_quantity: productData.stock_quantity,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Product;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Product;
    }
  }

  // Local storage mock fallback
  const newProduct: Product = {
    id: input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}`),
    sku: input.sku,
    name: input.name,
    brand: input.brand,
    category: input.category || 'General',
    detail: input.detail || null,
    base_price,
    discount,
    final_price,
    promo_text: input.promo_text || null,
    image_url: formattedImageUrl,
    is_in_stock,
    stock_quantity,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    const products: Product[] = cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    const existingIndex = products.findIndex((p) => p.id === newProduct.id || p.sku === newProduct.sku);
    let updated: Product[];
    if (existingIndex >= 0) {
      updated = [...products];
      updated[existingIndex] = newProduct;
    } else {
      updated = [newProduct, ...products];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  return newProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const products: Product[] = JSON.parse(cached);
      const filtered = products.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  }
}

export async function uploadProductImage(file: File, sku: string): Promise<string> {
  const cleanSku = (sku || 'item').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${cleanSku}-${Date.now()}.webp`;

  if (isSupabaseConfigured()) {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload to Supabase Storage failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }

  // Fallback for preview / dev if Supabase is not connected
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export async function bulkUpsertProducts(products: ProductInput[]): Promise<number> {
  if (products.length === 0) return 0;

  if (isSupabaseConfigured()) {
    const payload = products.map((p) => {
      const stock_quantity = Math.max(0, Number(p.stock_quantity) || 0);
      const is_in_stock = p.is_in_stock !== undefined ? p.is_in_stock : stock_quantity > 0;
      return {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category || 'General',
        detail: p.detail || null,
        base_price: Number(p.base_price) || 0,
        discount: Number(p.discount) || 0,
        promo_text: p.promo_text || null,
        image_url: cleanAndFormatImageUrl(p.image_url),
        stock_quantity: is_in_stock ? Math.max(1, stock_quantity) : 0,
        is_in_stock,
      };
    });

    const { error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'sku' });

    if (error) {
      throw new Error(`Bulk upsert failed: ${error.message}`);
    }
    return products.length;
  }

  // Local storage mock fallback
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: Product[] = cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    const map = new Map<string, Product>();
    existing.forEach((p) => map.set(p.sku, p));

    products.forEach((p) => {
      const base = Number(p.base_price) || 0;
      const disc = Number(p.discount) || 0;
      const formattedImg = cleanAndFormatImageUrl(p.image_url);
      const existingProduct = map.get(p.sku);
      const stock_quantity =
        p.stock_quantity !== undefined
          ? Math.max(0, Number(p.stock_quantity) || 0)
          : existingProduct?.stock_quantity ?? 10;
      const is_in_stock =
        p.is_in_stock !== undefined ? p.is_in_stock : stock_quantity > 0;

      map.set(p.sku, {
        id: p.id || existingProduct?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mock-${Math.random()}`),
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category || 'General',
        detail: p.detail || null,
        base_price: base,
        discount: disc,
        final_price: Math.max(0, base - disc),
        promo_text: p.promo_text || null,
        image_url: formattedImg || existingProduct?.image_url || null,
        stock_quantity: is_in_stock ? Math.max(1, stock_quantity) : 0,
        is_in_stock,
        created_at: existingProduct?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  }

  return products.length;
}

/**
 * Batch upload multiple image files and auto-link them to products by matching filename with SKU
 */
export async function batchUploadImagesBySku(
  files: File[],
  onProgress?: (completed: number, total: number, sku: string) => void
): Promise<{ successCount: number; failedCount: number; matchedSkus: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const matchedSkus: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const lastDotIndex = file.name.lastIndexOf('.');
    const sku = (lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name).trim();

    try {
      if (onProgress) onProgress(i, files.length, sku);

      const publicUrl = await uploadProductImage(file, sku);

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .ilike('sku', sku);

        if (error) {
          console.warn(`Failed to link image to sku ${sku}:`, error.message);
          failedCount++;
          continue;
        }
      }

      // Sync local storage
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const products: Product[] = JSON.parse(cached);
          const updated = products.map((p) =>
            p.sku.toLowerCase() === sku.toLowerCase() ? { ...p, image_url: publicUrl } : p
          );
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      }

      successCount++;
      matchedSkus.push(sku);
    } catch (err) {
      console.error(`Error uploading image for ${sku}:`, err);
      failedCount++;
    }
  }

  if (onProgress) onProgress(files.length, files.length, 'เสร็จสิ้น');
  return { successCount, failedCount, matchedSkus };
}
