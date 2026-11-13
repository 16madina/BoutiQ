/**
 * Espace client branché sur Supabase : profil, commandes, notifications.
 * Les règles de sécurité (RLS + fonction place_order) sont dans
 * supabase/migrations/20261107090000_buyer_orders.sql.
 */
import { getStore, peekProduct } from '@/api/catalog';
import { remoteStores } from '@/api/remoteCatalog';
import { toSyncError } from '@/api/sellerSync';
import { removeImages, uploadImage } from '@/lib/media';
import { currentUser, ensureSession } from '@/lib/session';
import { storeMediaUrl, supabase } from '@/lib/supabase';
import { useProfile, type Profile } from '@/store/useProfile';
import type { CartLine } from '@/store/useShop';
import type { Database } from '@/types/database';
import type { LocalImage } from '@/types/seller';
import { productImageUri } from '@/utils/images';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type MobileMoney = 'wave' | 'orange' | 'mtn' | 'moov';

export const MOBILE_MONEY: { id: MobileMoney; label: string; color: string }[] = [
  { id: 'wave', label: 'Wave', color: '#1DC3F0' },
  { id: 'orange', label: 'Orange Money', color: '#FF7900' },
  { id: 'mtn', label: 'MTN MoMo', color: '#FFCB05' },
  { id: 'moov', label: 'Moov Money', color: '#0066B3' },
];

export const ORDER_STATUS: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'En attente', bg: '#F6E8D6', fg: '#8A542C' },
  confirmed: { label: 'Confirmée', bg: '#E6EEF8', fg: '#1F5FA8' },
  shipped: { label: 'En route', bg: '#EDE7F8', fg: '#5B3FA8' },
  delivered: { label: 'Reçue', bg: '#E7EFDF', fg: '#3F6B3A' },
  cancelled: { label: 'Annulée', bg: '#ECE7E1', fg: '#5E5650' },
};

const ok = <T>(res: { data: T; error: unknown }): T => {
  if (res.error) throw res.error;
  return res.data;
};

/* ------------------------------------------------------------------ Profil */

export async function pullProfile() {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  useProfile.getState().update({ memberSince: user.created_at });
  const { data } = await supabase.from('profiles').select('full_name, phone, city, address, avatar_path').eq('id', user.id).maybeSingle();
  if (!data) return;
  const local = useProfile.getState();
  // Les champs saisis sur l'appareil gardent la priorité s'ils ne sont pas encore envoyés.
  local.update({
    fullName: local.fullName || data.full_name || '',
    phone: local.phone || data.phone || '',
    city: local.city || data.city || '',
    address: local.address || data.address || '',
    // Photo choisie sur un autre appareil : on affiche sa copie en ligne.
    avatar:
      local.avatar && (!data.avatar_path || local.avatar.remotePath === data.avatar_path || !local.avatar.remotePath)
        ? local.avatar
        : data.avatar_path
          ? { uri: storeMediaUrl(data.avatar_path) ?? '', width: 600, height: 600, remotePath: data.avatar_path }
          : undefined,
  });
}

/** Photo de profil : affichée tout de suite, puis envoyée dans le dossier personnel du compte. */
export async function saveAvatar(img: LocalImage) {
  const previous = useProfile.getState().avatar?.remotePath;
  useProfile.getState().update({ avatar: img });
  if (!supabase) return;
  try {
    const user = await ensureSession();
    const uploaded = await uploadImage(img, `users/${user.id}`, 600);
    ok(await supabase.from('profiles').update({ avatar_path: uploaded.remotePath }).eq('id', user.id));
    useProfile.getState().update({ avatar: uploaded });
    if (previous && previous !== uploaded.remotePath) removeImages([previous]).catch(() => {});
  } catch (e) {
    throw toSyncError(e);
  }
}

export async function saveProfile(patch: Partial<Profile>) {
  useProfile.getState().update(patch);
  if (!supabase) return;
  try {
    const user = await ensureSession();
    const p = useProfile.getState();
    ok(
      await supabase
        .from('profiles')
        .update({
          full_name: p.fullName.trim().slice(0, 80) || null,
          phone: p.phone.trim() || null,
          city: p.city.trim().slice(0, 60) || null,
          address: p.address.trim().slice(0, 160) || null,
        })
        .eq('id', user.id),
    );
  } catch (e) {
    throw toSyncError(e);
  }
}

/* --------------------------------------------------------------- Commandes */

export interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  variant?: string;
  size?: string;
  color?: string;
  imageUri?: string;
}

export interface Order {
  id: string;
  number: string;
  storeId: string;
  storeName: string;
  storeSlug?: string;
  status: OrderStatus;
  /** Montant à payer, réduction déjà retirée. */
  total: number;
  /** Réduction obtenue avec un code promo (0 sinon). */
  discount: number;
  promoCode?: string;
  commission: number;
  paymentMethod: PaymentMethod;
  mobileMoney?: MobileMoney;
  delivery: { name: string; phone: string; city: string; address?: string };
  note?: string;
  items: OrderItem[];
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  /** La personne connectée est le vendeur de cette commande. */
  asSeller: boolean;
}

type OrderRow = Database['public']['Tables']['orders']['Row'] & {
  order_items: Database['public']['Tables']['order_items']['Row'][];
};

function toOrder(r: OrderRow, userId: string, storeOwnerOf: Set<string>): Order {
  const store = remoteStores().find((s) => s.remoteId === r.store_id);
  return {
    id: r.id,
    number: r.id.slice(0, 8).toUpperCase(),
    storeId: r.store_id,
    storeName: store?.name ?? 'Boutique',
    storeSlug: store?.id,
    status: r.status,
    total: r.total,
    discount: r.discount ?? 0,
    promoCode: r.promo_code ?? undefined,
    commission: r.commission,
    paymentMethod: r.payment_method,
    mobileMoney: (r.mobile_money_provider as MobileMoney) ?? undefined,
    delivery: { name: r.delivery_name ?? '', phone: r.delivery_phone ?? '', city: r.delivery_city ?? '', address: r.delivery_address ?? undefined },
    note: r.note ?? undefined,
    items: r.order_items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name ?? 'Produit',
      quantity: i.quantity,
      unitPrice: i.unit_price,
      variant: i.variant ?? undefined,
      size: i.size ?? undefined,
      color: i.color ?? undefined,
      imageUri: storeMediaUrl(i.image_path),
    })),
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at ?? undefined,
    shippedAt: r.shipped_at ?? undefined,
    deliveredAt: r.delivered_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    asSeller: r.buyer_id !== userId && storeOwnerOf.has(r.store_id),
  };
}

async function ownedStoreIds(userId: string) {
  const { data } = await supabase!.from('stores').select('id').eq('owner_id', userId);
  return new Set((data ?? []).map((s) => s.id));
}

/** Commandes passées par le client connecté. */
export async function fetchMyOrders(): Promise<Order[]> {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const rows = ok(await supabase.from('orders').select('*, order_items(*)').eq('buyer_id', user.id).order('created_at', { ascending: false })) as unknown as OrderRow[];
  return rows.map((r) => toOrder(r, user.id, new Set()));
}

/** Commandes reçues par la boutique du vendeur connecté. */
export async function fetchStoreOrders(storeId: string): Promise<Order[]> {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const rows = ok(await supabase.from('orders').select('*, order_items(*)').eq('store_id', storeId).order('created_at', { ascending: false })) as unknown as OrderRow[];
  return rows.map((r) => toOrder(r, user.id, new Set([storeId])));
}

export async function fetchOrder(id: string): Promise<Order | null> {
  if (!supabase) return null;
  const user = await currentUser();
  if (!user) return null;
  const row = ok(await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()) as unknown as OrderRow | null;
  if (!row) return null;
  return toOrder(row, user.id, await ownedStoreIds(user.id));
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  if (!supabase) return;
  try {
    ok(await supabase.from('orders').update({ status }).eq('id', id));
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? '';
    if (/statut impossible/i.test(msg)) throw new Error('Cette étape n’est plus possible pour cette commande.');
    throw toSyncError(e);
  }
}

/* --------------------------------------------------------------- Panier */

export type CartGroupState = 'orderable' | 'demo' | 'unverified' | 'own';

export interface CartGroup {
  storeKey: string;
  storeName: string;
  remoteId?: string;
  state: CartGroupState;
  lines: (CartLine & { name: string; unitPrice: number; imageUri?: string })[];
  total: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Panier regroupé par boutique : une commande par boutique (chaque vendeur livre lui-même). */
export function groupCart(cart: CartLine[], ownSlug?: string): CartGroup[] {
  const groups = new Map<string, CartGroup>();
  for (const line of cart) {
    const product = peekProduct(line.productId);
    if (!product) continue;
    const store = getStore(product.storeId);
    const variant = line.variant ? product.variants?.find((v) => v.label === line.variant) : undefined;
    const unitPrice = variant?.price ?? product.price;
    let group = groups.get(product.storeId);
    if (!group) {
      const state: CartGroupState =
        product.storeId === ownSlug ? 'own' : !store?.remoteId || !UUID.test(product.id) ? 'demo' : product.salesEnabled ? 'orderable' : 'unverified';
      group = { storeKey: product.storeId, storeName: store?.name ?? 'Boutique', remoteId: store?.remoteId, state, lines: [], total: 0 };
      groups.set(product.storeId, group);
    }
    group.lines.push({ ...line, name: product.name, unitPrice, imageUri: productImageUri(product, 84, 1) });
    group.total += unitPrice * line.quantity;
  }
  return [...groups.values()];
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  city: string;
  address?: string;
}

/**
 * Passe une commande par boutique « commandable ». Les prix et le total sont
 * recalculés par Supabase (place_order) ; le stock y est réservé.
 */
export async function placeOrders(
  groups: CartGroup[],
  delivery: DeliveryInfo,
  payment: PaymentMethod,
  provider: MobileMoney | undefined,
  note: string,
  /** Code promo par boutique (clé : storeKey du groupe). La base revérifie chaque code. */
  promoCodes: Record<string, string> = {},
) {
  if (!supabase) throw new Error('Commande en ligne indisponible sur cette version.');
  await ensureSession();
  const created: string[] = [];
  for (const g of groups) {
    if (g.state !== 'orderable' || !g.remoteId) continue;
    const { data, error } = await supabase.rpc('place_order', {
      p_store_id: g.remoteId,
      p_items: g.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, size: l.size ?? null, variant: l.variant ?? null, color: l.color ?? null })),
      p_delivery: delivery as unknown as Database['public']['Functions']['place_order']['Args']['p_delivery'],
      p_payment: payment,
      p_provider: provider,
      p_note: note || undefined,
      p_promo_code: promoCodes[g.storeKey] || undefined,
    });
    if (error) {
      // Messages de la base (« Stock insuffisant pour … ») : déjà rédigés pour le client.
      if (error.code === 'P0001') throw new Error(error.message);
      throw toSyncError(error);
    }
    created.push(data);
  }
  return created;
}

/* ----------------------------------------------------------- Notifications */

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  orderId?: string;
  storeId?: string;
  productId?: string;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const rows = ok(await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100));
  return (rows ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    orderId: n.order_id ?? undefined,
    storeId: n.store_id ?? undefined,
    productId: n.product_id ?? undefined,
    read: !!n.read_at,
    createdAt: n.created_at,
  }));
}

export async function markNotificationsRead(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
}

/** « il y a 5 min », « hier »… */
export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'À l’instant';
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'Hier';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
