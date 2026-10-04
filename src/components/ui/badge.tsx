import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "danger" | "warn" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide",
        tone === "neutral" && "bg-surface-2 text-muted",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "accent" && "bg-accent/15 text-accent",
        className,
      )}
      {...props}
    />
  );
}
