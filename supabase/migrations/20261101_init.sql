-- ==============================================================================
-- Supabase Migration Script: Hardware Tools Catalog Web App
-- Created for: Hardware Catalog with Fuzzy Search, Stock Management & Storage
-- ==============================================================================

-- 1. Enable Required Extensions
-- 'pg_trgm' enables trigram indexing for ultra-fast fuzzy text and partial matching in PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,                          -- Hardware product code / รหัสสินค้า (unique, indexed)
    name TEXT NOT NULL,                                -- Product name / ชื่อรายการสินค้า (indexed)
    brand TEXT NOT NULL,                               -- Brand name / ยี่ห้อ (indexed)
    category TEXT NOT NULL DEFAULT 'General',          -- Product category / หมวดหมู่
    detail TEXT,                                       -- Specifications, dimensions, materials / รายละเอียดสินค้า
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,   -- ราคาตั้ง (Regular price)
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,     -- ส่วนลดพิเศษ (Discount amount)
    final_price NUMERIC(10, 2) GENERATED ALWAYS AS (base_price - discount) STORED, -- ราคาหลังลด (Computed & Stored)
    promo_text TEXT,                                   -- โปรพิเศษ เช่น แถมลูกบล็อก, ซื้อ 2 ชิ้นลดเพิ่ม
    image_url TEXT,                                    -- Public URL from storage bucket
    is_in_stock BOOLEAN NOT NULL DEFAULT true,         -- สถานะสต็อก (พร้อมส่ง / สินค้าหมด)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),     -- Timestamp created
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()      -- Timestamp auto-updated via trigger
);

-- 3. Create Indexes for High-Performance Queries & Search
-- B-Tree indexes for fast exact lookups, sorting, and filtering
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_in_stock ON public.products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- GIN Trigram index for full-text search across sku, name, brand, and detail
CREATE INDEX IF NOT EXISTS idx_products_trgm_search ON public.products 
USING gin (
    (
        sku || ' ' || 
        name || ' ' || 
        brand || ' ' || 
        category || ' ' || 
        COALESCE(detail, '')
    ) gin_trgm_ops
);

-- 4. Auto-update Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Storage Setup (Bucket: product-images)
-- Create bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 6. Row Level Security (RLS) Configuration

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;

-- RLS for products table:
-- Policy A: Anyone (Anon & Authenticated) can read/search catalog
CREATE POLICY "Allow public read access to products"
    ON public.products
    FOR SELECT
    USING (true);

-- Policy B: Authenticated users (Admin) can insert, update, delete
CREATE POLICY "Allow authenticated full access to products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy C (Optional Dev Convenience): If you test without Supabase Auth login during initial dev,
-- you can uncomment the following line to allow anon write access, or use the Supabase Service Role Key:
-- CREATE POLICY "Allow anon write for dev" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);

-- Storage RLS Policies:
DROP POLICY IF EXISTS "Allow public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete product-images" ON storage.objects;

-- Policy 1: Public read access to product-images bucket
CREATE POLICY "Allow public read product-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

-- Policy 2: Authenticated users can upload to product-images bucket
CREATE POLICY "Allow authenticated upload product-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- Policy 3: Authenticated users can update images
CREATE POLICY "Allow authenticated update product-images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'product-images');

-- Policy 4: Authenticated users can delete images
CREATE POLICY "Allow authenticated delete product-images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-images');

-- 7. Seed Sample Hardware Tools Data
INSERT INTO public.products (sku, name, brand, category, detail, base_price, discount, promo_text, is_in_stock, image_url)
VALUES
(
    'SATA-09014',
    'ชุดประแจรวม 14 ชิ้น ขนาด 8-24 มม. มาตรฐานเยอรมัน (Chrome Vanadium)',
    'SATA',
    'ประแจ & ชุดเครื่องมือ',
    'ผลิตจากเหล็กโครมวานาเดียมคุณภาพสูง แข็งแรงทนทาน ผิวเคลือบซาตินป้องกันสนิม ขนาดเบอร์ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 24 มม. บรรจุในซองผ้าพกพาสะดวก',
    1850.00,
    360.00,
    '🔥 โปรพิเศษ: แถมฟรีถุงมือกันบาด 1 คู่',
    true,
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop&q=80'
),
(
    'ASAHI-CLS100',
    'ประแจแหวนข้างปากตาย คอยาวพิเศษ Lightool น้ำหนักเบา',
    'ASAHI',
    'ประแจ & ชุดเครื่องมือ',
    'ผลิตในประเทศญี่ปุ่น (Made in Japan) นวัตกรรม Lightool ลดน้ำหนักเครื่องมือลงถึง 30% จับกระชับมือ ผ่อนแรงขันได้ดีเยี่ยม เหมาะกับงานเครื่องบินและยานยนต์',
    2400.00,
    450.00,
    '⚡ ซื้อ 2 ชุด ลดเพิ่ม 5%',
    true,
    'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=80'
),
(
    'PB-212H-10RB',
    'ชุดประแจหกเหลี่ยมหัวบอล สีรุ้ง Rainbow RainBall 9 ชิ้น',
    'PB Swiss Tools',
    'ประแจหกเหลี่ยม',
    'Made in Switzerland ผลิตจาก Spring Steel พิเศษ ชุบสีรุ้งแยกขนาดจำง่าย เข้ามุมเอียงได้ถึง 30 องศา ไร้ปัญหาหัวน็อตรูด รับประกันตลอดอายุการใช้งาน',
    3200.00,
    500.00,
    '🎁 ฟรี ซองหนังแท้ PB แท้ + ส่งด่วนฟรี',
    true,
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&auto=format&fit=crop&q=80'
),
(
    'MKT-DF333DWYE',
    'สว่านไขควงไร้สาย 12V CXT ปรับแรงบิด 20 ระดับ พร้อมแบต 2 ก้อน',
    'Makita',
    'เครื่องมือไฟฟ้า',
    'แรงดันไฟฟ้า 12V Max แรงบิดสูงสุด 30 N.m ความเร็วรอบ 0-1,700 RPM ด้ามจับยางนุ่ม กระชับมือ มีไฟ LED ส่องสว่างขณะทำงาน น้ำหนักเพียง 1.1 กก.',
    3150.00,
    350.00,
    '⚡ ซื้อคู่ชุดดอกไขควง ลดเพิ่ม ฿100',
    false,
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80'
),
(
    'BOSCH-GWS700',
    'เครื่องเจียรไฟฟ้า 4 นิ้ว 710W มอเตอร์ทองแดงแท้ ทนทานสูง',
    'Bosch',
    'เครื่องมือไฟฟ้า',
    'กำลังไฟ 710 วัตต์ ความเร็วรอบ 12,000 รอบ/นาที ตัวเครื่องเพรียวบางจับถนัดมือ มีระบบระบายความร้อนป้องกันมอเตอร์ไหม้ ออกแบบเพื่อช่างมืออาชีพ',
    1690.00,
    200.00,
    '🔥 แถมใบเจียรบาง Bosch แท้ 5 ใบ',
    true,
    'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80'
)
ON CONFLICT (sku) DO NOTHING;
