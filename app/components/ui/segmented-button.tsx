import * as React from "react";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

const segmentedButtonVariants = createVariants("ui-segmented-button", {
  variants: {
    direction: {
      horizontal: "ui-segmented-button--horizontal",
      vertical: "ui-segmented-button--vertical"
    },
    selectMode: {
      single: "ui-segmented-button--single",
      multiple: "ui-segmented-button--multiple"
    },
    size: {
      sm: "ui-segmented-button--sm",
      md: "ui-segmented-button--md",
      lg: "ui-segmented-button--lg"
    },
    genre: {
      default: "",
      nav: "ui-segmented-button--nav"
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
      disabled && "ui-segmented-button--disabled",
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

    const uiState = isDisabled ? "disabled" : isActive ? "active" : "enabled";

    const cls = cn(
      "ui-segmented-button__item",
      isActive && "ui-segmented-button__item--active",
      isDisabled && "ui-segmented-button__item--disabled",
      (aspectSquare || iconButton) && "ui-segmented-button__item--square",
      iconButton && "ui-segmented-button__item--icon-button",
      rippleState.pressed && "ui-segmented-button__item--pressed",
      className
    );

    const iconCls = cn(
      "ui-segmented-button__item-icon",
      groupGenre === "nav" && variant && `ui-segmented-button__item-icon--${variant}`,
      groupGenre === "nav" && !variant && "ui-segmented-button__item-icon--primary"
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
        data-state={uiState}
        disabled={isDisabled}
        aria-label={itemLabel}
        aria-pressed={isActive}
        onClick={handleClick}
        {...handlers}
        {...props}
      >
        <span ref={surfaceRef} className="ui-segmented-button__item-ripple" aria-hidden="true">
          <span className="uix-ripple" />
        </span>
        <span className="ui-segmented-button__item-state-layer" aria-hidden="true" />
        {Icon && <span className={iconCls}>{Icon}</span>}
        {!iconButton && label && <span className="ui-segmented-button__item-label">{label}</span>}
        {!iconButton && children && !label && (
          <span className="ui-segmented-button__item-label">{children}</span>
        )}
      </button>
    );
  }
);
SegmentedButtonItem.displayName = "SegmentedButtonItem";

export { SegmentedButton, SegmentedButtonItem, segmentedButtonVariants };
