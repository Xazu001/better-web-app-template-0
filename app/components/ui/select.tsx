import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "#/components/utils";
import { useRipple } from "#/lib/hooks/use-ripple";

export interface SelectProps {
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  label?: string;
  labelClassName?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  popoverVariant?: "float";
  multipleSelect?: boolean;
  direction?: "up" | "down";
  className?: string;
  children: React.ReactNode;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const GAP = 8;

// Convert single value or array to array for consistent handling
const toArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value,
      onValueChange,
      label,
      labelClassName,
      size,
      disabled,
      error,
      placeholder,
      popoverVariant = "float",
      multipleSelect = false,
      direction = "down",
      className,
      children
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const isMounted = React.useSyncExternalStore(
      () => () => {},
      () => true,
      () => false
    );
    const [isPositionReady, setIsPositionReady] = React.useState(false);
    const [position, setPosition] = React.useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
    }>({ left: 0, width: 0 });

    const generatedId = React.useId();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const triggerId = `${generatedId}-trigger`;
    const labelId = `${generatedId}-label`;
    const listboxId = `${generatedId}-listbox`;

    const selectedValues = toArray(value);

    const items = React.Children.toArray(children).filter(
      (c): c is React.ReactElement<SelectItemProps> =>
        React.isValidElement(c) && (c.type as any) === SelectItem
    );

    const displayLabel = React.useMemo(() => {
      if (multipleSelect) {
        if (selectedValues.length === 0) return placeholder ?? "";
        const labels = items
          .filter((it) => selectedValues.includes(it.props.value))
          .map((it) => it.props.children);
        return labels.join(", ");
      }
      const selectedItem = items.find((it) => it.props.value === selectedValues[0]);
      return selectedItem?.props.children ?? placeholder ?? "";
    }, [items, selectedValues, multipleSelect, placeholder]);

    const uiState = error ? "error" : disabled ? "disabled" : open ? "open" : "closed";

    // Reset position readiness when the popover closes
    const [wasOpen, setWasOpen] = React.useState(open);
    if (open !== wasOpen) {
      setWasOpen(open);
      if (!open) setIsPositionReady(false);
    }

    const updatePosition = React.useCallback(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();

      setPosition(
        direction === "up"
          ? {
              bottom: window.innerHeight - triggerRect.top + GAP,
              left: triggerRect.left,
              width: triggerRect.width
            }
          : {
              top: triggerRect.bottom + GAP,
              left: triggerRect.left,
              width: triggerRect.width
            }
      );
      setIsPositionReady(true);
    }, [direction]);

    React.useLayoutEffect(() => {
      if (!open) return;

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [open, updatePosition]);

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (containerRef.current?.contains(target) || contentRef.current?.contains(target)) {
          return;
        }
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", handler);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    const ctxValue = React.useMemo<SelectContextValue>(
      () => ({
        multipleSelect,
        selectedValues,
        onPick: (v: string) => {
          if (multipleSelect) {
            const next = selectedValues.includes(v)
              ? selectedValues.filter((s) => s !== v)
              : [...selectedValues, v];
            onValueChange?.(next);
          } else {
            onValueChange?.(v);
            setOpen(false);
          }
        }
      }),
      [selectedValues, multipleSelect, onValueChange]
    );

    const popover = open && isMounted && (
      <SelectContext.Provider value={ctxValue}>
        <div
          ref={(node) => {
            contentRef.current = node;
          }}
          className={cn(
            "ui-select__popover",
            `ui-select__popover--${popoverVariant}`,
            `ui-select__popover--${size || "md"}`
          )}
          data-positioning={!isPositionReady}
          id={listboxId}
          role="listbox"
          style={{
            position: "fixed",
            top: position.top ?? "auto",
            bottom: position.bottom ?? "auto",
            left: position.left,
            width: position.width,
            zIndex: 9999,
            visibility: isPositionReady ? "visible" : "hidden",
            pointerEvents: isPositionReady ? "auto" : "none"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </SelectContext.Provider>
    );

    return (
      <>
        <div
          ref={(node) => {
            containerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={cn(
            "ui-select",
            `ui-select--${size || "md"}`,
            error && "ui-select--error",
            label && "ui-select--has-label",
            className
          )}
          data-state={uiState}
        >
          {label && (
            <label
              id={labelId}
              htmlFor={triggerId}
              className={cn("ui-select__label", labelClassName)}
            >
              {label}
            </label>
          )}
          <button
            ref={triggerRef}
            id={triggerId}
            type="button"
            className="ui-select__trigger"
            disabled={disabled}
            onClick={() => !disabled && setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-label={!label ? placeholder || "Select option" : undefined}
            aria-labelledby={label ? labelId : undefined}
          >
            <span className={cn("ui-select__value", !value && "ui-select__value--placeholder")}>
              {displayLabel}
            </span>
            <span className="ui-select__chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>
        {popover ? createPortal(popover, document.body) : null}
      </>
    );
  }
);
Select.displayName = "Select";

// ──────────────────────────────────────────────────────────────
// Context — shared state for SelectItem components
// ──────────────────────────────────────────────────────────────

interface SelectContextValue {
  multipleSelect: boolean;
  selectedValues: string[];
  onPick: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// Component (SelectItem) — individual option in dropdown
// ──────────────────────────────────────────────────────────────

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  Icon?: React.ReactNode;
  selected?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ value, children, disabled, Icon, selected, onClick, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const isSelected = ctx ? ctx.selectedValues.includes(value) : selected;
    const isMulti = ctx?.multipleSelect ?? false;
    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(disabled);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || disabled) return;
      ctx?.onPick(value);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={cn(
          "ui-select__item",
          isMulti && "ui-select__item--multi",
          isSelected && "ui-select__item--selected",
          disabled && "ui-select__item--disabled",
          rippleState.pressed && "ui-select__item--pressed"
        )}
        data-state={isSelected ? "selected" : disabled ? "disabled" : "enabled"}
        disabled={disabled}
        onClick={handleClick}
        {...handlers}
        {...props}
      >
        <span ref={surfaceRef} className="ui-select__item-ripple" aria-hidden="true">
          <span className="uix-ripple" />
        </span>
        <span className="ui-select__item-state-layer" aria-hidden="true" />
        {isMulti && (
          <span className="ui-select__item-check" aria-hidden="true">
            {isSelected && (
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
        {Icon && <span className="ui-select__item-icon">{Icon}</span>}
        <span className="ui-select__item-label">{children}</span>
      </button>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
