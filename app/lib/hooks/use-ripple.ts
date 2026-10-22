import * as React from "react";

// ============================================================================
// useRipple — pure React MD3 ripple + state layer (zastępuje @material/web).
// Inspiracja: react-material-3-pure/src/hooks/useRipple.ts
//
// Ripple: pointerdown → spawn <span class="ripple__wave"> w surfaceRef,
//         animacja scale+fade, max ~300ms.
// State layer: hovered/pressed → opacity 0.08 / 0.12 przez <span class="{block}__state-layer">.
// Honoruje prefers-reduced-motion (no ripple animation, tylko state layer).
//
// SSR GUARD (KRYTYCZNE — Cloudflare Workers):
// Na SSR `window`/`document` nie istnieją. Wszystkie DOM operacje TYLKO w
// handlerach (po hydracji). prefers-reduced-motion check tylko w handlerach.
//
// API: useRipple<HTMLSpanElement>(disabled) → { surfaceRef, handlers, rippleState }
// ============================================================================

export interface RippleState {
  pressed: boolean;
  hovered: boolean;
}

export interface RippleHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}

export interface UseRippleReturn<T extends HTMLElement = HTMLSpanElement> {
  surfaceRef: React.RefObject<T | null>;
  handlers: RippleHandlers;
  rippleState: RippleState;
}

const RIPPLE_DURATION = 600; // ms — wolniejszy ripple (2× --duration-medium-3)

export function useRipple<T extends HTMLElement = HTMLSpanElement>(
  disabled = false
): UseRippleReturn<T> {
  const surfaceRef = React.useRef<T | null>(null);
  const [rippleState, setRippleState] = React.useState<RippleState>({
    pressed: false,
    hovered: false
  });

  const spawnRipple = React.useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return;
    const surface = surfaceRef.current;
    if (!surface) return;

    // prefers-reduced-motion → skip ripple animation (state layer zostaje)
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ripple = surface.querySelector<HTMLElement>(".uix-ripple");
    if (!ripple) return;

    const wave = document.createElement("span");
    wave.className = "ripple__wave";

    const rect = surface.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    wave.style.left = `${x - rect.left - size / 2}px`;
    wave.style.top = `${y - rect.top - size / 2}px`;
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;

    ripple.appendChild(wave);
    window.setTimeout(() => wave.remove(), RIPPLE_DURATION);
  }, []);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      setRippleState((s) => ({ ...s, pressed: true }));
      spawnRipple(e.clientX, e.clientY);
    },
    [disabled, spawnRipple]
  );

  const onPointerUp = React.useCallback(() => {
    setRippleState((s) => ({ ...s, pressed: false }));
  }, []);

  const onPointerEnter = React.useCallback(() => {
    if (disabled) return;
    setRippleState((s) => ({ ...s, hovered: true }));
  }, [disabled]);

  const onPointerLeave = React.useCallback(() => {
    setRippleState((s) => ({ ...s, hovered: false, pressed: false }));
  }, []);

  return {
    surfaceRef,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerEnter,
      onPointerLeave,
      onPointerCancel: onPointerUp
    },
    rippleState
  };
}
