export type UserRole = "customer" | "admin" | "manager" | "chef" | "employee";
export type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "SERVING"
  | "SERVED"
  | "PAYMENT_RECEIVED"
  | "CANCELLED";
export type ThemeName = "cyberpunk" | "windows11" | "apple";

export interface BadgeInfo {
  key: string;
  displayName: string;
  minPoints: number;
  discountPercent: number;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email?: string | null;
  phone: string;
  username?: string | null;
  points: number;
  badge: BadgeInfo;
  discountPercent: number;
  mustChangePassword?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  price_tk: number;
  is_active: number;
  is_featured: number;
  is_trending: number;
  is_hot: number;
  media_image_url?: string | null;
  media_video_url?: string | null;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name_snapshot_en: string;
  product_name_snapshot_bn: string;
  unit_price_snapshot_tk: number;
  qty: number;
  line_total_tk: number;
}

export interface Order {
  id: string;
  order_code: string;
  status: OrderStatus;
  placed_at: string;
  accepted_at?: string | null;
  eta_minutes?: number | null;
  eta_at?: string | null;
  served_at?: string | null;
  total_before_discount_tk: number;
  discount_percent_applied: number;
  discount_amount_tk: number;
  total_after_discount_tk: number;
  points_earned: number;
  notes?: string | null;
  items?: OrderItem[];
}

export interface MenuResponse {
  table: { id: string; code: string; label: string };
  location: { id: string; name: string };
  theme: ThemeName;
  categories: Category[];
  products: Product[];
  customer?: UserProfile;
  previousItems?: Product[];
}
