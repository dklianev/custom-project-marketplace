import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EditorialPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-white/65 bg-white/78 backdrop-blur-xl shadow-[0_30px_90px_rgba(77,66,96,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary/80",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TonalChip({
  active = false,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200",
        active
          ? "bg-primary text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.22)]"
          : "bg-surface-container-low text-on-surface-variant hover:bg-white hover:text-on-surface",
        className,
      )}
      {...props}
    />
  );
}
