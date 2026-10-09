export type CVAElementBaseVariant = {
  variant?: any;
  size: Record<ElementSize, string>;
};

export type ElementSize = "sm" | "default" | "lg";

// Breakpoint types based on site breakpoints
export type Breakpoint =
  | "phone"
  | "tablet"
  | "desktop"
  | "large-desktop"
  | "xlarge-desktop"
  | "2xlarge-desktop"
  | "huge";
