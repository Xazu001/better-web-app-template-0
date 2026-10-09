import * as React from "react";

interface FloatingLabelOptions {
  text: string;
  duration?: number;
  debounceMs?: number;
}

type FloatingLabelTarget = React.MouseEvent<HTMLElement> | HTMLElement | null;

export function useFloatingLabel({
  text,
  duration = 1200,
  debounceMs = 400
}: FloatingLabelOptions) {
  const lastTriggerRef = React.useRef(0);

  const show = React.useCallback(
    (targetOrEvent: FloatingLabelTarget) => {
      const now = Date.now();

      if (now - lastTriggerRef.current < debounceMs) {
        return;
      }

      if (typeof document === "undefined") {
        return;
      }

      const target =
        targetOrEvent instanceof HTMLElement
          ? targetOrEvent
          : (targetOrEvent?.currentTarget ?? null);

      if (!target) {
        return;
      }

      lastTriggerRef.current = now;
      const rect = target.getBoundingClientRect();

      const el = document.createElement("span");
      el.className = "floating-label";
      el.textContent = text;
      el.style.left = `${rect.left + rect.width / 2}px`;
      el.style.top = `${rect.top}px`;

      document.body.appendChild(el);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add("floating-label--visible");
        });
      });

      setTimeout(() => {
        el.classList.remove("floating-label--visible");
        el.addEventListener("transitionend", () => el.remove(), { once: true });
        setTimeout(() => el.remove(), duration);
      }, duration);
    },
    [text, duration, debounceMs]
  );

  return show;
}
