import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CloudUpload, Eye, EyeOff, MoreHorizontal, Package, Pencil, RefreshCw, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { deleteProductEverywhere, pullSellerData, setProductStatus, syncProduct } from '@/api/sellerSync';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AddProductFab } from '@/components/seller/AddProductFab';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { ProductStatus, SellerProduct } from '@/types/seller';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type Filter = 'all' | ProductStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'published', label: 'En vente' },
  { id: 'hidden', label: 'Masqués' },
  { id: 'draft', label: 'Brouillons' },
];

const STATUS: Record<ProductStatus, { label: string; bg: string; fg: string }> = {
  published: { label: 'En vente', bg: '#E7EFDF', fg: '#3F6B3A' },
  hidden: { label: 'Masqué', bg: '#ECE7E1', fg: '#5E5650' },
  draft: { label: 'Brouillon', bg: colors.backgroundAlt, fg: colors.tabInactive },
};

/** Mes produits : statut, envoi en ligne, actions rapides (modifier, masquer, remettre en vente, supprimer). */
export default function SellerProducts() {
  const bottomSpace = useTabBarSpace();
  const products = useSeller((s) => s.products);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<SellerProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SellerProduct | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const items = useMemo(() => (filter === 'all' ? products : products.filter((p) => p.status === filter)), [products, filter]);

  const run = useCallback(async (id: string, fn: () => Promise<unknown>) => {
    setWorking(id);
    setMessage(null);
    try {
      await fn();
      haptics.success();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setWorking(null);
    }
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      await pullSellerData();
    } catch {
      setMessage('Impossible de récupérer vos produits en ligne. Vérifiez votre connexion.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mes produits" back={false} large />
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const count = f.id === 'all' ? products.length : products.filter((p) => p.status === f.id).length;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                haptics.selection();
                setFilter(f.id);
              }}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && { color: colors.white }]}>
                {f.label} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {message ? (
        <Animated.View entering={FadeIn} style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </Animated.View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace + 80, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.caramel} colors={[colors.caramel]} />}
        ListEmptyComponent={
          <EmptyState
            icon={Package}
            title={products.length === 0 ? 'Votre vitrine est vide' : 'Aucun produit ici'}
            message={products.length === 0 ? 'Ajoutez votre premier produit : une photo, un nom et un prix suffisent.' : undefined}
            actionLabel={products.length === 0 ? 'Ajouter un produit' : undefined}
            onAction={products.length === 0 ? () => router.push('/product-editor') : undefined}
          />
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status];
          const soldOut = item.status === 'published' && item.stock === 0;
          const unsent = item.sync?.state === 'error' || (item.sync?.state !== 'synced' && item.sync?.state !== 'pending');
          return (
            <Animated.View entering={FadeIn} layout={LinearTransition.springify()}>
              <Pressable
                onPress={() => router.push({ pathname: '/product-editor', params: { id: item.id } })}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
                accessibilityLabel={`${item.name || 'Produit sans nom'}, ${st.label}`}
              >
                {item.photos[0] ? (
                  <Image source={{ uri: item.photos[0].uri }} style={[styles.thumb, item.status === 'hidden' && { opacity: 0.5 }]} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Package size={22} color={colors.sand} strokeWidth={1.5} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={typography.productName} numberOfLines={1}>
                    {item.name || 'Sans nom'}
                  </Text>
                  <Text style={typography.price}>{item.price ? formatFCFA(item.price) : 'Prix à indiquer'}</Text>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                    </View>
                    {soldOut && (
                      <View style={[styles.badge, { backgroundColor: colors.text }]}>
                        <Text style={[styles.badgeText, { color: colors.white }]}>Épuisé</Text>
                      </View>
                    )}
                    {item.sync?.state === 'pending' || working === item.id ? (
                      <ActivityIndicator size="small" color={colors.caramel} />
                    ) : unsent ? (
                      <Pressable
                        onPress={() => run(item.id, () => syncProduct(item.id))}
                        style={[styles.badge, styles.badgeWarn]}
                        accessibilityRole="button"
                        accessibilityLabel="Envoyer en ligne"
                      >
                        <CloudUpload size={12} color={colors.chocolate} strokeWidth={2.2} />
                        <Text style={[styles.badgeText, { color: colors.chocolate }]}>Sur ce téléphone seulement · Envoyer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    haptics.light();
                    setMenu(item);
                  }}
                  hitSlop={8}
                  style={styles.more}
                  accessibilityRole="button"
                  accessibilityLabel={`Actions pour ${item.name}`}
                >
                  <MoreHorizontal size={20} color={colors.text} strokeWidth={1.9} />
                </Pressable>
              </Pressable>
            </Animated.View>
          );
        }}
      />
      <AddProductFab />

      <StoreSheet visible={!!menu} title={menu?.name || 'Produit'} subtitle={menu ? STATUS[menu.status].label : undefined} onClose={() => setMenu(null)}>
        {menu && (
          <>
            <SheetAction
              icon={<Pencil size={18} color={colors.cognac} strokeWidth={1.9} />}
              label="Modifier"
              onPress={() => {
                const id = menu.id;
                setMenu(null);
                router.push({ pathname: '/product-editor', params: { id } });
              }}
            />
            {menu.status === 'published' ? (
              <SheetAction
                icon={<EyeOff size={18} color={colors.cognac} strokeWidth={1.9} />}
                label="Masquer"
                detail="Retiré de la vente, vous pourrez le remettre plus tard"
                onPress={() => {
                  const id = menu.id;
                  setMenu(null);
                  run(id, () => setProductStatus(id, 'hidden'));
                }}
              />
            ) : (
              <SheetAction
                icon={<Eye size={18} color={colors.cognac} strokeWidth={1.9} />}
                label={menu.status === 'hidden' ? 'Remettre en vente' : 'Publier'}
                detail={menu.photos.length && menu.price > 0 && menu.name.trim().length >= 2 ? undefined : 'Il manque une photo, le nom ou le prix'}
                onPress={() => {
                  const p = menu;
                  setMenu(null);
                  if (!p.photos.length || p.price <= 0 || p.name.trim().length < 2) {
                    router.push({ pathname: '/product-editor', params: { id: p.id } });
                    return;
                  }
                  run(p.id, () => setProductStatus(p.id, 'published'));
                }}
              />
            )}
            {menu.sync?.state !== 'synced' && (
              <SheetAction
                icon={<RefreshCw size={18} color={colors.cognac} strokeWidth={1.9} />}
                label="Envoyer en ligne"
                onPress={() => {
                  const id = menu.id;
                  setMenu(null);
                  run(id, () => syncProduct(id));
                }}
              />
            )}
            <SheetAction
              icon={<Trash2 size={18} color={colors.white} strokeWidth={2} />}
              tint={colors.promo}
              label="Supprimer"
              onPress={() => {
                setConfirmDelete(menu);
                setMenu(null);
              }}
            />
          </>
        )}
      </StoreSheet>

      <StoreSheet
        visible={!!confirmDelete}
        title="Supprimer ce produit ?"
        subtitle="Il sera retiré de votre boutique et de BoutiQ. Cette action est définitive."
        onClose={() => setConfirmDelete(null)}
      >
        <SheetAction
          icon={<Trash2 size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Supprimer définitivement"
          onPress={() => {
            const id = confirmDelete!.id;
            setConfirmDelete(null);
            run(id, () => deleteProductEverywhere(id));
          }}
        />
        <SheetAction icon={<RefreshCw size={18} color={colors.cognac} strokeWidth={1.9} />} label="Annuler" onPress={() => setConfirmDelete(null)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.screen, marginBottom: spacing.md },
  filter: { paddingHorizontal: 14, height: 38, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  filterText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  message: { marginHorizontal: spacing.screen, marginBottom: 10, padding: 12, borderRadius: radii.md, backgroundColor: '#F6E8D6' },
  messageText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumb: { width: 76, height: 88, borderRadius: radii.md, backgroundColor: colors.champagne },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  badgeWarn: { backgroundColor: '#F6E8D6' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11.5 },
  more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt },
});
