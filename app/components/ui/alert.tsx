import * as React from "react";

import { Icon } from "#/components/ui/icon";
import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";

const alertVariants = createVariants("alert", {
  variants: {
    variant: {
      surface: "alert--surface",
      error: "alert--error",
      success: "alert--success",
      warning: "alert--warning",
      info: "alert--info",
      "glass-elevation-1": "alert--glass-elevation-1",
      "glass-elevation-2": "alert--glass-elevation-2",
      "glass-error": "alert--glass-error",
      "glass-success": "alert--glass-success",
      "glass-info": "alert--glass-info"
    },
    size: {
      sm: "alert--sm",
      md: "alert--md",
      lg: "alert--lg"
    }
  },
  defaultVariants: {
    variant: "surface",
    size: "md"
  }
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, icon, onClose, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    >
      <span className="alert__icon">{icon ?? <DefaultAlertIcon variant={variant} />}</span>
      <div className="alert__content">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="alert__close" aria-label="Close alert">
          <Icon.X size="sm" />
        </button>
      )}
    </div>
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4 ref={ref} className={cn("alert__title", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("alert__description", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

// Helpers

function DefaultAlertIcon({ variant }: { variant?: string | null }) {
  switch (variant) {
    case "error":
    case "glass-error":
      return <Icon.AlertCircle size="sm" />;
    case "success":
    case "glass-success":
      return <Icon.Check size="sm" />;
    case "warning":
      return <Icon.AlertCircle size="sm" />;
    case "info":
    case "glass-info":
      return <Icon.Info size="sm" />;
    default:
      return <Icon.Info size="sm" />;
  }
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
