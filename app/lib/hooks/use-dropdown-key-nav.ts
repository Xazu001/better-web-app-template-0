import * as React from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard navigation for dropdown menus and select lists.
 * Focuses first item on open, closes on Tab past boundaries or Escape,
 * and returns focus to the trigger element.
 */
export function useDropdownKeyNav({
  contentRef,
  triggerRef,
  isOpen,
  onClose
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
}) {
  // Auto-focus first focusable element when dropdown opens
  React.useEffect(() => {
    if (!isOpen) return;

    const raf = requestAnimationFrame(() => {
      const first = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    return () => cancelAnimationFrame(raf);
  }, [isOpen, contentRef]);

  // Close on Tab past boundaries or Escape, return focus to trigger
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const content = contentRef.current;
      if (!content) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

      if (focusable.length === 0) {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const shouldClose =
        (!e.shiftKey && document.activeElement === last) ||
        (e.shiftKey && document.activeElement === first);

      if (shouldClose) {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, contentRef, triggerRef, onClose]);
}
