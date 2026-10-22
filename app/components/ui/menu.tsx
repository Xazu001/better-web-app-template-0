import * as React from "react";
import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

export interface MenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}

const Menu = ({
  open,
  onOpenChange,
  align = "start",
  side = "bottom",
  className,
  children
}: MenuProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const ctxValue = React.useMemo<MenuContextValue>(
    () => ({ close: () => onOpenChange(false) }),
    [onOpenChange]
  );

  return (
    <MenuContext.Provider value={ctxValue}>
      <div
        ref={containerRef}
        className={cn(
          "ui-menu",
          `ui-menu--align-${align}`,
          `ui-menu--side-${side}`,
          open && "ui-menu--open",
          className
        )}
        data-state={open ? "open" : "closed"}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
};

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

interface MenuContextValue {
  close: () => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

// ──────────────────────────────────────────────────────────────
// MenuTrigger
// ──────────────────────────────────────────────────────────────

export interface MenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

const MenuTrigger = ({ children, asChild, className }: MenuTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: cn("ui-menu__trigger", className, (children.props as any)?.className)
    });
  }
  return <div className={cn("ui-menu__trigger", className)}>{children}</div>;
};

// ──────────────────────────────────────────────────────────────
// MenuContent
// ──────────────────────────────────────────────────────────────

export interface MenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const MenuContent = React.forwardRef<HTMLDivElement, MenuContentProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("ui-menu__content", `ui-menu__content--${size}`, className)}
        role="menu"
        {...props}
      >
        {children}
      </div>
    );
  }
);
MenuContent.displayName = "MenuContent";

// ──────────────────────────────────────────────────────────────
// MenuItem
// ──────────────────────────────────────────────────────────────

const menuItemVariants = createVariants("ui-menu__item", {
  variants: {
    variant: {
      default: "ui-menu__item--default",
      destructive: "ui-menu__item--destructive"
    }
  },
  defaultVariants: { variant: "default" }
});

export interface MenuItemProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof menuItemVariants> {
  asChild?: boolean;
  selected?: boolean;
  disabled?: boolean;
  Icon?: React.ReactNode;
  TrailingIcon?: React.ReactNode;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
}

const MenuItem = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, MenuItemProps>(
  (
    {
      className,
      variant,
      asChild,
      selected,
      disabled,
      Icon,
      TrailingIcon,
      to,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(MenuContext);
    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(disabled);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || disabled) return;
      ctx?.close();
    };

    const cls = cn(
      menuItemVariants({ variant }),
      selected && "ui-menu__item--selected",
      disabled && "ui-menu__item--disabled",
      rippleState.pressed && "ui-menu__item--pressed",
      className
    );

    const content = (
      <>
        <span ref={surfaceRef} className="ui-menu__item-ripple" aria-hidden="true">
          <span className="uix-ripple" />
        </span>
        <span className="ui-menu__item-state-layer" aria-hidden="true" />
        {Icon && <span className="ui-menu__item-icon">{Icon}</span>}
        <span className="ui-menu__item-label">{children}</span>
        {TrailingIcon && <span className="ui-menu__item-trailing">{TrailingIcon}</span>}
      </>
    );

    const dataState = selected ? "selected" : disabled ? "disabled" : "enabled";

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ className?: string; onClick?: (e: any) => void }>,
        {
          className: cn(cls, (children.props as any)?.className),
          onClick: handleClick,
          ...handlers
        }
      );
    }

    if (to) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          className={cls}
          data-state={dataState}
          onClick={handleClick}
          {...handlers}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        role="menuitem"
        aria-disabled={disabled}
        className={cls}
        data-state={dataState}
        onClick={handleClick}
        {...handlers}
        {...props}
      >
        {content}
      </button>
    );
  }
);
MenuItem.displayName = "MenuItem";

// ──────────────────────────────────────────────────────────────
// MenuSeparator
// ──────────────────────────────────────────────────────────────

const MenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("ui-menu__separator", className)} {...props} />;
  }
);
MenuSeparator.displayName = "MenuSeparator";

export { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger };
