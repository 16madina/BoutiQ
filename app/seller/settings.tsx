import { router } from 'expo-router';
import {
  ArrowLeftRight,
  ChevronRight,
  Images,
  LayoutList,
  Link2,
  MessageCircle,
  Palette,
  Share2,
  ShieldCheck,
  Star,
  TicketPercent,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCategory } from '@/api/catalog';
import { toPublicStore } from '@/api/sellerCatalog';
import { deleteStoreEverywhere, syncStoreExtras, syncStoreInfo } from '@/api/sellerSync';
import { resolveOwnSettings } from '@/api/storefront';
import { useTabBarSpace } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField, SelectField } from '@/components/seller/FormField';
import { switchSpace } from '@/components/seller/SpaceSwitch';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { StoreInsights } from '@/components/seller/StoreInsights';
import { StoreAvatar } from '@/components/StoreAvatar';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { shareAnywhere, shareOnWhatsApp, storeDisplayAddress, storeShareMessage } from '@/config/links';
import { usePicker, usePickerResult } from '@/store/usePicker';
import { useSeller } from '@/store/useSeller';
import { TEMPLATES } from '@/storefront/templates';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { CategoryId } from '@/types';

/** Rubrique de « Personnaliser ma boutique » ouverte par chaque ligne. */
type CustomizeTab = 'modele' | 'couleur' | 'identite' | 'collections' | 'vedettes';

function Row({ icon: Icon, title, detail, onPress, last }: { icon: LucideIcon; title: string; detail?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <Icon size={18} color={colors.cognac} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

/**
 * Onglet « Boutique » : tout ce qui concerne la boutique, à un seul endroit.
 * Identité et partage, apparence (ouvre la personnalisation à la bonne rubrique),
 * informations pratiques, chiffres, vérification.
 */
export default function SellerSettings() {
  const bottomSpace = useTabBarSpace();
  const store = useSeller((s) => s.store);
  const details = useSeller((s) => s.details);
  const productCount = useSeller((s) => s.products.length);
  const updateStore = useSeller((s) => s.updateStore);
  const updateDetails = useSeller((s) => s.updateDetails);
  const openPicker = usePicker((s) => s.open);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState(details?.whatsapp ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  // Enregistré sur l'appareil tout de suite, puis envoyé en ligne.
  const pushInfo = () => {
    setNotice(null);
    syncStoreInfo().catch(() => setNotice('Modification gardée sur ce téléphone. Elle partira en ligne au retour de la connexion.'));
  };
  usePickerResult('category', (v) => {
    updateStore({ categoryId: v as CategoryId });
    pushInfo();
  });
  usePickerResult('city', (v) => {
    const [city, country] = v.split('|');
    updateStore({ city, country });
    pushInfo();
  });

  if (!store) return null;
  const message = storeShareMessage(store.name, store.slug);
  const settings = resolveOwnSettings(store, details);
  const customize = (tab: CustomizeTab) => router.push({ pathname: '/customize', params: { tab } });
  const photoCount = store.banners?.length ?? (store.banner ? 1 : 0);

  const saveWhatsapp = () => {
    const value = whatsapp.trim();
    if (value === (details?.whatsapp ?? '')) return;
    updateDetails({ whatsapp: value });
    setNotice(null);
    if (store.remoteId) syncStoreExtras(store.remoteId).catch(() => setNotice('Numéro gardé sur ce téléphone. Il partira en ligne au retour de la connexion.'));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Ma boutique" back={false} large />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: bottomSpace + 20, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
        {/* Identité et adresse publique */}
        <View style={styles.card}>
          <View style={styles.identity}>
            <StoreAvatar store={toPublicStore(store)} size={54} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.name} numberOfLines={1}>
                {store.name}
              </Text>
              <StatusBadge status={store.status} />
            </View>
          </View>
          <View style={styles.address}>
            <Link2 size={17} color={colors.cognac} strokeWidth={1.8} />
            <Text style={styles.addressText} numberOfLines={1} selectable>
              {storeDisplayAddress(store.slug)}
            </Text>
          </View>
          <View style={styles.shareRow}>
            <Pressable onPress={() => shareOnWhatsApp(message)} style={[styles.shareBtn, { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }]}>
              <MessageCircle size={17} color={colors.white} strokeWidth={1.9} />
              <Text style={[styles.shareText, { color: colors.white }]}>WhatsApp</Text>
            </Pressable>
            <Pressable onPress={() => shareAnywhere(message)} style={styles.shareBtn}>
              <Share2 size={17} color={colors.text} strokeWidth={1.8} />
              <Text style={styles.shareText}>Autres réseaux</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>L’adresse est définitive pour que vos liens partagés restent valides.</Text>
        </View>

        {/* Apparence : chaque ligne ouvre la bonne rubrique, avec l'aperçu en direct */}
        <View style={{ gap: 10 }}>
          <Text style={typography.h3}>Apparence de la boutique</Text>
          <View style={styles.list}>
            <Row icon={Type} title="Nom, description et accroche" detail={store.name} onPress={() => customize('identite')} />
            <Row
              icon={Images}
              title="Logo et photos de la bannière"
              detail={`${store.logo ? 'Logo ajouté' : 'Pas de logo'} · ${photoCount} photo${photoCount > 1 ? 's' : ''}`}
              onPress={() => customize('identite')}
            />
            <Row icon={Palette} title="Modèle et couleur" detail={`Modèle ${TEMPLATES[settings.template].shortLabel}`} onPress={() => customize('modele')} />
            <Row
              icon={LayoutList}
              title="Collections"
              detail={store.collections.length ? store.collections.map((c) => c.name).join(', ') : 'Rangez vos produits par rayon'}
              onPress={() => customize('collections')}
            />
            <Row
              icon={Star}
              title="Produits vedettes"
              detail={settings.featuredProductIds.length ? `${settings.featuredProductIds.length} produit${settings.featuredProductIds.length > 1 ? 's' : ''} mis en avant` : productCount ? 'Choisissez vos coups de cœur' : 'Ajoutez d’abord un produit'}
              onPress={() => customize('vedettes')}
              last
            />
          </View>
        </View>

        {/* Offres */}
        <View style={{ gap: 10 }}>
          <Text style={typography.h3}>Offres</Text>
          <View style={styles.list}>
            <Row icon={TicketPercent} title="Codes promo" detail="Offrez une réduction à vos clients" onPress={() => router.push('/promo-codes')} last />
          </View>
        </View>

        {/* Informations pratiques */}
        <View style={{ gap: spacing.lg }}>
          <Text style={typography.h3}>Informations pratiques</Text>
          <SelectField
            label="Catégorie principale"
            value={getCategory(store.categoryId)?.name}
            placeholder="Choisir"
            onPress={() => openPicker('category', store.categoryId)}
          />
          <SelectField label="Ville" value={`${store.city}, ${store.country}`} placeholder="Choisir" onPress={() => openPicker('city', store.city)} />
          <FormField
            label="Numéro WhatsApp des clients"
            hint="Le bouton « Contacter » de votre boutique ouvre ce numéro."
            value={whatsapp}
            onChangeText={setWhatsapp}
            onBlur={saveWhatsapp}
            keyboardType="phone-pad"
            placeholder="+225 07 00 00 00 00"
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>

        {/* Chiffres des 30 derniers jours et étapes de démarrage */}
        <View style={{ gap: 10 }}>
          <Text style={typography.h3}>Mes chiffres</Text>
          <StoreInsights />
        </View>

        {/* Vérification */}
        <Pressable onPress={() => router.push('/verification')} style={[styles.card, styles.rowCard]}>
          <ShieldCheck size={22} color={colors.cognac} strokeWidth={1.7} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={typography.h3}>Vérification</Text>
            <StatusBadge status={store.status} />
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable onPress={() => switchSpace('buyer')} style={[styles.card, styles.rowCard]}>
          <ArrowLeftRight size={20} color={colors.cognac} strokeWidth={1.8} />
          <Text style={[styles.addressText, { fontFamily: fonts.semibold }]}>Passer à l’espace acheteur</Text>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        <Text style={styles.danger} onPress={() => setConfirmDelete(true)} accessibilityRole="button">
          Supprimer ma boutique
        </Text>
        {deleteError ? <Text style={[styles.hint, { color: colors.promo, textAlign: 'center' }]}>{deleteError}</Text> : null}
      </ScrollView>

      <StoreSheet
        visible={confirmDelete}
        title="Supprimer votre boutique ?"
        subtitle="La boutique, ses produits et ses photos seront supprimés de BoutiQ. Cette action est définitive."
        onClose={() => setConfirmDelete(false)}
      >
        <SheetAction
          icon={<Trash2 size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Supprimer définitivement"
          onPress={async () => {
            setConfirmDelete(false);
            try {
              await deleteStoreEverywhere();
              router.replace('/');
            } catch (e) {
              setDeleteError((e as Error).message);
            }
          }}
        />
        <SheetAction icon={<ChevronRight size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setConfirmDelete(false)} />
      </StoreSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 48, borderRadius: radii.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  addressText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radii.pill, backgroundColor: colors.tint, borderWidth: 1, borderColor: colors.champagne },
  shareText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary },
  list: { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  notice: { padding: 12, borderRadius: radii.md, backgroundColor: colors.tint, fontFamily: fonts.medium, fontSize: 13.5, color: colors.chocolate, lineHeight: 19 },
  danger: { fontFamily: fonts.medium, fontSize: 14, color: colors.promo, textAlign: 'center', paddingVertical: 8 },
});
