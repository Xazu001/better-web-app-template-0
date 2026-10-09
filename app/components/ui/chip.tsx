import * as React from "react";
import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const chipVariants = createVariants("md3-chip", {
  variants: {
    variant: {
      assist: "md3-chip--assist",
      primary: "md3-chip--primary",
      success: "md3-chip--success",
      error: "md3-chip--error",
      outline: "md3-chip--outline",
      tonal: "md3-chip--tonal"
    },
    size: {
      sm: "md3-chip--sm",
      md: "md3-chip--md",
      lg: "md3-chip--lg"
    },
    selected: {
      true: "md3-chip--selected",
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
    const md3State = selected ? "selected" : state === "default" ? "enabled" : state;

    const cls = cn(
      chipVariants({ variant, size: size || "md", selected }),
      interactive && "md3-chip--interactive",
      state === "disabled" && "md3-chip--disabled",
      rippleState.pressed && "md3-chip--pressed",
      className
    );

    const content = (
      <>
        {interactive && (
          <>
            <span ref={surfaceRef} className="md3-chip__ripple" aria-hidden="true">
              <span className="ripple" />
            </span>
            <span className="md3-chip__state-layer" aria-hidden="true" />
          </>
        )}
        {Icon && IconPosition === "BeforeText" && <span className="md3-chip__icon">{Icon}</span>}
        <span className="md3-chip__label">{children}</span>
        {Icon && IconPosition === "AfterText" && <span className="md3-chip__icon">{Icon}</span>}
      </>
    );

    if (to) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          className={cls}
          data-state={md3State}
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
          data-state={md3State}
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
      <span ref={ref} className={cls} data-state={md3State} {...props}>
        {content}
      </span>
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
