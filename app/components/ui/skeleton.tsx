import * as React from "react";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";

const skeletonVariants = createVariants("skeleton", {
  variants: {
    variant: {
      default: "skeleton--default",
      circle: "skeleton--circle",
      text: "skeleton--text"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, shimmer = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), shimmer && "skeleton--shimmer", className)}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };
