import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
