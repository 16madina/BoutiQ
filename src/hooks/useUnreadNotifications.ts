import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { currentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Nombre de notifications non lues (relu à chaque retour sur l'écran). */
export function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!supabase) return;
        const user = await currentUser();
        if (!user) return;
        const { count: n } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null);
        if (active) setCount(n ?? 0);
      })().catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );
  return count;
}
