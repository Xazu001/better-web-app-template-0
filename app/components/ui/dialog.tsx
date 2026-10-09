import * as React from "react";
import { createPortal } from "react-dom";

import { Icon } from "#/components/ui/icon";
import { cn } from "#/components/utils";
import { useHydrated } from "#/lib/hooks/use-hydrated";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Context — shared state for Dialog components
// ──────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  dismissible: boolean;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

const useDialogContext = () => {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog components must be used within a Dialog provider");
  }
  return ctx;
};

// ──────────────────────────────────────────────────────────────
// Component (Dialog) — root provider
// ──────────────────────────────────────────────────────────────

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /**
   * When false, the dialog cannot be dismissed by clicking the scrim
   * or pressing Escape. Defaults to true.
   */
  dismissible?: boolean;
}

const Dialog = ({ open, onOpenChange, children, className, dismissible = true }: DialogProps) => {
  React.useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, dismissible]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange, className, dismissible }}>
      {children}
    </DialogContext.Provider>
  );
};

// ──────────────────────────────────────────────────────────────
// Component (DialogContent) — dialog content shell
// ──────────────────────────────────────────────────────────────

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "popover" | "elevation" | "kit-play-elevation-1";
  hideClose?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const DialogCloseButton = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>();
  return (
    <button
      type="button"
      className={cn("md3-dialog__close", rippleState.pressed && "is-pressed")}
      aria-label="Close"
      onClick={() => onOpenChange(false)}
      {...handlers}
    >
      <Icon.X size="sm" />
      <span ref={surfaceRef} className="md3-dialog__close-ripple" aria-hidden="true">
        <span className="ripple" />
      </span>
      <span className="md3-dialog__close-state-layer" aria-hidden="true" />
    </button>
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      size = "md",
      variant = "popover",
      hideClose = false,
      children,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const { open, onOpenChange, className: dialogClassName, dismissible } = useDialogContext();
    const mounted = useHydrated();

    if (!open || !mounted) return null;

    return createPortal(
      <div
        className={cn("md3-dialog", dialogClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <div
          className="md3-dialog__scrim"
          onClick={() => dismissible && onOpenChange(false)}
          aria-hidden="true"
        />
        <div className={cn("md3-dialog__surface", `md3-dialog__surface--${size}`)}>
          <div
            ref={ref}
            className={cn(
              "md3-dialog__content",
              `md3-dialog__content--${variant}`,
              !hideClose && dismissible && "md3-dialog__content--with-close",
              className
            )}
            {...props}
          >
            {children}
          </div>
          {!hideClose && dismissible && <DialogCloseButton onOpenChange={onOpenChange} />}
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = "DialogContent";

// ──────────────────────────────────────────────────────────────
// Component (DialogTrigger) — button to open dialog
// ──────────────────────────────────────────────────────────────

export interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

const DialogTrigger = ({ children, asChild, onClick }: DialogTriggerProps) => {
  const { onOpenChange } = useDialogContext();

  const handleClick = () => {
    onClick?.();
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: () => void }>;
    return React.cloneElement(child, {
      onClick: () => {
        child.props.onClick?.();
        handleClick();
      }
    });
  }
  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
};

export { Dialog, DialogContent, DialogTrigger };
