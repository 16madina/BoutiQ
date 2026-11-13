import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, MapPin, Megaphone, MessageCircle, Package, Paintbrush, ShoppingBag, Truck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { Storefront, StorefrontSections } from '@/api/storefront';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PressableScale } from '@/components/PressableScale';
import { ProductCard } from '@/components/ProductCard';
import { ProductPrice } from '@/components/ProductPrice';
import { DARK_BG, FollowStoreButton } from '@/components/storefront/StoreHero';
import { CollectionShowcase, ProductRail, StoreSectionTitle } from '@/components/storefront/StoreSections';
import { colors, fonts, radii, spacing } from '@/theme';
import type { Product } from '@/types';
import type { StorefrontCollection, StorefrontSectionId } from '@/types/storefront';
import { discountPercent, formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { productImageUri } from '@/utils/images';

interface Props {
  sf: Storefront;
  sections: StorefrontSections;
  width: number;
  /** Recherche ou filtre actif : seules les collections restent visibles. */
  filtering?: boolean;
  selectedCollectionId?: string;
  onSelectCollection?: (c: StorefrontCollection | null) => void;
  onContact?: () => void;
  /** Aperçu dans « Personnaliser ma boutique » : pas de boutons d'action dans l'état vide. */
  preview?: boolean;
  /** « Voir tout » d'une section : mène au catalogue (filtré sur les promotions pour « deals »). */
  onSeeAll?: (section: 'featured' | 'new' | 'deals') => void;
  /** Position de « À propos » dans les sections (menu de la vitrine « site web »). */
  onAboutLayout?: (y: number) => void;
}

const openProduct = (p: Product) => router.push({ pathname: '/product/[id]', params: { id: p.id } });

/**
 * Sections de la vitrine, dans l'ordre défini par le modèle.
 * Utilisé par la vitrine publique ET par l'aperçu en direct du vendeur.
 */
export function StorefrontBody({ sf, sections, width, filtering, selectedCollectionId, onSelectCollection, onContact, preview, onSeeAll, onAboutLayout }: Props) {
  const { template, palette, settings } = sf;
  const empty = sections.total === 0;

  const render = (id: StorefrontSectionId): ReactNode => {
    switch (id) {
      case 'promo':
        // Vitrine « site web » : le message est déjà dans la barre d'annonce, tout en haut.
        return !filtering && settings.promoMessage && template.heroLayout !== 'site' ? <PromoBand key={id} sf={sf} /> : null;
      case 'collections':
        return sf.collections.length > 0 ? (
          <View key={id}>
            <StoreSectionTitle kicker={template.copy.collections[0]} title={template.copy.collections[1]} template={template} palette={palette} />
            <CollectionShowcase
              collections={sf.collections}
              template={template}
              palette={palette}
              selectedId={selectedCollectionId}
              onSelect={onSelectCollection ?? (() => {})}
              width={width}
            />
          </View>
        ) : null;
      case 'featured':
        return !filtering && sections.featured.length > 0 ? (
          <Animated.View key={id} entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker={template.copy.featured[0]} title={template.copy.featured[1]} template={template} palette={palette} onSeeAll={onSeeAll && (() => onSeeAll('featured'))} />
            <FeaturedProducts sf={sf} products={sections.featured} width={width} />
          </Animated.View>
        ) : null;
      case 'new':
        return !filtering && sections.newArrivals.length > 0 ? (
          <Animated.View key={id} entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker={template.copy.new[0]} title={template.copy.new[1]} template={template} palette={palette} onSeeAll={onSeeAll && (() => onSeeAll('new'))} />
            <ProductRail products={sections.newArrivals} template={template} palette={palette} badge="Nouveau" width={width} />
          </Animated.View>
        ) : null;
      case 'deals':
        return !filtering && sections.promotions.length > 0 ? (
          <Animated.View key={id} entering={FadeIn.duration(300)}>
            <StoreSectionTitle kicker={template.copy.deals[0]} title={template.copy.deals[1]} template={template} palette={palette} onSeeAll={onSeeAll && (() => onSeeAll('deals'))} />
            <ProductRail products={sections.promotions} template={template} palette={palette} width={width} />
          </Animated.View>
        ) : null;
      case 'about':
        return !filtering ? (
          <View key={id} onLayout={onAboutLayout && ((e) => onAboutLayout(e.nativeEvent.layout.y))}>
            <AboutStore sf={sf} onContact={onContact} />
          </View>
        ) : null;
    }
  };

  return (
    <View style={styles.sections}>
      {template.sections.map(render)}
      {empty && !filtering && <EmptyStore sf={sf} preview={preview} />}
    </View>
  );
}

/* ------------------------------------------------------- Message promo */

function PromoBand({ sf }: { sf: Storefront }) {
  const { palette, template, settings } = sf;
  const dark = template.dark;
  return (
    <View
      style={[
        styles.promo,
        { borderRadius: template.radius, backgroundColor: dark ? DARK_BG : palette.accentSoft, borderColor: dark ? '#2A2F37' : 'transparent' },
      ]}
      accessibilityRole="text"
    >
      <View style={[styles.promoIcon, { backgroundColor: palette.accent }]}>
        <Megaphone size={17} color={palette.onAccent} strokeWidth={1.9} />
      </View>
      <Text
        style={[
          styles.promoText,
          { color: dark ? '#FFF9F1' : palette.accentInk, fontFamily: template.titleFont === 'serif' ? fonts.serif : fonts.bold },
        ]}
      >
        {settings.promoMessage}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------ Produits vedettes */

function FeaturedProducts({ sf, products, width }: { sf: Storefront; products: Product[]; width: number }) {
  const { template, palette } = sf;
  switch (template.featuredStyle) {
    case 'editorial':
      return <ProductRail products={products} template={template} palette={palette} size="lg" />;
    case 'rail':
      return <ProductRail products={products} template={template} palette={palette} width={width} />;
    case 'grid':
      // Grille paire (2 ou 4) pour éviter une carte orpheline ; un seul produit passe en grand format.
      return products.length < 2 ? (
        <ProductRail products={products} template={template} palette={palette} size="lg" />
      ) : (
        <FeaturedGrid sf={sf} products={products.slice(0, products.length >= 4 ? 4 : 2)} width={width} />
      );
    case 'spotlight': {
      const [hero, ...rest] = products;
      return (
        <View style={{ gap: 14 }}>
          <Spotlight sf={sf} product={hero} width={width} />
          {rest.length > 0 && <ProductRail products={rest} template={template} palette={palette} width={width} />}
        </View>
      );
    }
  }
}

function FeaturedGrid({ sf, products, width }: { sf: Storefront; products: Product[]; width: number }) {
  const { template, palette } = sf;
  const gap = 10;
  const cell = Math.floor((width - spacing.screen * 2 - gap) / 2);
  return (
    <View style={[styles.grid, { gap }]}>
      {products.map((p) => {
        return (
          <View key={p.id} style={{ width: cell }}>
            <PressableScale onPress={() => openProduct(p)} activeScale={0.97} accessibilityRole="button" accessibilityLabel={p.name} style={[styles.gridCard, { borderRadius: template.radius, backgroundColor: palette.accentSoft }]}>
              <View style={[styles.gridPhoto, { height: cell, borderRadius: template.radius - 6 }]}>
                <Image source={{ uri: productImageUri(p, cell, 1) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} recyclingKey={p.id} />
              </View>
              <View style={{ gap: 3, paddingHorizontal: 4, paddingBottom: 4 }}>
                <Text style={styles.gridName} numberOfLines={2}>
                  {p.name}
                </Text>
                <ProductPrice price={p.price} oldPrice={p.oldPrice} />
              </View>
            </PressableScale>
            <View style={styles.gridHeart}>
              <FavoriteButton productId={p.id} size={30} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Spotlight({ sf, product: p, width }: { sf: Storefront; product: Product; width: number }) {
  const { template, palette } = sf;
  const cardWidth = width - spacing.screen * 2;
  const photo = Math.round(cardWidth * 0.46);
  const pct = discountPercent(p.price, p.oldPrice);
  return (
    <PressableScale
      onPress={() => openProduct(p)}
      activeScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={p.name}
      style={[styles.spot, { borderRadius: template.radius + 6 }]}
    >
      <View style={[styles.spotPhoto, { width: photo, height: photo * 1.12, borderRadius: template.radius }]}>
        <Image source={{ uri: productImageUri(p, photo, 1.12) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      </View>
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <Text style={[styles.spotKicker, { color: '#9CC3F0' }]}>Produit phare</Text>
        <Text style={styles.spotName} numberOfLines={3}>
          {p.name}
        </Text>
        <Text style={styles.spotDesc} numberOfLines={2}>
          {p.description}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
          <Text style={styles.spotPrice}>{formatFCFA(p.price)}</Text>
          {pct ? <Text numberOfLines={1} style={[styles.spotPct, { backgroundColor: palette.accent, color: palette.onAccent }]}>{`-${pct}\u00A0%`}</Text> : null}
        </View>
        <View style={[styles.spotCta, { backgroundColor: palette.accent }]}>
          <Text style={[styles.spotCtaText, { color: palette.onAccent }]}>Voir le produit</Text>
        </View>
      </View>
    </PressableScale>
  );
}

/* ------------------------------------------------------------ À propos */

function AboutStore({ sf, onContact }: { sf: Storefront; onContact?: () => void }) {
  const { store, template, palette, settings } = sf;
  const rows: { icon: ReactNode; text: string }[] = [
    { icon: <MapPin size={17} color={palette.accentInk} strokeWidth={1.8} />, text: [store.city, store.country].filter(Boolean).join(', ') },
    { icon: <Truck size={17} color={palette.accentInk} strokeWidth={1.8} />, text: store.delivery },
  ];
  if (store.verified) rows.push({ icon: <BadgeCheck size={17} color={palette.accentInk} strokeWidth={1.8} />, text: 'Boutique vérifiée par BoutiQ' });
  return (
    <View style={styles.aboutWrap}>
      <StoreSectionTitle kicker="La boutique" title="À propos" template={template} palette={palette} />
      <View style={[styles.about, { borderRadius: template.radius }]}>
        {store.description ? <Text style={styles.aboutText}>{store.description}</Text> : null}
        <View style={{ gap: 10 }}>
          {rows
            .filter((r) => r.text)
            .map((r) => (
              <View key={r.text} style={styles.aboutRow}>
                {r.icon}
                <Text style={styles.aboutRowText}>{r.text}</Text>
              </View>
            ))}
        </View>
        {onContact && (
          <PressableScale onPress={onContact} activeScale={0.97} accessibilityRole="button" style={[styles.aboutContact, { borderColor: palette.accent }]}>
            <MessageCircle size={17} color={palette.accentInk} strokeWidth={1.9} />
            <Text style={[styles.aboutContactText, { color: palette.accentInk }]}>{settings.contactPhone ? 'Écrire au vendeur' : 'Contacter la boutique'}</Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- État vide */

function EmptyStore({ sf, preview }: { sf: Storefront; preview?: boolean }) {
  const { palette, template, store, isOwn } = sf;
  return (
    <View style={[styles.empty, { borderRadius: template.radius + 6 }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}>
        <ShoppingBag size={28} color={palette.accentInk} strokeWidth={1.6} />
      </View>
      <Text style={[styles.emptyTitle, { fontFamily: template.titleFont === 'serif' ? fonts.serif : fonts.bold }]}>
        {isOwn ? 'Votre vitrine est prête' : 'Bientôt en rayon'}
      </Text>
      <Text style={styles.emptyText}>
        {isOwn
          ? 'Ajoutez votre premier produit : il apparaîtra ici, dans le style de votre modèle.'
          : `${store.name} prépare ses premiers articles. Suivez la boutique pour être prévenu de leur mise en ligne.`}
      </Text>
      {preview ? null : isOwn ? (
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <PressableScale
            onPress={() => {
              haptics.medium();
              router.push('/product-editor');
            }}
            style={[styles.emptyBtn, { backgroundColor: palette.accent }]}
            accessibilityRole="button"
          >
            <Package size={18} color={palette.onAccent} strokeWidth={1.9} />
            <Text style={[styles.emptyBtnText, { color: palette.onAccent }]}>Ajouter un produit</Text>
          </PressableScale>
          <PressableScale onPress={() => router.push('/customize')} style={[styles.emptyBtn, styles.emptyBtnGhost]} accessibilityRole="button">
            <Paintbrush size={17} color={colors.text} strokeWidth={1.8} />
            <Text style={styles.emptyBtnText}>Personnaliser ma boutique</Text>
          </PressableScale>
        </View>
      ) : (
        <FollowStoreButton storeId={store.id} accent={palette.accent} onAccent={palette.onAccent} style={{ alignSelf: 'stretch', flex: 0 }} />
      )}
    </View>
  );
}

/* ------------------------------------------- Aperçu du catalogue (exemples) */

/** Début du catalogue en grille asymétrique, pour les aperçus (sans défilement infini). */
export function CatalogPreview({ sf, width, max = 6 }: { sf: Storefront; width: number; max?: number }) {
  if (sf.products.length === 0) return null;
  const gap = spacing.gridGap;
  const col = Math.floor((width - spacing.screen * 2 - gap) / 2);
  const items = sf.products.slice(0, max);
  const columns = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
  return (
    <View>
      <StoreSectionTitle kicker={sf.template.copy.catalog[0]} title={sf.template.copy.catalog[1]} template={sf.template} palette={sf.palette} />
      <View style={{ flexDirection: 'row', gap, paddingHorizontal: spacing.screen }}>
        {columns.map((list, c) => (
          <View key={c} style={{ width: col, gap }}>
            {list.map((p) => (
              <ProductCard key={p.id} product={p} width={col} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { paddingTop: 26, paddingBottom: 14, gap: 34 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.screen, padding: 14, borderWidth: 1 },
  promoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  promoText: { flex: 1, fontSize: 15.5, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.screen },
  gridCard: { padding: 6, gap: 8 },
  gridPhoto: { overflow: 'hidden', backgroundColor: colors.backgroundAlt },
  gridHeart: { position: 'absolute', top: 12, right: 12 },
  gridName: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.text },
  spot: { marginHorizontal: spacing.screen, flexDirection: 'row', gap: 14, padding: 12, backgroundColor: DARK_BG, alignItems: 'center' },
  spotPhoto: { overflow: 'hidden', backgroundColor: '#1F232A' },
  spotKicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  spotName: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 21, color: '#FFF9F1' },
  spotDesc: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: '#A9B0BA' },
  spotPrice: { fontFamily: fonts.extrabold, fontSize: 18, color: '#FFF9F1' },
  spotPct: { flexShrink: 0, fontFamily: fonts.bold, fontSize: 11.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  spotCta: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, borderRadius: radii.pill, justifyContent: 'center' },
  spotCtaText: { fontFamily: fonts.semibold, fontSize: 13 },
  aboutWrap: {},
  about: { marginHorizontal: spacing.screen, padding: 16, gap: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  aboutText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textBody },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aboutRowText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  aboutContact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: radii.pill, borderWidth: 1.2 },
  aboutContactText: { fontFamily: fonts.semibold, fontSize: 14 },
  empty: {
    marginHorizontal: spacing.screen,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 22, color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textSecondary, textAlign: 'center', marginBottom: 6 },
  emptyBtn: { height: 48, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyBtnGhost: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
