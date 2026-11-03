import * as Linking from 'expo-linking';
import { Link2, MessageCircle, Phone, Share2 } from 'lucide-react-native';
import { Alert, StyleSheet, Text, View } from 'react-native';

import type { Storefront } from '@/api/storefront';
import { SheetAction, StoreSheet } from '@/components/storefront/StoreSheet';
import { shareAnywhere, shareOnWhatsApp, storeDisplayAddress, storeShareMessage } from '@/config/links';
import { colors, fonts, radii } from '@/theme';
import { haptics } from '@/utils/haptics';

const WHATSAPP_GREEN = '#E3F5E9';

function digits(phone: string) {
  return phone.replace(/[^\d]/g, '');
}

async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Impossible d’ouvrir', 'Cette application n’est pas disponible sur ce téléphone.');
  }
}

/** « Contacter » : WhatsApp ou appel, avec un message déjà écrit. */
export function StoreContactSheet({ sf, visible, onClose }: { sf: Storefront; visible: boolean; onClose: () => void }) {
  const phone = sf.settings.contactPhone;
  const message = `Bonjour ${sf.store.name}, je vous contacte depuis votre boutique BoutiQ.`;

  return (
    <StoreSheet
      visible={visible}
      onClose={onClose}
      title={`Contacter ${sf.store.name}`}
      subtitle={phone ? 'Le vendeur vous répond directement.' : undefined}
    >
      {phone ? (
        <>
          <SheetAction
            icon={<MessageCircle size={21} color="#1E8E4A" strokeWidth={1.9} />}
            tint={WHATSAPP_GREEN}
            label="Écrire sur WhatsApp"
            detail="Un message de bienvenue est déjà écrit"
            onPress={() => {
              haptics.light();
              onClose();
              open(`https://wa.me/${digits(phone)}?text=${encodeURIComponent(message)}`);
            }}
          />
          <SheetAction
            icon={<Phone size={20} color={sf.palette.accentInk} strokeWidth={1.9} />}
            tint={sf.palette.accentSoft}
            label="Appeler"
            detail={phone}
            onPress={() => {
              haptics.light();
              onClose();
              open(`tel:${digits(phone)}`);
            }}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Pas encore de numéro</Text>
          <Text style={styles.emptyText}>
            Ce vendeur n’a pas encore ajouté de contact. Suivez la boutique pour être prévenu de ses nouveautés.
          </Text>
        </View>
      )}
    </StoreSheet>
  );
}

/** « Partager » : adresse publique + WhatsApp + autres applications. */
export function StoreShareSheet({ sf, visible, onClose }: { sf: Storefront; visible: boolean; onClose: () => void }) {
  const slug = sf.store.slug ?? sf.store.id;
  const message = storeShareMessage(sf.store.name, slug);

  return (
    <StoreSheet visible={visible} onClose={onClose} title="Partager la boutique" subtitle="Envoyez l’adresse à vos proches et clients.">
      <View style={styles.address}>
        <Link2 size={17} color={sf.palette.accentInk} strokeWidth={1.9} />
        <Text style={styles.addressText} numberOfLines={1} selectable>
          {storeDisplayAddress(slug)}
        </Text>
      </View>
      <SheetAction
        icon={<MessageCircle size={21} color="#1E8E4A" strokeWidth={1.9} />}
        tint={WHATSAPP_GREEN}
        label="Partager sur WhatsApp"
        onPress={() => {
          haptics.light();
          onClose();
          shareOnWhatsApp(message);
        }}
      />
      <SheetAction
        icon={<Share2 size={20} color={colors.text} strokeWidth={1.8} />}
        label="Autres applications"
        detail="Facebook, Instagram, SMS…"
        onPress={() => {
          haptics.light();
          onClose();
          shareAnywhere(message);
        }}
      />
    </StoreSheet>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 18, borderRadius: radii.lg, backgroundColor: colors.background, gap: 6, marginBottom: 6 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textSecondary },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
});
