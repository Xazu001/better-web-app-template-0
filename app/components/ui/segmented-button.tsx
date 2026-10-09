import * as React from "react";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

const segmentedButtonVariants = createVariants("md3-segmented-button", {
  variants: {
    direction: {
      horizontal: "md3-segmented-button--horizontal",
      vertical: "md3-segmented-button--vertical"
    },
    selectMode: {
      single: "md3-segmented-button--single",
      multiple: "md3-segmented-button--multiple"
    },
    size: {
      sm: "md3-segmented-button--sm",
      md: "md3-segmented-button--md",
      lg: "md3-segmented-button--lg"
    },
    genre: {
      default: "",
      nav: "md3-segmented-button--nav"
    }
  },
  defaultVariants: {
    direction: "horizontal",
    selectMode: "single",
    size: "md",
    genre: "default"
  }
});

export interface SegmentedButtonProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof segmentedButtonVariants> {
  disabled?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
}

export type SegmentedButtonGenre = "default" | "nav";

const SegmentedButton = React.forwardRef<HTMLDivElement, SegmentedButtonProps>(
  (
    {
      className,
      direction,
      selectMode,
      size,
      genre,
      disabled,
      value,
      defaultValue,
      onValueChange,
      children,
      ...props
    },
    ref
  ) => {
    const [activeValue, setActiveValue] = React.useState<string | string[] | undefined>(
      defaultValue
    );

    const currentValue = value !== undefined ? value : activeValue;

    const handleValueChange = React.useCallback(
      (nextValue: string | string[]) => {
        if (value === undefined) {
          setActiveValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
      [value, onValueChange]
    );

    const ctxValue = React.useMemo<SegmentedButtonContextValue>(
      () => ({
        selectMode: selectMode || "single",
        disabled: !!disabled,
        genre: genre || "default",
        value: currentValue,
        onValueChange: handleValueChange
      }),
      [selectMode, disabled, genre, currentValue, handleValueChange]
    );

    const cls = cn(
      segmentedButtonVariants({ direction, selectMode, size: size || "md", genre }),
      disabled && "md3-segmented-button--disabled",
      className
    );

    return (
      <div
        ref={ref}
        className={cls}
        data-state={disabled ? "disabled" : "enabled"}
        role="group"
        {...props}
      >
        <SegmentedButtonContext.Provider value={ctxValue}>
          {children}
        </SegmentedButtonContext.Provider>
      </div>
    );
  }
);
SegmentedButton.displayName = "SegmentedButton";

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

interface SegmentedButtonContextValue {
  selectMode: "single" | "multiple";
  disabled: boolean;
  genre: SegmentedButtonGenre;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

const SegmentedButtonContext = React.createContext<SegmentedButtonContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// SegmentedButtonItem
// ──────────────────────────────────────────────────────────────

export interface SegmentedButtonItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> {
  value: string;
  active?: boolean;
  disabled?: boolean;
  Icon?: React.ReactNode;
  label?: React.ReactNode;
  aspectSquare?: boolean;
  iconButton?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "error" | "success" | "warning" | "info";
}

const SegmentedButtonItem = React.forwardRef<HTMLButtonElement, SegmentedButtonItemProps>(
  (
    {
      className,
      value,
      active,
      disabled,
      Icon,
      label,
      aspectSquare,
      iconButton,
      variant,
      onClick,
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(SegmentedButtonContext);
    const groupDisabled = ctx?.disabled ?? false;
    const groupGenre = ctx?.genre ?? "default";
    const isDisabled = disabled || groupDisabled;

    const groupValue = ctx?.value;
    const isActiveFromGroup = ctx
      ? Array.isArray(groupValue)
        ? groupValue.includes(value)
        : groupValue === value
      : active;

    const isActive = isActiveFromGroup ?? active ?? false;

    const itemLabel =
      ariaLabel ??
      (iconButton && typeof label === "string"
        ? label
        : iconButton && typeof children === "string"
          ? children
          : undefined);

    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(isDisabled);

    const md3State = isDisabled ? "disabled" : isActive ? "active" : "enabled";

    const cls = cn(
      "md3-segmented-button__item",
      isActive && "md3-segmented-button__item--active",
      isDisabled && "md3-segmented-button__item--disabled",
      (aspectSquare || iconButton) && "md3-segmented-button__item--square",
      iconButton && "md3-segmented-button__item--icon-button",
      rippleState.pressed && "md3-segmented-button__item--pressed",
      className
    );

    const iconCls = cn(
      "md3-segmented-button__item-icon",
      groupGenre === "nav" && variant && `md3-segmented-button__item-icon--${variant}`,
      groupGenre === "nav" && !variant && "md3-segmented-button__item-icon--primary"
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (isDisabled || !ctx?.onValueChange) return;
      const mode = ctx.selectMode;
      if (mode === "single") {
        ctx.onValueChange(value);
      } else {
        const current = Array.isArray(groupValue) ? groupValue : groupValue ? [groupValue] : [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        ctx.onValueChange(next);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cls}
        data-state={md3State}
        disabled={isDisabled}
        aria-label={itemLabel}
        aria-pressed={isActive}
        onClick={handleClick}
        {...handlers}
        {...props}
      >
        <span ref={surfaceRef} className="md3-segmented-button__item-ripple" aria-hidden="true">
          <span className="ripple" />
        </span>
        <span className="md3-segmented-button__item-state-layer" aria-hidden="true" />
        {Icon && <span className={iconCls}>{Icon}</span>}
        {!iconButton && label && <span className="md3-segmented-button__item-label">{label}</span>}
        {!iconButton && children && !label && (
          <span className="md3-segmented-button__item-label">{children}</span>
        )}
      </button>
    );
  }
);
SegmentedButtonItem.displayName = "SegmentedButtonItem";

export { SegmentedButton, SegmentedButtonItem, segmentedButtonVariants };
