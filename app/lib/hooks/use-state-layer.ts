import * as React from "react";

// ============================================================================
// useStateLayer — MD3 state layer overlay (hovered 8% / pressed 12% / focus 12%).
// Alternatywa dla useRipple gdy komponent potrzebuje tylko state layer bez ripple.
//
// State layer realizujemy przez <span class="{block}__state-layer"> jako dziecko
// komponentu (stylowane w co-located .css). Ten hook trackuje tylko stany
// hovered/pressed/focused — komponent renderuje overlay na ich podstawie.
//
// SSR GUARD: tylko handler/event-based state, brak DOM operacji poza handlerami.
// ============================================================================

export interface StateLayerState {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
}

export interface StateLayerHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface UseStateLayerReturn {
  state: StateLayerState;
  handlers: StateLayerHandlers;
}

export function useStateLayer(): UseStateLayerReturn {
  const [state, setState] = React.useState<StateLayerState>({
    hovered: false,
    pressed: false,
    focused: false
  });

  const onPointerDown = React.useCallback(() => setState((s) => ({ ...s, pressed: true })), []);
  const onPointerUp = React.useCallback(() => setState((s) => ({ ...s, pressed: false })), []);
  const onPointerEnter = React.useCallback(() => setState((s) => ({ ...s, hovered: true })), []);
  const onPointerLeave = React.useCallback(
    () => setState((s) => ({ ...s, hovered: false, pressed: false })),
    []
  );
  const onFocus = React.useCallback(() => setState((s) => ({ ...s, focused: true })), []);
  const onBlur = React.useCallback(() => setState((s) => ({ ...s, focused: false })), []);

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur
    }
  };
}

// Re-export RefObject for convenience (useRipple compat)
export type { RefObject } from "react";
