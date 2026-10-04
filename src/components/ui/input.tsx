import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-[var(--motion-quick)] focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
