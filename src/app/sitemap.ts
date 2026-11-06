import { MetadataRoute } from 'next';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { DEFAULT_BRANDS } from '@/lib/mockData';

const BASE_URL = 'https://www.toolshop226catalog.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Add brand filter pages
  DEFAULT_BRANDS.forEach((brand) => {
    sitemapEntries.push({
      url: `${BASE_URL}/?brand=${encodeURIComponent(brand)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  // Fetch products from database if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('sku, updated_at')
        .limit(1000);

      if (products && products.length > 0) {
        products.forEach((p) => {
          sitemapEntries.push({
            url: `${BASE_URL}/?sku=${encodeURIComponent(p.sku)}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        });
      }
    } catch (err) {
      console.warn('Sitemap generation product fetch failed:', err);
    }
  }

  return sitemapEntries;
}
