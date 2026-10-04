import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-[var(--motion-quick)] focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
