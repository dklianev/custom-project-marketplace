"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="relative w-full font-[Manrope]">
        <input
          type={type}
          id={inputId}
          className={cn(
            "peer w-full rounded-t-lg border-0 border-b-2 border-on-surface/20 bg-surface-container-high px-4 pt-6 pb-2 text-base text-on-surface transition-colors duration-200 placeholder-transparent focus:border-primary focus:outline-none",
            className
          )}
          ref={ref}
          placeholder={label || " "}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className="absolute left-4 top-2 text-xs uppercase tracking-[0.05em] text-on-surface/60 transition-[top,font-size,letter-spacing,color] duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-[0.05em] peer-focus:text-primary"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
