import * as React from "react";
import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const chipVariants = createVariants("ui-chip", {
  variants: {
    variant: {
      assist: "ui-chip--assist",
      primary: "ui-chip--primary",
      success: "ui-chip--success",
      error: "ui-chip--error",
      outline: "ui-chip--outline",
      tonal: "ui-chip--tonal"
    },
    size: {
      sm: "ui-chip--sm",
      md: "ui-chip--md",
      lg: "ui-chip--lg"
    },
    selected: {
      true: "ui-chip--selected",
      false: ""
    }
  },
  defaultVariants: {
    variant: "assist",
    size: "md",
    selected: false
  }
});

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {
  state?: "default" | "disabled";
  selected?: boolean;
  to?: string;
  Icon?: React.ReactNode;
  IconPosition?: "BeforeText" | "AfterText";
}

// ──────────────────────────────────────────────────────────────
// Component (Chip)
// ──────────────────────────────────────────────────────────────

const Chip = React.forwardRef<HTMLSpanElement | HTMLAnchorElement, ChipProps>(
  (
    {
      className,
      variant,
      size,
      selected,
      state = "default",
      to,
      Icon,
      IconPosition = "BeforeText",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const interactive = Boolean(to || onClick);
    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(
      state === "disabled" || !interactive
    );
    const uiState = selected ? "selected" : state === "default" ? "enabled" : state;

    const cls = cn(
      chipVariants({ variant, size: size || "md", selected }),
      interactive && "ui-chip--interactive",
      state === "disabled" && "ui-chip--disabled",
      rippleState.pressed && "ui-chip--pressed",
      className
    );

    const content = (
      <>
        {interactive && (
          <>
            <span ref={surfaceRef} className="ui-chip__ripple" aria-hidden="true">
              <span className="uix-ripple" />
            </span>
            <span className="ui-chip__state-layer" aria-hidden="true" />
          </>
        )}
        {Icon && IconPosition === "BeforeText" && <span className="ui-chip__icon">{Icon}</span>}
        <span className="ui-chip__label">{children}</span>
        {Icon && IconPosition === "AfterText" && <span className="ui-chip__icon">{Icon}</span>}
      </>
    );

    if (to) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          className={cls}
          data-state={uiState}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...handlers}
        >
          {content}
        </Link>
      );
    }

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={cls}
          data-state={uiState}
          disabled={state === "disabled"}
          onClick={onClick}
          {...handlers}
          {...props}
        >
          {content}
        </button>
      );
    }

    return (
      <span ref={ref} className={cls} data-state={uiState} {...props}>
        {content}
      </span>
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
