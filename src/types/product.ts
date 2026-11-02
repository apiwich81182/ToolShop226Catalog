export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  detail: string | null;
  base_price: number;
  discount: number;
  final_price: number;
  promo_text: string | null;
  image_url: string | null;
  is_in_stock: boolean;
  stock_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export type ProductInput = Omit<Product, 'id' | 'final_price' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type SortField =
  | 'created_at'
  | 'brand'
  | 'category'
  | 'sku'
  | 'stock_quantity'
  | 'base_price'
  | 'final_price'
  | 'discount'
  | 'discount_percent';

export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  value: string;
  label: string;
  field: SortField;
  order: SortOrder;
}
