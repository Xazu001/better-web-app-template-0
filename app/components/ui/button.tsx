import * as React from "react";
import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const buttonVariants = createVariants("md3-btn", {
  variants: {
    variant: {
      primary: "md3-btn--primary",
      transparent: "md3-btn--transparent",
      "elevation-1": "md3-btn--elevation-1",
      "elevation-2": "md3-btn--elevation-2",
      outline: "md3-btn--outline",
      ghost: "md3-btn--ghost",
      error: "md3-btn--error",
      success: "md3-btn--success",
      "glass-error": "md3-btn--glass-error"
    },
    size: {
      sm: "md3-btn--sm",
      md: "md3-btn--md",
      lg: "md3-btn--lg"
    },
    aspectSquare: {
      true: "md3-btn--square",
      false: ""
    },
    iconButton: {
      true: "md3-btn--icon-button",
      false: ""
    }
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
    aspectSquare: false,
    iconButton: false
  }
});

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  state?: "default" | "disabled" | "loading";
  active?: boolean;
  selected?: boolean;
  to?: string;
  navigationState?: any;
  prefetch?: "intent" | "render" | "none" | "viewport";
  aspectSquare?: boolean;
  iconButton?: boolean;
  Icon?: React.ReactNode;
  IconPosition?: "BeforeText" | "AfterText";
}

// ──────────────────────────────────────────────────────────────
// Component (Button)
// ──────────────────────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      aspectSquare,
      iconButton,
      state = "default",
      active,
      selected,
      to,
      navigationState,
      prefetch,
      Icon,
      IconPosition = "BeforeText",
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(state === "disabled");
    const disabled = state === "disabled" || state === "loading";
    const isButtonActive = active ?? selected ?? false;
    const md3State = isButtonActive ? "active" : state === "default" ? "enabled" : state;
    const accessibleLabel =
      ariaLabel ?? (iconButton && typeof children === "string" ? children : undefined);

    const cls = cn(
      buttonVariants({ variant, size: size || "md", aspectSquare, iconButton }),
      isButtonActive && "md3-btn--active",
      isButtonActive && "md3-btn--selected",
      state === "loading" && "md3-btn--loading",
      state === "disabled" && "md3-btn--disabled",
      rippleState.pressed && "md3-btn--pressed",
      className
    );

    const content = (
      <>
        <span ref={surfaceRef} className="md3-btn__ripple" aria-hidden="true">
          <span className="ripple" />
        </span>
        <span className="md3-btn__state-layer" aria-hidden="true" />
        {Icon && IconPosition === "BeforeText" && <span className="md3-btn__icon">{Icon}</span>}
        {!iconButton && <span className="md3-btn__label">{children}</span>}
        {state === "loading" && <span className="md3-btn__spinner" aria-hidden="true" />}
        {Icon && IconPosition === "AfterText" && <span className="md3-btn__icon">{Icon}</span>}
      </>
    );

    if (to) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          state={navigationState}
          prefetch={prefetch}
          className={cls}
          data-state={md3State}
          aria-label={accessibleLabel}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...handlers}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
        data-state={md3State}
        disabled={disabled}
        aria-label={accessibleLabel}
        {...handlers}
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
