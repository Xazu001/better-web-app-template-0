import * as React from "react";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const switchVariants = createVariants("md3-switch", {
  variants: {
    size: {
      sm: "md3-switch--sm",
      md: "md3-switch--md",
      lg: "md3-switch--lg"
    }
  },
  defaultVariants: {
    size: "md"
  }
});

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface SwitchProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof switchVariants> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
  label?: React.ReactNode;
  labelClassName?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
  name?: string;
}

// ──────────────────────────────────────────────────────────────
// Component (Switch)
// ──────────────────────────────────────────────────────────────

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      size,
      iconOn,
      iconOff,
      label,
      labelClassName,
      className,
      wrapperClassName,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;

    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(disabled);

    const md3State = disabled ? "disabled" : checked ? "checked" : "enabled";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      props.onClick?.(e);
      onCheckedChange?.(!checked);
    };

    const cls = cn(
      switchVariants({ size: size || "md" }),
      disabled && "md3-switch--disabled",
      rippleState.pressed && "md3-switch--pressed",
      className
    );

    return (
      <div className={cn("md3-switch__wrapper", wrapperClassName)}>
        {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          name={name}
          className={cls}
          data-state={md3State}
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          {...handlers}
          {...props}
        >
          <span className="md3-switch__track">
            <span ref={surfaceRef} className="md3-switch__ripple" aria-hidden="true">
              <span className="ripple" />
            </span>
            <span className="md3-switch__state-layer" aria-hidden="true" />
            <span className="md3-switch__thumb">
              {iconOff && !checked && (
                <span className="md3-switch__icon md3-switch__icon--off" aria-hidden="true">
                  {iconOff}
                </span>
              )}
              {iconOn && checked && (
                <span className="md3-switch__icon md3-switch__icon--on" aria-hidden="true">
                  {iconOn}
                </span>
              )}
            </span>
          </span>
        </button>
        {label && (
          <label htmlFor={switchId} className={cn("md3-switch__label", labelClassName)}>
            {label}
          </label>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch, switchVariants };
