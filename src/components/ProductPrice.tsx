import { StyleSheet, Text, View } from 'react-native';

import { DiscountBadge } from '@/components/DiscountBadge';
import { colors, typography } from '@/theme';
import { discountPercent, formatFCFA } from '@/utils/format';

interface Props {
  price: number;
  oldPrice?: number;
  size?: 'sm' | 'lg';
}

/** Prix en FCFA + ancien prix barré + pourcentage de réduction. */
export function ProductPrice({ price, oldPrice, size = 'sm' }: Props) {
  const percent = discountPercent(price, oldPrice);
  const lg = size === 'lg';
  return (
    <View style={styles.row}>
      <Text style={[typography.price, lg && styles.priceLg]} numberOfLines={1}>
        {formatFCFA(price)}
      </Text>
      {percent != null && oldPrice != null && (
        <>
          <Text style={[typography.oldPrice, styles.strike, lg && styles.oldLg]} numberOfLines={1}>
            {formatFCFA(oldPrice)}
          </Text>
          <DiscountBadge percent={percent} size={lg ? 'md' : 'sm'} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 5, rowGap: 3 },
  strike: { textDecorationLine: 'line-through', textDecorationColor: colors.textSecondary },
  priceLg: { fontSize: 22 },
  oldLg: { fontSize: 14 },
});
