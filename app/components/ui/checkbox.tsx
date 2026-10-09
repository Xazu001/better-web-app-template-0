import * as React from "react";

import { cn } from "#/components/utils";
import { useRipple } from "#/lib/hooks/use-ripple";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass-elevation-1" | "glass-elevation-2";
  label?: React.ReactNode;
  labelClassName?: string;
  Icon?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  onChange?: (checked: boolean) => void;
  name?: string;
  id?: string;
}

// ──────────────────────────────────────────────────────────────
// Component (Checkbox)
// ──────────────────────────────────────────────────────────────

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      indeterminate = false,
      disabled = false,
      size,
      variant = "default",
      label,
      labelClassName,
      Icon,
      className,
      wrapperClassName,
      onChange,
      name,
      id
    },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(disabled);

    const md3State = disabled
      ? "disabled"
      : indeterminate
        ? "indeterminate"
        : checked
          ? "checked"
          : "enabled";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      const nextChecked = !checked;
      if (!isControlled) {
        setUncontrolledChecked(nextChecked);
      }
      onChange?.(nextChecked);
    };

    const cls = cn(
      "md3-checkbox",
      `md3-checkbox--${size || "md"}`,
      variant !== "default" && `md3-checkbox--${variant}`,
      disabled && "md3-checkbox--disabled",
      rippleState.pressed && "md3-checkbox--pressed",
      className
    );

    return (
      <div className={cn("md3-checkbox__wrapper", wrapperClassName)}>
        {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
        <button
          ref={ref}
          id={checkboxId}
          type="button"
          role="checkbox"
          name={name}
          className={cls}
          data-state={md3State}
          aria-checked={indeterminate ? "mixed" : checked}
          disabled={disabled}
          onClick={handleClick}
          {...handlers}
        >
          <span ref={surfaceRef} className="md3-checkbox__ripple" aria-hidden="true">
            <span className="ripple" />
          </span>
          <span className="md3-checkbox__state-layer" aria-hidden="true" />
          <span className="md3-checkbox__box">
            {checked && !indeterminate && (
              <span className="md3-checkbox__check">
                {Icon || (
                  <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l5 5L20 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            )}
            {indeterminate && <span className="md3-checkbox__minus" aria-hidden="true" />}
          </span>
        </button>
        {label && (
          <label htmlFor={checkboxId} className={cn("md3-checkbox__label", labelClassName)}>
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
