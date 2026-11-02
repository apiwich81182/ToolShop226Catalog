-- ==============================================================================
-- Migration: Remove promo_text, is_in_stock, and stock_quantity columns
-- Description: Drop unused stock status and promo text columns and their indexes
-- ==============================================================================

-- 1. Drop existing indexes associated with stock columns
DROP INDEX IF EXISTS public.idx_products_is_in_stock;
DROP INDEX IF EXISTS public.idx_products_stock_quantity;

-- 2. Drop the unused columns from products table
ALTER TABLE public.products
DROP COLUMN IF EXISTS promo_text,
DROP COLUMN IF EXISTS is_in_stock,
DROP COLUMN IF EXISTS stock_quantity;
