import { create } from 'zustand';

import { currentUser, ensureSession } from '@/lib/session';
import { storeMediaUrl, supabase } from '@/lib/supabase';

/**
 * Messagerie entre un client et une boutique (une conversation par couple boutique / client).
 * Le même compte voit ses conversations de client et celles de sa boutique.
 * Toutes les écritures passent par des fonctions Supabase qui vérifient les participants.
 */

export interface Conversation {
  id: string;
  /** « buyer » : j'écris à une boutique ; « seller » : un client écrit à ma boutique. */
  role: 'buyer' | 'seller';
  storeId: string;
  storeSlug: string;
  storeName: string;
  storeLogoUri?: string;
  buyerName: string;
  /** Nom à afficher : la boutique pour le client, le client pour le vendeur. */
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  lastFromMe: boolean;
  unread: number;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

function fail(error: { code?: string; message?: string }): never {
  const text = error.message ?? '';
  // Messages déjà rédigés pour l'utilisateur par les fonctions de la base.
  if (/propre boutique|Boutique introuvable|Conversation introuvable|Message vide/.test(text)) throw new Error(text);
  if (error.code === 'PGRST202') throw new Error('La messagerie n’est pas encore activée.');
  throw new Error('Envoi impossible pour le moment. Vérifiez votre connexion.');
}

export async function fetchConversations(): Promise<Conversation[]> {
  if (!supabase) return [];
  const user = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc('my_conversations');
  if (error) fail(error);
  return (data ?? []).map((r) => {
    const role = r.role === 'seller' ? 'seller' : 'buyer';
    return {
      id: r.id,
      role,
      storeId: r.store_id,
      storeSlug: r.store_slug,
      storeName: r.store_name,
      storeLogoUri: storeMediaUrl(r.store_logo_path),
      buyerName: r.buyer_name,
      title: role === 'buyer' ? r.store_name : r.buyer_name,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
      lastFromMe: !!r.last_from_me,
      unread: r.unread,
    };
  });
}

/** Ouvre (ou retrouve) ma conversation avec une boutique ; renvoie son identifiant. */
export async function openConversation(storeId: string): Promise<string> {
  if (!supabase) throw new Error('Messagerie indisponible.');
  await ensureSession();
  const { data, error } = await supabase.rpc('open_conversation', { p_store_id: storeId });
  if (error || !data) fail(error ?? {});
  return data;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const user = await currentUser();
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) fail(error);
  return (data ?? []).map((m) => ({ id: m.id, body: m.body, createdAt: m.created_at, mine: m.sender_id === user?.id }));
}

export async function sendMessage(conversationId: string, body: string) {
  if (!supabase) throw new Error('Messagerie indisponible.');
  const { error } = await supabase.rpc('send_message', { p_conversation_id: conversationId, p_body: body.trim() });
  if (error) fail(error);
}

export async function markConversationRead(conversationId: string) {
  if (!supabase) return;
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  useMessages.getState().refresh();
}

/** Nombre de messages non lus (pastille de l'onglet Messages). */
export const useMessages = create<{ unread: number; conversations: Conversation[] | null; refresh: () => Promise<void> }>((set) => ({
  unread: 0,
  conversations: null,
  refresh: async () => {
    try {
      const conversations = await fetchConversations();
      set({ conversations, unread: conversations.reduce((n, c) => n + c.unread, 0) });
    } catch {
      // hors ligne : on garde la dernière liste connue
      set((s) => ({ conversations: s.conversations ?? [] }));
    }
  },
}));
