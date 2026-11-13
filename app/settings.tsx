import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  ChevronRight,
  FileText,
  Flag,
  Info,
  LifeBuoy,
  LogOut,
  MapPin,
  Moon,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount, hasOnlineAccount, signOutAccount } from '@/api/authAccount';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { SUPPORT_EMAIL } from '@/config/legal';
import {
  authenticate,
  biometricSupport,
  notificationPermission,
  openSystemSettings,
  requestNotificationPermission,
  systemSettingsAvailable,
  type BiometricSupport,
  type NotificationPermission,
} from '@/lib/device';
import { useAuth } from '@/store/useAuth';
import { useSeller } from '@/store/useSeller';
import { useSettings } from '@/store/useSettings';
import { colors, fonts, radii, spacing, themePreference } from '@/theme';
import { resolveScheme, restartApp, writeThemePreference, type ThemePreference } from '@/theme/preference';
import { haptics } from '@/utils/haptics';

const SWITCH_COLORS = {
  trackColor: { true: colors.caramel, false: colors.sand },
  thumbColor: colors.white,
  ...(Platform.OS === 'web' ? ({ activeThumbColor: colors.white, activeTrackColor: colors.caramel } as object) : null),
};

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'system', label: 'Automatique' },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

interface RowProps {
  icon: LucideIcon;
  title: string;
  detail?: string;
  onPress?: () => void;
  /** Interrupteur à droite (à la place de la flèche). */
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  danger?: boolean;
  last?: boolean;
}

function Row({ icon: Icon, title, detail, onPress, toggle, danger, last }: RowProps) {
  const body = (
    <>
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerBg }]}>
        <Icon size={18} color={danger ? colors.promo : colors.cognac} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.promo }]}>{title}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {toggle ? (
        <Switch value={toggle.value} onValueChange={toggle.onChange} disabled={toggle.disabled} accessibilityLabel={title} {...SWITCH_COLORS} />
      ) : onPress ? (
        <ChevronRight size={18} color={colors.textSecondary} />
      ) : null}
    </>
  );
  const style = [styles.row, !last && styles.rowBorder];
  if (toggle || !onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

/** Paramètres : compte, notifications, sécurité, autorisations, aide, textes légaux, suppression du compte. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuth((s) => s.session);
  const hasStore = useSeller((s) => !!s.store);
  const settings = useSettings();
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [biometric, setBiometric] = useState<BiometricSupport | null>(null);
  const [online, setOnline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(themePreference);

  // Les couleurs sont fixées au démarrage : un nouveau thème relance l'application.
  const chooseTheme = (next: ThemePreference) => {
    if (next === theme) return;
    haptics.selection();
    setTheme(next);
    writeThemePreference(next);
    if (resolveScheme(next) !== resolveScheme(themePreference)) setTimeout(() => restartApp().catch(() => {}), 250);
  };

  // Relu à chaque retour sur l'écran : l'autorisation a pu changer dans les réglages du téléphone.
  useFocusEffect(
    useCallback(() => {
      notificationPermission().then(setPermission);
      biometricSupport().then(setBiometric);
      hasOnlineAccount().then(setOnline);
    }, []),
  );

  const notificationsOn = settings.notifications && permission === 'granted';
  const toggleNotifications = async (value: boolean) => {
    haptics.selection();
    setNotice(null);
    if (!value) return settings.set({ notifications: false });
    let status = permission;
    if (status !== 'granted') status = await requestNotificationPermission();
    setPermission(status);
    if (status === 'granted') settings.set({ notifications: true });
    else setNotice('Les notifications sont refusées pour BoutiQ. Autorisez-les dans les réglages de votre téléphone.');
  };

  const toggleBiometric = async (value: boolean) => {
    haptics.selection();
    setNotice(null);
    // On vérifie l'identité avant d'activer comme avant de désactiver.
    const ok = await authenticate(value ? 'Activer le déverrouillage de BoutiQ' : 'Désactiver le déverrouillage de BoutiQ');
    if (ok) settings.set({ biometricLock: value });
  };

  const mail = (subject: string) => SUPPORT_EMAIL && Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});

  const removeAccount = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      router.replace('/');
    } catch (e) {
      setConfirmDelete(false);
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const version = Constants.expoConfig?.version ?? '';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Paramètres" />
      <ScrollView contentContainerStyle={{ padding: spacing.screen, gap: 22, paddingBottom: 40 + insets.bottom }}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Group title="Mon compte">
          <Row icon={UserRound} title="Mon profil" detail="Nom, téléphone, photo" onPress={() => router.push('/profile')} />
          <Row icon={MapPin} title="Adresse de livraison" detail="Ville et adresse utilisées pour vos commandes" onPress={() => router.push('/profile')} />
          {session ? (
            <Row icon={ShieldCheck} title="Connexion" detail={session.email ?? session.phone ?? 'Compte connecté'} last />
          ) : (
            <Row icon={ShieldCheck} title="Se connecter ou créer un compte" detail="Pour retrouver votre compte sur un autre téléphone" onPress={() => router.push('/auth')} last />
          )}
        </Group>

        <Group title="Notifications">
          <Row
            icon={Bell}
            title="Recevoir les notifications"
            detail={
              permission === 'unavailable'
                ? 'Disponible dans l’application sur téléphone.'
                : permission === 'denied'
                  ? 'Refusées dans les réglages du téléphone.'
                  : 'Commandes, messages et nouveautés des boutiques suivies.'
            }
            toggle={{ value: notificationsOn, onChange: toggleNotifications, disabled: permission === 'unavailable' }}
            last={permission !== 'denied'}
          />
          {permission === 'denied' && <Row icon={SlidersHorizontal} title="Ouvrir les réglages du téléphone" onPress={openSystemSettings} last />}
        </Group>

        <Group title="Apparence">
          <View style={styles.themeBlock}>
            <View style={styles.themeHead}>
              <View style={styles.rowIcon}>
                <Moon size={18} color={colors.cognac} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>Thème</Text>
                <Text style={styles.rowDetail}>
                  {theme === 'system' ? 'Suit le réglage clair ou sombre de votre téléphone.' : 'L’application se relance pour changer de thème.'}
                </Text>
              </View>
            </View>
            <View style={styles.segments} accessibilityRole="radiogroup">
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => chooseTheme(t.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Thème ${t.label}`}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active && { color: colors.white }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        <Group title="Sécurité">
          <Row
            icon={ScanFace}
            title={`Déverrouiller avec ${biometric?.label ?? 'Face ID ou empreinte'}`}
            detail={biometric?.available ? 'Demandé à chaque ouverture de l’application.' : (biometric?.reason ?? 'Vérification…')}
            toggle={{ value: settings.biometricLock && !!biometric?.available, onChange: toggleBiometric, disabled: !biometric?.available }}
            last
          />
        </Group>

        {systemSettingsAvailable && (
          <Group title="Autorisations">
            <Row icon={SlidersHorizontal} title="Photos, appareil photo, notifications" detail="Gérer ce que BoutiQ peut utiliser sur ce téléphone" onPress={openSystemSettings} last />
          </Group>
        )}

        {SUPPORT_EMAIL ? (
          <Group title="Aide">
            <Row icon={LifeBuoy} title="Nous contacter" detail={SUPPORT_EMAIL} onPress={() => mail('Aide BoutiQ')} />
            <Row icon={Flag} title="Signaler un problème" detail="Une boutique, un produit ou un message" onPress={() => mail('Signalement BoutiQ')} last />
          </Group>
        ) : null}

        <Group title="Informations légales">
          <Row icon={ShieldCheck} title="Politique de confidentialité" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'confidentialite' } })} />
          <Row icon={FileText} title="Conditions d’utilisation" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'conditions' } })} last />
        </Group>

        <Group title="À propos">
          <Row icon={Info} title="BoutiQ" detail={version ? `Version ${version}` : undefined} last />
        </Group>

        {(session || online || hasStore) && (
          <Group title="Compte">
            {session ? <Row icon={LogOut} title="Se déconnecter" onPress={() => setConfirmOut(true)} /> : null}
            <Row icon={Trash2} title="Supprimer mon compte" detail="Efface définitivement votre compte et vos données" onPress={() => setConfirmDelete(true)} danger last />
          </Group>
        )}
      </ScrollView>

      <StoreSheet
        visible={confirmOut}
        title="Se déconnecter ?"
        subtitle="Votre boutique, vos commandes et vos favoris restent enregistrés. Vous les retrouverez en vous reconnectant."
        onClose={() => setConfirmOut(false)}
      >
        <SheetAction
          icon={<LogOut size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label="Se déconnecter"
          onPress={() => {
            setConfirmOut(false);
            setNotice(null);
            signOutAccount()
              .then(() => router.replace('/'))
              .catch((e) => setNotice((e as Error).message));
          }}
        />
        <SheetAction icon={<ChevronRight size={18} color={colors.cognac} strokeWidth={2} />} label="Annuler" onPress={() => setConfirmOut(false)} />
      </StoreSheet>

      <StoreSheet
        visible={confirmDelete}
        title="Supprimer mon compte ?"
        subtitle={`Cette action est définitive. Seront effacés : votre profil, vos favoris, vos messages${hasStore ? ', votre boutique et ses produits' : ''}. Les ventes déjà terminées restent chez le vendeur, sans votre nom ni votre adresse.`}
        onClose={() => setConfirmDelete(false)}
      >
        <SheetAction
          icon={<Trash2 size={18} color={colors.white} strokeWidth={2} />}
          tint={colors.promo}
          label={busy ? 'Suppression…' : 'Supprimer définitivement'}
          detail="Impossible à annuler"
          onPress={removeAccount}
        />
        <SheetAction icon={<ChevronRight size={18} color={colors.cognac} strokeWidth={2} />} label="Garder mon compte" onPress={() => setConfirmDelete(false)} />
      </StoreSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  groupTitle: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textSecondary, paddingHorizontal: 4 },
  list: { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 60 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  themeBlock: { paddingVertical: 13, gap: 12 },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, height: 42, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  notice: { padding: 12, borderRadius: radii.md, backgroundColor: colors.dangerBg, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.promo },
});
