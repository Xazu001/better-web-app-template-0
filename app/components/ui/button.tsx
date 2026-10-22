import * as React from "react";
import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const buttonVariants = createVariants("ui-btn", {
  variants: {
    variant: {
      primary: "ui-btn--primary",
      transparent: "ui-btn--transparent",
      "elevation-1": "ui-btn--elevation-1",
      "elevation-2": "ui-btn--elevation-2",
      outline: "ui-btn--outline",
      ghost: "ui-btn--ghost",
      error: "ui-btn--error",
      success: "ui-btn--success",
      "glass-error": "ui-btn--glass-error"
    },
    size: {
      sm: "ui-btn--sm",
      md: "ui-btn--md",
      lg: "ui-btn--lg"
    },
    aspectSquare: {
      true: "ui-btn--square",
      false: ""
    },
    iconButton: {
      true: "ui-btn--icon-button",
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
    const uiState = isButtonActive ? "active" : state === "default" ? "enabled" : state;
    const accessibleLabel =
      ariaLabel ?? (iconButton && typeof children === "string" ? children : undefined);

    const cls = cn(
      buttonVariants({ variant, size: size || "md", aspectSquare, iconButton }),
      isButtonActive && "ui-btn--active",
      isButtonActive && "ui-btn--selected",
      state === "loading" && "ui-btn--loading",
      state === "disabled" && "ui-btn--disabled",
      rippleState.pressed && "ui-btn--pressed",
      className
    );

    const content = (
      <>
        <span ref={surfaceRef} className="ui-btn__ripple" aria-hidden="true">
          <span className="uix-ripple" />
        </span>
        <span className="ui-btn__state-layer" aria-hidden="true" />
        {Icon && IconPosition === "BeforeText" && <span className="ui-btn__icon">{Icon}</span>}
        {!iconButton && <span className="ui-btn__label">{children}</span>}
        {state === "loading" && <span className="ui-btn__spinner" aria-hidden="true" />}
        {Icon && IconPosition === "AfterText" && <span className="ui-btn__icon">{Icon}</span>}
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
          data-state={uiState}
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
        data-state={uiState}
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
