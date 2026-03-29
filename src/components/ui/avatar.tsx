"use client";

import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-[Manrope]",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const avatarSizes = {
  sm: "32px",
  md: "40px",
  lg: "56px",
} as const;

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);
    const resolvedSize = size ?? "md";

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, className }))}
        {...props}
      >
        {src && !hasError ? (
          <Image
            src={src}
            alt={alt || ""}
            fill
            sizes={avatarSizes[resolvedSize]}
            className="object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span className="uppercase tracking-[0.05em] font-medium text-on-surface/70">
            {fallback || "?"}
          </span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
