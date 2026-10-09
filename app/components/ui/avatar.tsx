import * as React from "react";

import { cn } from "#/components/utils";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  shape?: "circle" | "square";
  bordered?: boolean;
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-6 w-6",
  lg: "h-9 w-9",
  xl: "h-15 w-15",
  "2xl": "h-21 w-21",
  "3xl": "h-25 w-25"
};

// ──────────────────────────────────────────────────────────────
// Component (Avatar)
// ──────────────────────────────────────────────────────────────

export const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, src, fallbackSrc, size = "md", shape = "circle", bordered, ...props }, ref) => {
    const [currentSrc, setCurrentSrc] = React.useState(src || fallbackSrc);

    // Re-sync when the requested source changes (also resets a previous error fallback)
    const [prevSrc, setPrevSrc] = React.useState(src);
    const [prevFallbackSrc, setPrevFallbackSrc] = React.useState(fallbackSrc);
    if (src !== prevSrc || fallbackSrc !== prevFallbackSrc) {
      setPrevSrc(src);
      setPrevFallbackSrc(fallbackSrc);
      setCurrentSrc(src || fallbackSrc);
    }

    return (
      <img
        ref={ref}
        src={currentSrc}
        onError={() => fallbackSrc && setCurrentSrc(fallbackSrc)}
        className={cn(
          "object-cover",
          sizeMap[size],
          shape === "circle" ? "rounded-full" : "rounded-md",
          bordered && "border-outline-variant border",
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";
