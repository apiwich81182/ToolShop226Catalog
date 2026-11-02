-- ==============================================================================
-- Migration: Add stock_quantity and update catalog indexing
-- ==============================================================================

-- 1. Add stock_quantity column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 10;

-- 2. Create index on stock_quantity for fast filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity);

-- 3. Update existing out-of-stock products to have stock_quantity = 0
UPDATE public.products 
SET stock_quantity = 0 
WHERE is_in_stock = false;

-- 4. Create Tables for Brands and Categories (Optional persistence in Supabase)
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full brands" ON public.brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default brands & categories
INSERT INTO public.brands (name) VALUES 
('SATA'), ('ASAHI'), ('PB Swiss Tools'), ('Makita'), ('Bosch'), ('DeWalt'), ('Milwaukee')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name) VALUES 
('ประแจ & ชุดเครื่องมือ'), ('ประแจหกเหลี่ยม'), ('เครื่องมือไฟฟ้า'), ('ไขควง'), ('คีม & กรรไกร'), ('เครื่องมือวัด'), ('กล่อง & กระเป๋าเครื่องมือ')
ON CONFLICT (name) DO NOTHING;
