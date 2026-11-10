import { Product, ProductInput, ProductQueryParams, ProductQueryResult } from '@/types/product';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { INITIAL_PRODUCTS, DEFAULT_BRANDS, DEFAULT_CATEGORIES } from './mockData';
import { cleanAndFormatImageUrl } from './utils';
import { compressAndResizeImage } from './imageOptimizer';

const LOCAL_STORAGE_KEY = 'hardware_catalog_products';
const BRANDS_STORAGE_KEY = 'hardware_catalog_brands';
const CATEGORIES_STORAGE_KEY = 'hardware_catalog_categories';

// ============================================================================
// Brands & Categories API
// ============================================================================

export async function fetchBrands(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('name')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        // Case-insensitive deduplication, preferring PascalCase / CamelCase (e.g. DeWalt over Dewalt)
        const map = new Map<string, string>();
        for (const item of data) {
          const raw = (item.name || '').trim();
          if (raw) {
            const key = raw.toLowerCase();
            const existing = map.get(key);
            if (!existing) {
              map.set(key, raw);
            } else if (raw !== existing && /[A-Z]/.test(raw.slice(1)) && !/[A-Z]/.test(existing.slice(1))) {
              // Prefer DeWalt over Dewalt
              map.set(key, raw);
            }
          }
        }
        const unique = Array.from(map.values()).sort((a, b) =>
          a.localeCompare(b, 'en', { sensitivity: 'base' })
        );
        if (unique.length > 0) return unique;
      }
    } catch (e) {
      console.warn('Failed to fetch from brands table, falling back:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(BRANDS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, string>();
          for (const item of parsed) {
            const raw = (item || '').trim();
            if (raw && !map.has(raw.toLowerCase())) {
              map.set(raw.toLowerCase(), raw);
            }
          }
          return Array.from(map.values()).sort((a, b) =>
            a.localeCompare(b, 'en', { sensitivity: 'base' })
          );
        }
      } catch (e) {
        console.error('Failed to parse cached brands', e);
      }
    }
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(DEFAULT_BRANDS));
  }
  return DEFAULT_BRANDS;
}

export async function saveBrands(brands: string[]): Promise<string[]> {
  const map = new Map<string, string>();
  brands.forEach((b) => {
    const trimmed = (b || '').trim();
    if (trimmed && !map.has(trimmed.toLowerCase())) {
      map.set(trimmed.toLowerCase(), trimmed);
    }
  });
  const unique = Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  if (isSupabaseConfigured()) {
    try {
      const payload = unique.map((name) => ({ name }));
      await supabase.from('brands').upsert(payload, { onConflict: 'name' });
    } catch (e) {
      console.warn('Failed to save brands to Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(unique));
  }
  return unique;
}

/**
 * Permanently delete a brand from database and local storage.
 * If reassignToBrand is provided, updates all products using this brand to the new brand.
 */
export async function deleteBrand(brandName: string, reassignToBrand?: string): Promise<void> {
  const trimmed = (brandName || '').trim();
  if (!trimmed) return;

  const targetBrand = (reassignToBrand || '').trim();

  if (isSupabaseConfigured()) {
    try {
      // 1. If reassigning to another brand, update products in Supabase
      if (targetBrand && targetBrand.toLowerCase() !== trimmed.toLowerCase()) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ brand: targetBrand, updated_at: new Date().toISOString() })
          .ilike('brand', trimmed);

        if (updateError) {
          console.warn('Failed to reassign products in Supabase:', updateError);
        }
      } else if (targetBrand && targetBrand.toLowerCase() === trimmed.toLowerCase() && targetBrand !== trimmed) {
        // Casing fix (e.g. Dewalt -> DeWalt)
        const { error: updateError } = await supabase
          .from('products')
          .update({ brand: targetBrand, updated_at: new Date().toISOString() })
          .eq('brand', trimmed);

        if (updateError) {
          console.warn('Failed to fix product brand casing in Supabase:', updateError);
        }
      }

      // 2. Delete brand row from Supabase brands table
      // If targetBrand has same letters (case fix), only delete the exact old casing
      if (targetBrand && targetBrand.toLowerCase() === trimmed.toLowerCase()) {
        const { error: deleteError } = await supabase
          .from('brands')
          .delete()
          .eq('name', trimmed);

        if (deleteError) {
          console.error('Supabase brand delete exact error:', deleteError);
        }
      } else {
        // Delete both case-insensitive and exact to ensure complete removal
        const { error: deleteError } = await supabase
          .from('brands')
          .delete()
          .ilike('name', trimmed);

        if (deleteError) {
          console.error('Supabase brand delete ilike error:', deleteError);
          await supabase.from('brands').delete().eq('name', trimmed);
        }
      }
    } catch (e) {
      console.warn('Failed to delete brand from Supabase:', e);
    }
  }

  // 3. Sync LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(BRANDS_STORAGE_KEY);
      if (cached) {
        const list: string[] = JSON.parse(cached);
        const updated = list.filter((b) => b.trim().toLowerCase() !== trimmed.toLowerCase());
        if (targetBrand && !updated.some((b) => b.trim().toLowerCase() === targetBrand.toLowerCase())) {
          updated.push(targetBrand);
        }
        localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(updated));
      }

      // Reassign local products cache if needed
      if (targetBrand) {
        const cachedProds = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cachedProds) {
          const prods: Product[] = JSON.parse(cachedProds);
          let changed = false;
          prods.forEach((p) => {
            if ((p.brand || '').trim().toLowerCase() === trimmed.toLowerCase()) {
              p.brand = targetBrand;
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prods));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update localStorage after brand deletion:', e);
    }
  }
}

/**
 * Fetch total product count per brand directly from database (grouped by lowercase brand)
 */
export async function fetchBrandProductCounts(): Promise<Record<string, number>> {
  if (isSupabaseConfigured()) {
    try {
      const counts: Record<string, number> = {};
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('brand')
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          break;
        }

        for (const item of data) {
          const raw = (item.brand || '').trim();
          if (raw) {
            const key = raw.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          }
        }

        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      }

      return counts;
    } catch (err) {
      console.warn('Failed to fetch brand product counts from Supabase:', err);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const prods: Product[] = JSON.parse(cached);
        const counts: Record<string, number> = {};
        for (const p of prods) {
          const raw = (p.brand || '').trim();
          if (raw) {
            const key = raw.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        return counts;
      }
    } catch {
      // ignore
    }
  }

  return {};
}

/**
 * Fetch all products for complete Excel catalog export
 */
export async function fetchAllProductsForExport(): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    try {
      const all: Product[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) break;
        all.push(...(data as Product[]));
        if (data.length < step) hasMore = false;
        else from += step;
      }

      if (all.length > 0) return all;
    } catch (e) {
      console.warn('Failed to fetch all products for export from Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  return INITIAL_PRODUCTS;
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
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.warn('Supabase fetch error, fallback to local:', error.message);
      } else if (data) {
        return data as Product[];
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
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached products', e);
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  }
  return INITIAL_PRODUCTS;
}

/**
 * Server-side High-Performance Query
 * Designed for 500,000+ items with server-side filtering, sorting, and pagination.
 */
export async function queryProducts(params: ProductQueryParams = {}): Promise<ProductQueryResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize === -1 ? 500 : Math.max(1, params.pageSize || 24);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('products').select('*', { count: 'exact' });

      // 1. Direct SKU exact match (deep link lookup)
      if (params.skuExact) {
        query = query.ilike('sku', params.skuExact.trim());
      }

      // 2. Filter by list of SKUs (e.g. favorites)
      if (params.skus && params.skus.length > 0) {
        query = query.in('sku', params.skus);
      }

      // 3. Brand filter
      if (params.brand && params.brand !== 'All') {
        query = query.ilike('brand', params.brand.trim());
      }

      // 4. Category filter
      if (params.category && params.category !== 'All') {
        query = query.ilike('category', params.category.trim());
      }

      // 5. Missing image filter
      if (params.onlyWithoutImage) {
        query = query.or('image_url.is.null,image_url.eq.');
      }

      // 6. Search keyword across SKU, Name, and Brand
      if (params.search && params.search.trim()) {
        const term = params.search.trim();
        query = query.or(`sku.ilike.%${term}%,name.ilike.%${term}%,brand.ilike.%${term}%`);
      }

      // 7. Dynamic Sorting
      const sortField = params.sortField || 'created_at';
      const sortOrder = params.sortOrder || 'desc';
      const ascending = sortOrder === 'asc';

      if (sortField === 'final_price' || sortField === 'base_price' || sortField === 'discount') {
        query = query.order(sortField, { ascending, nullsFirst: false });
      } else if (sortField === 'name') {
        query = query.order('name', { ascending });
      } else if (sortField === 'brand') {
        query = query.order('brand', { ascending }).order('name', { ascending: true });
      } else if (sortField === 'sku') {
        query = query.order('sku', { ascending });
      } else {
        query = query.order('created_at', { ascending });
      }

      // 8. Server-side range pagination (Limit / Offset)
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data) {
        const total = count ?? data.length;
        return {
          products: data as Product[],
          totalCount: total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      }
      console.warn('Supabase query error, falling back to local search:', error?.message);
    } catch (err) {
      console.warn('Supabase query exception, falling back to local search:', err);
    }
  }

  // Local storage / Mock data fallback
  const allProducts = await fetchProducts();
  let list = [...allProducts];

  if (params.skuExact) {
    list = list.filter((p) => p.sku.toLowerCase() === params.skuExact?.trim().toLowerCase());
  }
  if (params.skus && params.skus.length > 0) {
    const skuSet = new Set(params.skus.map((s) => s.toLowerCase()));
    list = list.filter((p) => skuSet.has(p.sku.toLowerCase()));
  }
  if (params.brand && params.brand !== 'All') {
    list = list.filter((p) => p.brand.toLowerCase() === params.brand?.toLowerCase());
  }
  if (params.category && params.category !== 'All') {
    list = list.filter((p) => p.category.toLowerCase() === params.category?.toLowerCase());
  }
  if (params.onlyWithoutImage) {
    list = list.filter((p) => !p.image_url || p.image_url.trim() === '');
  }
  if (params.search && params.search.trim()) {
    const term = params.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term)
    );
  }

  const sortField = params.sortField || 'created_at';
  const sortOrder = params.sortOrder || 'desc';
  list.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') comparison = a.name.localeCompare(b.name, 'th');
    else if (sortField === 'brand') comparison = a.brand.localeCompare(b.brand, 'en');
    else if (sortField === 'sku') comparison = a.sku.localeCompare(b.sku);
    else if (sortField === 'base_price') comparison = a.base_price - b.base_price;
    else if (sortField === 'final_price') comparison = a.final_price - b.final_price;
    else if (sortField === 'discount') comparison = a.discount - b.discount;
    else {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      comparison = timeA - timeB;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const total = list.length;
  const paged = list.slice(from, to + 1);

  return {
    products: paged,
    totalCount: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Fetch a single product directly by SKU in ~1ms (ideal for deep linking ?sku=...)
 */
export async function fetchProductBySku(sku: string): Promise<Product | null> {
  const clean = sku.trim();
  if (!clean) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('sku', clean)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as Product;
      }
    } catch (e) {
      console.warn('Failed to fetch product by SKU:', e);
    }
  }

  const all = await fetchProducts();
  return all.find((p) => p.sku.toLowerCase() === clean.toLowerCase()) || null;
}

/**
 * Fast count of products missing an image
 */
export async function fetchMissingImagesCount(): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .or('image_url.is.null,image_url.eq.');

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch (e) {
      console.warn('Failed to fetch missing images count:', e);
    }
  }

  const all = await fetchProducts();
  return all.filter((p) => !p.image_url || p.image_url.trim() === '').length;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const base_price = Number(input.base_price) || 0;
  const discount = Number(input.discount) || 0;
  const final_price = Math.max(0, base_price - discount);
  const formattedImageUrl = cleanAndFormatImageUrl(input.image_url);

  if (isSupabaseConfigured()) {
    if (input.id) {
      // Update existing
      const { data, error } = await supabase
        .from('products')
        .update({
          sku: input.sku.trim(),
          name: input.name.trim(),
          brand: input.brand.trim(),
          category: input.category || 'ทั่วไป',
          detail: input.detail || null,
          base_price,
          discount,
          image_url: formattedImageUrl,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Product;
    } else {
      // Insert new: generate a valid UUID explicitly so it never fails even if DB lacks DEFAULT gen_random_uuid()
      const newId = generateUUID();
      const insertData = {
        id: newId,
        sku: input.sku.trim(),
        name: input.name.trim(),
        brand: input.brand.trim(),
        category: input.category || 'ทั่วไป',
        detail: input.detail || null,
        base_price,
        discount,
        image_url: formattedImageUrl,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([insertData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Product;
    }
  }

  // Local storage mock fallback
  const newProduct: Product = {
    id: input.id || generateUUID(),
    sku: input.sku,
    name: input.name,
    brand: input.brand,
    category: input.category || 'ทั่วไป',
    detail: input.detail || null,
    base_price,
    discount,
    final_price,
    image_url: formattedImageUrl,
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

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw new Error(error.message);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const products: Product[] = JSON.parse(cached);
      const idSet = new Set(ids);
      const filtered = products.filter((p) => !idSet.has(p.id));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  }
}

export async function uploadProductImage(file: File, sku: string): Promise<string> {
  const cleanSku = (sku || 'item').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${cleanSku}-${Date.now()}.webp`;

  // Automatically compress, resize, and convert to WebP before uploading (~70KB)
  const optimizedFile = await compressAndResizeImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
  });

  // 1. Try uploading to Cloudflare R2 first (via /api/upload-image)
  try {
    const formData = new FormData();
    formData.append('file', optimizedFile);
    formData.append('fileName', fileName);

    const r2Res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (r2Res.ok) {
      const data = await r2Res.json();
      if (data.url) return data.url;
    } else if (r2Res.status === 401) {
      const errData = await r2Res.json().catch(() => ({}));
      throw new Error(errData.error || 'กรุณาเข้าสู่ระบบแอดมินใหม่อีกครั้งเพื่ออัปโหลดรูปภาพ');
    }
  } catch (r2Err) {
    console.warn('Cloudflare R2 upload skipped or failed, trying Supabase fallback:', r2Err);
  }

  // 2. Fallback to Supabase Storage if R2 is not configured
  if (isSupabaseConfigured()) {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, optimizedFile, {
        contentType: optimizedFile.type || 'image/webp',
        cacheControl: '31536000, immutable',
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

  // 3. Fallback for preview / dev if neither is connected
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(optimizedFile);
  });
}

export async function bulkUpsertProducts(
  products: ProductInput[],
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  if (products.length === 0) return 0;

  if (isSupabaseConfigured()) {
    const CHUNK_SIZE = 250;
    let processedCount = 0;

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const skus = chunk.map((p) => p.sku.trim());
      const skuToIdMap = new Map<string, string>();

      try {
        const { data: existingRows } = await supabase
          .from('products')
          .select('id, sku')
          .in('sku', skus);

        if (existingRows) {
          existingRows.forEach((r: { id: string; sku: string }) => {
            if (r.sku) skuToIdMap.set(r.sku.toLowerCase(), r.id);
          });
        }
      } catch (e) {
        console.warn('Could not query existing IDs during bulk upsert:', e);
      }

      const payload = chunk.map((p) => {
        const existingId = skuToIdMap.get(p.sku.trim().toLowerCase());
        return {
          id: existingId || generateUUID(),
          sku: p.sku.trim(),
          name: p.name.trim(),
          brand: p.brand.trim(),
          category: p.category || 'ทั่วไป',
          detail: p.detail || null,
          base_price: Number(p.base_price) || 0,
          discount: Number(p.discount) || 0,
          image_url: cleanAndFormatImageUrl(p.image_url),
        };
      });

      const { error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'sku' });

      if (error) {
        throw new Error(
          `Bulk upsert failed on batch ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`
        );
      }

      processedCount += chunk.length;
      if (onProgress) {
        onProgress(Math.min(processedCount, products.length), products.length);
      }
    }

    // Auto-sync unique brands to the brands table
    try {
      const brandMap = new Map<string, string>();
      products.forEach((p) => {
        const raw = (p.brand || '').trim();
        if (raw && !brandMap.has(raw.toLowerCase())) {
          brandMap.set(raw.toLowerCase(), raw);
        }
      });
      const uniqueBrands = Array.from(brandMap.values());
      if (uniqueBrands.length > 0) {
        const brandPayload = uniqueBrands.map((b) => ({ name: b }));
        await supabase.from('brands').upsert(brandPayload, { onConflict: 'name' });
      }
    } catch (e) {
      console.warn('Could not auto-sync brands to brands table:', e);
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

      map.set(p.sku, {
        id: p.id || existingProduct?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mock-${Math.random()}`),
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category || 'ทั่วไป',
        detail: p.detail || null,
        base_price: base,
        discount: disc,
        final_price: Math.max(0, base - disc),
        image_url: formattedImg || existingProduct?.image_url || null,
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
