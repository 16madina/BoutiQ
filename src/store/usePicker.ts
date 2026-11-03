import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * Sélecteurs en bottom sheet natif (route `/select`, présentation formSheet).
 * L'écran appelant ouvre la feuille, la feuille renvoie la valeur choisie ici.
 */
export type PickerKind = 'category' | 'city' | 'country' | 'collection';

interface PickerState {
  kind: PickerKind | null;
  selected?: string;
  options?: string[];
  result: { kind: PickerKind; value: string; n: number } | null;
  open: (kind: PickerKind, selected?: string, options?: string[]) => void;
  choose: (value: string) => void;
}

export const usePicker = create<PickerState>((set, get) => ({
  kind: null,
  result: null,
  open: (kind, selected, options) => {
    set({ kind, selected, options });
    router.push('/select');
  },
  choose: (value) => {
    const kind = get().kind;
    if (!kind) return;
    set({ result: { kind, value, n: (get().result?.n ?? 0) + 1 } });
    router.back();
  },
}));

/** Reçoit la valeur choisie dans la feuille pour un type de sélecteur donné. */
export function usePickerResult(kind: PickerKind, onPick: (value: string) => void) {
  const result = usePicker((s) => s.result);
  const handler = useRef(onPick);
  handler.current = onPick;
  const lastN = useRef(result?.n ?? 0);
  useEffect(() => {
    if (result && result.kind === kind && result.n !== lastN.current) {
      lastN.current = result.n;
      handler.current(result.value);
    }
  }, [result, kind]);
}
