import { syncRemoteCatalog } from '@/api/remoteCatalog';
import { ensureSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

/**
 * Modération des boutiques (réservée aux comptes listés dans private.admins).
 * Toutes les vérifications de droit se font côté serveur : ces fonctions échouent
 * pour un compte qui n'est pas modérateur.
 */

export type ReviewStatus = 'pending_review' | 'verified' | 'rejected';
type Row = Database['public']['Functions']['admin_list_stores']['Returns'][number];

export interface ReviewStore {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  country: string;
  category: string;
  status: Row['status'];
  submittedAt?: string;
  rejectionReason?: string;
  sellerName?: string;
  phone?: string;
  whatsapp?: string;
  sellerType?: 'individual' | 'business';
  businessName?: string;
  idDocumentPath?: string;
  productCount: number;
}

const ok = <T>(res: { data: T; error: unknown }): T => {
  if (res.error) {
    const { code, message } = res.error as { code?: string; message?: string };
    // PGRST202 : fonction absente (migration de modération pas encore appliquée).
    if (code === 'PGRST202') throw new Error('La modération n’est pas encore activée sur la base de données.');
    if (code === '42501') throw new Error('Ce compte n’est pas autorisé à modérer les boutiques.');
    throw new Error(message || 'Action impossible. Vérifiez votre connexion.');
  }
  return res.data;
};

/** Le compte connecté peut-il modérer ? (faux hors ligne ou si la migration n'est pas appliquée) */
export async function fetchIsAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    const res = await supabase.rpc('is_admin');
    return res.error ? false : !!res.data;
  } catch {
    return false;
  }
}

export async function fetchStoresToReview(status: ReviewStatus): Promise<ReviewStore[]> {
  if (!supabase) return [];
  await ensureSession();
  const rows = ok(await supabase.rpc('admin_list_stores', { p_status: status })) ?? [];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    city: r.city,
    country: r.country,
    category: r.category,
    status: r.status,
    submittedAt: r.submitted_at ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    sellerName: r.full_name ?? undefined,
    phone: r.phone ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    sellerType: r.seller_type ?? undefined,
    businessName: r.business_name ?? undefined,
    idDocumentPath: r.id_document_path ?? undefined,
    productCount: Number(r.product_count ?? 0),
  }));
}

/** Approuve (« verified ») ou refuse (« rejected », motif obligatoire) une boutique. */
export async function reviewStore(storeId: string, decision: 'verified' | 'rejected', reason?: string) {
  if (!supabase) throw new Error('Supabase non configuré');
  ok(await supabase.rpc('admin_review_store', { p_store_id: storeId, p_decision: decision, p_reason: reason }));
  syncRemoteCatalog();
}

/** Lien temporaire (5 minutes) vers la pièce d'identité, stockée dans un dossier privé. */
export async function idDocumentUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Supabase non configuré');
  const { data, error } = await supabase.storage.from('seller-documents').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error('Pièce d’identité introuvable.');
  return data.signedUrl;
}
