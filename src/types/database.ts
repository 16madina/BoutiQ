/**
 * Types de la base Supabase BoutiQ (projet ddfnbjdsszopriydvhaf).
 * Généré depuis le schéma — à régénérer après chaque migration
 * (`npx supabase gen types typescript --project-id ddfnbjdsszopriydvhaf`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type StoreStatus = 'draft' | 'pending_review' | 'verified' | 'rejected' | 'suspended';
type ProductStatus = 'draft' | 'published';
type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type StorefrontTemplate = 'editorial' | 'mode' | 'beaute' | 'electronique' | 'alimentation' | 'generaliste';

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      order_items: {
        Row: { id: string; order_id: string; product_id: string | null; quantity: number; unit_price: number };
        Insert: { id?: string; order_id: string; product_id?: string | null; quantity: number; unit_price: number };
        Update: { id?: string; order_id?: string; product_id?: string | null; quantity?: number; unit_price?: number };
        Relationships: [];
      };
      orders: {
        Row: { buyer_id: string; created_at: string; id: string; status: OrderStatus; store_id: string; total: number; updated_at: string };
        Insert: { buyer_id?: string; created_at?: string; id?: string; status?: OrderStatus; store_id: string; total: number; updated_at?: string };
        Update: { buyer_id?: string; created_at?: string; id?: string; status?: OrderStatus; store_id?: string; total?: number; updated_at?: string };
        Relationships: [];
      };
      product_images: {
        Row: { height: number; id: string; path: string; position: number; product_id: string; width: number };
        Insert: { height: number; id?: string; path: string; position?: number; product_id: string; width: number };
        Update: { height?: number; id?: string; path?: string; position?: number; product_id?: string; width?: number };
        Relationships: [
          { foreignKeyName: 'product_images_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] },
        ];
      };
      products: {
        Row: {
          category: string;
          collection_id: string | null;
          created_at: string;
          description: string;
          featured_position: number | null;
          id: string;
          name: string;
          old_price: number | null;
          price: number;
          status: ProductStatus;
          stock: number;
          store_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          collection_id?: string | null;
          created_at?: string;
          description?: string;
          featured_position?: number | null;
          id?: string;
          name: string;
          old_price?: number | null;
          price: number;
          status?: ProductStatus;
          stock?: number;
          store_id: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          { foreignKeyName: 'products_collection_id_fkey'; columns: ['collection_id']; isOneToOne: false; referencedRelation: 'store_collections'; referencedColumns: ['id'] },
          { foreignKeyName: 'products_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: { active_space: 'buyer' | 'seller'; created_at: string; full_name: string | null; id: string; phone: string | null; updated_at: string };
        Insert: { active_space?: 'buyer' | 'seller'; created_at?: string; full_name?: string | null; id: string; phone?: string | null; updated_at?: string };
        Update: { active_space?: 'buyer' | 'seller'; full_name?: string | null; phone?: string | null };
        Relationships: [];
      };
      seller_details: {
        Row: {
          business_name: string | null;
          full_name: string;
          id_document_path: string | null;
          phone: string;
          seller_type: 'individual' | 'business';
          store_id: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          business_name?: string | null;
          full_name: string;
          id_document_path?: string | null;
          phone: string;
          seller_type?: 'individual' | 'business';
          store_id: string;
          whatsapp?: string | null;
        };
        Update: Partial<Database['public']['Tables']['seller_details']['Insert']>;
        Relationships: [];
      };
      store_collections: {
        Row: { cover_path: string | null; id: string; name: string; position: number; store_id: string };
        Insert: { cover_path?: string | null; id?: string; name: string; position?: number; store_id: string };
        Update: { cover_path?: string | null; name?: string; position?: number };
        Relationships: [
          { foreignKeyName: 'store_collections_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] },
        ];
      };
      store_follows: {
        Row: { created_at: string; store_id: string; user_id: string };
        Insert: { created_at?: string; store_id: string; user_id?: string };
        Update: { store_id?: string; user_id?: string };
        Relationships: [];
      };
      store_views: {
        Row: { id: number; store_id: string; viewed_at: string; viewer_id: string | null };
        Insert: { store_id: string; viewed_at?: string; viewer_id?: string | null };
        Update: { store_id?: string };
        Relationships: [];
      };
      storefront_settings: {
        Row: { accent_color: string; contact_phone: string | null; hero_paths: string[]; promo_message: string | null; store_id: string; tagline: string | null; template: StorefrontTemplate; updated_at: string };
        Insert: { accent_color?: string; contact_phone?: string | null; hero_paths?: string[]; promo_message?: string | null; store_id: string; tagline?: string | null; template?: StorefrontTemplate };
        Update: { accent_color?: string; contact_phone?: string | null; hero_paths?: string[]; promo_message?: string | null; tagline?: string | null; template?: StorefrontTemplate };
        Relationships: [];
      };
      stores: {
        Row: {
          banner_path: string | null;
          category: string;
          city: string;
          country: string;
          created_at: string;
          description: string;
          id: string;
          logo_path: string | null;
          name: string;
          owner_id: string;
          rejection_reason: string | null;
          sales_enabled: boolean | null;
          slug: string;
          status: StoreStatus;
          submitted_at: string | null;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          banner_path?: string | null;
          category: string;
          city: string;
          country: string;
          description?: string;
          logo_path?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          banner_path?: string | null;
          category?: string;
          city?: string;
          country?: string;
          description?: string;
          logo_path?: string | null;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      storefront_public: {
        Row: {
          accent_color: string | null;
          banner_path: string | null;
          category: string | null;
          city: string | null;
          contact_phone: string | null;
          country: string | null;
          description: string | null;
          followers: number | null;
          hero_paths: string[] | null;
          id: string | null;
          logo_path: string | null;
          name: string | null;
          promo_message: string | null;
          sales_enabled: boolean | null;
          slug: string | null;
          tagline: string | null;
          template: StorefrontTemplate | null;
          verified: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      store_dashboard_stats: {
        Args: { p_store_id: string };
        Returns: { followers: number; orders_count: number; published_products: number; revenue: number; views_30d: number }[];
      };
      submit_store_for_review: { Args: { p_store_id: string }; Returns: StoreStatus };
    };
    Enums: {
      app_space: 'buyer' | 'seller';
      order_status: OrderStatus;
      product_status: ProductStatus;
      seller_type: 'individual' | 'business';
      store_status: StoreStatus;
      storefront_template: StorefrontTemplate;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
