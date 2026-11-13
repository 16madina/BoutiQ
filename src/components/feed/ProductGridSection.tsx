import { useMemo } from 'react';
import { View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { useMasonryMetrics } from '@/components/ProductMasonryGrid';
import { spacing } from '@/theme';
import type { Product } from '@/types';

import { FeedHeader } from './FeedHeader';

/** Format A — grille classique : les produits côte à côte, chacun à sa hauteur naturelle. */
export function ProductGridSection({ title, products }: { title?: string; products: Product[] }) {
  const { columns, gap, cardWidth } = useMasonryMetrics();
  // Chaque produit rejoint la colonne la moins haute (rendu équilibré, sans trous).
  const cols = useMemo(() => {
    const lists: Product[][] = Array.from({ length: columns }, () => []);
    const heights = new Array(columns).fill(0);
    for (const p of products) {
      const i = heights.indexOf(Math.min(...heights));
      lists[i].push(p);
      heights[i] += p.aspect + 0.42;
    }
    return lists;
  }, [products, columns]);

  return (
    <View>
      {title ? <FeedHeader title={title} /> : null}
      <View style={{ flexDirection: 'row', gap, paddingHorizontal: spacing.screen }}>
        {cols.map((list, i) => (
          <View key={i} style={{ width: cardWidth, gap: gap + 2 }}>
            {list.map((p) => (
              <ProductCard key={p.id} product={p} width={cardWidth} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
