import * as React from "react";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────

const switchVariants = createVariants("ui-switch", {
  variants: {
    size: {
      sm: "ui-switch--sm",
      md: "ui-switch--md",
      lg: "ui-switch--lg"
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

    const uiState = disabled ? "disabled" : checked ? "checked" : "enabled";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      props.onClick?.(e);
      onCheckedChange?.(!checked);
    };

    const cls = cn(
      switchVariants({ size: size || "md" }),
      disabled && "ui-switch--disabled",
      rippleState.pressed && "ui-switch--pressed",
      className
    );

    return (
      <div className={cn("ui-switch__wrapper", wrapperClassName)}>
        {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          name={name}
          className={cls}
          data-state={uiState}
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          {...handlers}
          {...props}
        >
          <span className="ui-switch__track">
            <span ref={surfaceRef} className="ui-switch__ripple" aria-hidden="true">
              <span className="uix-ripple" />
            </span>
            <span className="ui-switch__state-layer" aria-hidden="true" />
            <span className="ui-switch__thumb">
              {iconOff && !checked && (
                <span className="ui-switch__icon ui-switch__icon--off" aria-hidden="true">
                  {iconOff}
                </span>
              )}
              {iconOn && checked && (
                <span className="ui-switch__icon ui-switch__icon--on" aria-hidden="true">
                  {iconOn}
                </span>
              )}
            </span>
          </span>
        </button>
        {label && (
          <label htmlFor={switchId} className={cn("ui-switch__label", labelClassName)}>
            {label}
          </label>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch, switchVariants };
