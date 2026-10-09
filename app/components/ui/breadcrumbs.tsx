import * as React from "react";

import { cn } from "#/components/utils";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items?: Array<{ label: string; href?: string }>;
}

// ──────────────────────────────────────────────────────────────
// Component (Breadcrumbs)
// ──────────────────────────────────────────────────────────────

export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ className, items = [], children, ...props }, ref) => {
    if (items.length > 0) {
      return (
        <nav
          ref={ref}
          aria-label="Breadcrumb"
          className={cn("flex items-center gap-1 text-sm", className)}
          {...props}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-on-surface-variant">/</span>}
              {item.href ? (
                <a href={item.href} className="hover:text-on-surface text-on-surface-variant">
                  {item.label}
                </a>
              ) : (
                <span className="text-on-surface">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      );
    }
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn("flex items-center gap-1 text-sm", className)}
        {...props}
      >
        {children}
      </nav>
    );
  }
);
Breadcrumbs.displayName = "Breadcrumbs";
