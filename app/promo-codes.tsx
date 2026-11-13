import { useFocusEffect } from 'expo-router';
import { Eye, EyeOff, Plus, Share2, TicketPercent, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cleanPromoCode,
  createPromoCode,
  deletePromoCode,
  fetchMyPromoCodes,
  PROMO_CODE_PATTERN,
  promoSummary,
  updatePromoCode,
  type PromoCode,
} from '@/api/promo';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormField } from '@/components/seller/FormField';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { shareAnywhere, storeUrl } from '@/config/links';
import { useSeller } from '@/store/useSeller';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { formatFCFA } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const PERCENTS = [5, 10, 15, 20, 30, 50];
const DURATIONS: { days?: number; label: string }[] = [{ label: 'Sans date de fin' }, { days: 7, label: '7 jours' }, { days: 30, label: '30 jours' }];

/** Couleurs de l'interrupteur (le web a ses propres réglages). */
const SWITCH_COLORS = {
  trackColor: { true: colors.caramel, false: colors.sand },
  thumbColor: colors.white,
  ...(Platform.OS === 'web' ? ({ activeThumbColor: colors.white, activeTrackColor: colors.caramel } as object) : null),
};

const number = (text: string) => Number(text.replace(/\D/g, '')) || 0;

function statusOf(p: PromoCode): { label: string; bg: string; fg: string } {
  if (!p.active) return { label: 'Désactivé', bg: colors.neutralBg, fg: colors.neutralText };
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= Date.now()) return { label: 'Expiré', bg: colors.dangerBg, fg: colors.promo };
  if (p.maxUses != null && p.usedCount >= p.maxUses) return { label: 'Épuisé', bg: colors.dangerBg, fg: colors.promo };
  return { label: 'Actif', bg: colors.successBg, fg: colors.success };
}

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** Codes promo de la boutique : le vendeur les crée, les partage, les désactive. */
export default function PromoCodesScreen() {
  const insets = useSafeAreaInsets();
  const store = useSeller((s) => s.store);
  const storeId = store?.remoteId;
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<PromoCode | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaire
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');
  const [minTotal, setMinTotal] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [days, setDays] = useState<number | undefined>();
  const [isPublic, setIsPublic] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      setCodes(await fetchMyPromoCodes(storeId));
      setError(null);
    } catch (e) {
      setCodes([]);
      setError((e as Error).message);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = () => {
    setCode('');
    setPercent('10');
    setMinTotal('');
    setMaxUses('');
    setDays(undefined);
    setIsPublic(true);
    setFormError(null);
    setCreating(true);
  };

  const submit = async () => {
    if (!storeId || busy) return;
    const pct = number(percent);
    if (!PROMO_CODE_PATTERN.test(code)) return setFormError('Le code doit faire 3 à 16 lettres ou chiffres, sans espace. Exemple : BIENVENUE10');
    if (pct < 1 || pct > 90) return setFormError('La réduction doit être comprise entre 1 % et 90 %.');
    setBusy(true);
    setFormError(null);
    try {
      await createPromoCode(storeId, { code, percent: pct, minTotal: number(minTotal), maxUses: number(maxUses) || undefined, days, isPublic });
      haptics.success();
      setCreating(false);
      await load();
    } catch (e) {
      haptics.medium();
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (p: PromoCode, change: { active?: boolean; isPublic?: boolean }) => {
    if (!storeId) return;
    haptics.selection();
    // Affichage immédiat, puis confirmation par la base.
    setCodes((list) => list?.map((c) => (c.id === p.id ? { ...c, ...change } : c)) ?? null);
    try {
      await updatePromoCode(p.id, storeId, change);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const remove = async () => {
    if (!storeId || !removing) return;
    const target = removing;
    setRemoving(null);
    try {
      await deletePromoCode(target.id, storeId);
      setCodes((list) => list?.filter((c) => c.id !== target.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const share = (p: PromoCode) =>
    shareAnywhere(`Code promo ${p.code} : ${promoSummary(p)} chez ${store?.name ?? 'ma boutique'} sur BoutiQ.\n${store ? storeUrl(store.slug) : ''}`.trim());

  if (!store || !storeId) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Codes promo" />
        <EmptyState icon={TicketPercent} title="Boutique pas encore en ligne" message="Mettez d’abord votre boutique en ligne pour créer des codes promo." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Codes promo" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 14, paddingBottom: 110 + insets.bottom }}>
        <Text style={styles.intro}>
          Créez un code, donnez-le à vos clients : ils le saisissent au moment de commander et obtiennent la réduction dans votre boutique.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {codes == null ? (
          <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />
        ) : codes.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <TicketPercent size={28} color={colors.cognac} strokeWidth={1.7} />
            </View>
            <Text style={typography.h3}>Aucun code pour le moment</Text>
            <Text style={[typography.caption, { textAlign: 'center', fontSize: 13.5 }]}>Exemple : BIENVENUE10 pour offrir 10 % à vos nouveaux clients.</Text>
          </View>
        ) : (
          codes.map((p) => {
            const status = statusOf(p);
            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.ticket}>
                    <Text style={styles.ticketText}>{p.code}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Switch
                    value={p.active}
                    onValueChange={(v) => patch(p, { active: v })}
                    {...SWITCH_COLORS}
                    accessibilityLabel={p.active ? `Désactiver le code ${p.code}` : `Activer le code ${p.code}`}
                  />
                </View>
                <Text style={styles.summary}>{promoSummary(p)}</Text>
                <Text style={typography.caption}>
                  {[
                    `Utilisé ${p.usedCount} fois${p.maxUses != null ? ` sur ${p.maxUses}` : ''}`,
                    p.expiresAt ? `jusqu’au ${dateLabel(p.expiresAt)}` : 'sans date de fin',
                  ].join(' · ')}
                </Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => patch(p, { isPublic: !p.isPublic })} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                    <View>{p.isPublic ? <Eye size={16} color={colors.text} strokeWidth={1.8} /> : <EyeOff size={16} color={colors.text} strokeWidth={1.8} />}</View>
                    <Text style={styles.actionText}>{p.isPublic ? 'Visible sur la boutique' : 'Privé'}</Text>
                  </Pressable>
                  <Pressable onPress={() => share(p)} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                    <View>
                      <Share2 size={16} color={colors.text} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.actionText}>Partager</Text>
                  </Pressable>
                  <Pressable onPress={() => setRemoving(p)} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`Supprimer le code ${p.code}`}>
                    <View>
                      <Trash2 size={16} color={colors.promo} strokeWidth={1.8} />
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <PrimaryButton label="Créer un code promo" onPress={openForm} variant="caramel" icon={<Plus size={18} color={colors.white} strokeWidth={2.2} />} />
      </View>

      <StoreSheet
        visible={creating}
        onClose={() => setCreating(false)}
        title="Nouveau code promo"
        subtitle="Vos clients saisissent ce code au moment de commander."
        footer={<PrimaryButton label={busy ? 'Création…' : 'Créer le code'} onPress={submit} disabled={busy} variant="caramel" />}
      >
        <FormField
          label="Code"
          required
          value={code}
          onChangeText={(t) => setCode(cleanPromoCode(t))}
          placeholder="BIENVENUE10"
          autoCapitalize="characters"
          autoCorrect={false}
          hint="Lettres et chiffres, sans espace."
        />
        <View style={{ gap: 8 }}>
          <FormField label="Réduction" required value={percent} onChangeText={(t) => setPercent(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" suffix={<Text style={styles.suffix}>%</Text>} />
          <View style={styles.chips}>
            {PERCENTS.map((n) => {
              const active = number(percent) === n;
              return (
                <Pressable key={n} onPress={() => setPercent(String(n))} style={[styles.chip, active && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                  <Text style={[styles.chipText, active && { color: colors.white }]}>{n} %</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <FormField
          label="Achat minimum"
          optional
          value={minTotal ? formatFCFA(number(minTotal)).replace(/\s*FCFA$/, '') : ''}
          onChangeText={(t) => setMinTotal(t.replace(/\D/g, '').slice(0, 8))}
          keyboardType="number-pad"
          placeholder="Ex. 20 000"
          suffix={<Text style={styles.suffix}>FCFA</Text>}
          hint="Le code ne marche qu’à partir de ce montant dans votre boutique."
        />
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Durée</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => {
              const active = days === d.days;
              return (
                <Pressable key={d.label} onPress={() => setDays(d.days)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                  <Text style={[styles.chipText, active && { color: colors.white }]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <FormField
          label="Nombre d’utilisations maximum"
          optional
          value={maxUses}
          onChangeText={(t) => setMaxUses(t.replace(/\D/g, '').slice(0, 5))}
          keyboardType="number-pad"
          placeholder="Ex. 50"
          hint="Laissez vide pour ne pas limiter."
        />
        <View style={styles.toggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Afficher sur ma boutique</Text>
            <Text style={typography.caption}>{isPublic ? 'Tous les visiteurs voient le code sur vos produits.' : 'Privé : vous le donnez vous-même à vos clients.'}</Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} {...SWITCH_COLORS} accessibilityLabel="Afficher le code sur ma boutique" />
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </StoreSheet>

      <StoreSheet visible={!!removing} onClose={() => setRemoving(null)} title={`Supprimer le code ${removing?.code ?? ''} ?`} subtitle="Vos clients ne pourront plus l’utiliser. Les commandes déjà passées ne changent pas.">
        <SheetAction icon={<Trash2 size={18} color={colors.promo} strokeWidth={2} />} label="Supprimer ce code" tint={colors.dangerBg} onPress={remove} />
        <SheetAction icon={<TicketPercent size={18} color={colors.cognac} strokeWidth={2} />} label="Le garder" onPress={() => setRemoving(null)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  intro: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textSoft },
  error: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.promo },
  empty: { alignItems: 'center', gap: 8, padding: 26, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  card: { padding: 14, gap: 8, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticket: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.caramel, backgroundColor: colors.tintSoft },
  ticketText: { fontFamily: fonts.bold, fontSize: 15.5, letterSpacing: 0.8, color: colors.chocolate },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  summary: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  action: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  actionText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  suffix: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  toggleTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
});
