/**
 * Types de la base Supabase BoutiQ (projet ddfnbjdsszopriydvhaf).
 * Générés depuis le schéma — à régénérer après chaque migration
 * (`npx supabase gen types typescript --project-id ddfnbjdsszopriydvhaf`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Enums = Database['public']['Enums'];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      favorites: {
        Row: { created_at: string; product_key: string; user_id: string };
        Insert: { created_at?: string; product_key: string; user_id?: string };
        Update: { created_at?: string; product_key?: string; user_id?: string };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          order_id: string | null;
          product_id: string | null;
          read_at: string | null;
          store_id: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind: string;
          order_id?: string | null;
          product_id?: string | null;
          read_at?: string | null;
          store_id?: string | null;
          title: string;
          user_id: string;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          image_path: string | null;
          order_id: string;
          product_id: string | null;
          product_name: string | null;
          quantity: number;
          size: string | null;
          unit_price: number;
          variant: string | null;
        };
        Insert: {
          id?: string;
          image_path?: string | null;
          order_id: string;
          product_id?: string | null;
          product_name?: string | null;
          quantity: number;
          size?: string | null;
          unit_price: number;
          variant?: string | null;
        };
        Update: { quantity?: number };
        Relationships: [
          { foreignKeyName: 'order_items_order_id_fkey'; columns: ['order_id']; isOneToOne: false; referencedRelation: 'orders'; referencedColumns: ['id'] },
        ];
      };
      orders: {
        Row: {
          buyer_id: string;
          cancelled_at: string | null;
          commission: number;
          confirmed_at: string | null;
          created_at: string;
          delivered_at: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          delivery_name: string | null;
          delivery_phone: string | null;
          id: string;
          mobile_money_provider: string | null;
          note: string | null;
          payment_method: Enums['payment_method'];
          shipped_at: string | null;
          status: Enums['order_status'];
          store_id: string;
          total: number;
          updated_at: string;
        };
        Insert: { store_id: string; total: number; buyer_id?: string; status?: Enums['order_status'] };
        Update: { status?: Enums['order_status'] };
        Relationships: [
          { foreignKeyName: 'orders_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] },
        ];
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
          colors: string[];
          created_at: string;
          delivery_note: string | null;
          description: string;
          featured_position: number | null;
          id: string;
          name: string;
          old_price: number | null;
          price: number;
          sizes: string[];
          status: Enums['product_status'];
          stock: number;
          store_id: string;
          updated_at: string;
          variants: Json;
        };
        Insert: {
          category: string;
          collection_id?: string | null;
          colors?: string[];
          created_at?: string;
          delivery_note?: string | null;
          description?: string;
          featured_position?: number | null;
          id?: string;
          name: string;
          old_price?: number | null;
          price: number;
          sizes?: string[];
          status?: Enums['product_status'];
          stock?: number;
          store_id: string;
          updated_at?: string;
          variants?: Json;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          { foreignKeyName: 'products_collection_id_fkey'; columns: ['collection_id']; isOneToOne: false; referencedRelation: 'store_collections'; referencedColumns: ['id'] },
          { foreignKeyName: 'products_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: {
          active_space: Enums['app_space'];
          address: string | null;
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: { id: string; active_space?: Enums['app_space']; address?: string | null; city?: string | null; full_name?: string | null; phone?: string | null };
        Update: { active_space?: Enums['app_space']; address?: string | null; city?: string | null; full_name?: string | null; phone?: string | null };
        Relationships: [];
      };
      seller_details: {
        Row: {
          business_name: string | null;
          full_name: string;
          id_document_path: string | null;
          phone: string;
          seller_type: Enums['seller_type'];
          store_id: string;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          business_name?: string | null;
          full_name: string;
          id_document_path?: string | null;
          phone: string;
          seller_type?: Enums['seller_type'];
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
        Row: {
          accent_color: string;
          contact_phone: string | null;
          hero_paths: string[];
          promo_message: string | null;
          store_id: string;
          tagline: string | null;
          template: Enums['storefront_template'];
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          contact_phone?: string | null;
          hero_paths?: string[];
          promo_message?: string | null;
          store_id: string;
          tagline?: string | null;
          template?: Enums['storefront_template'];
        };
        Update: {
          accent_color?: string;
          contact_phone?: string | null;
          hero_paths?: string[];
          promo_message?: string | null;
          tagline?: string | null;
          template?: Enums['storefront_template'];
        };
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
          status: Enums['store_status'];
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
          template: Enums['storefront_template'] | null;
          verified: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_slug_available: { Args: { p_slug: string }; Returns: boolean };
      place_order: {
        Args: {
          p_delivery: Json;
          p_items: Json;
          p_note?: string;
          p_payment?: Enums['payment_method'];
          p_provider?: string;
          p_store_id: string;
        };
        Returns: string;
      };
      store_dashboard_stats: {
        Args: { p_store_id: string };
        Returns: { followers: number; orders_count: number; published_products: number; revenue: number; views_30d: number }[];
      };
      submit_store_for_review: { Args: { p_store_id: string }; Returns: Enums['store_status'] };
    };
    Enums: {
      app_space: 'buyer' | 'seller';
      order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
      payment_method: 'cash_on_delivery' | 'mobile_money';
      product_status: 'draft' | 'published' | 'hidden';
      seller_type: 'individual' | 'business';
      store_status: 'draft' | 'pending_review' | 'verified' | 'rejected' | 'suspended';
      storefront_template: 'editorial' | 'mode' | 'beaute' | 'electronique' | 'alimentation' | 'generaliste';
    };
    CompositeTypes: { [_ in never]: never };
  };
};
