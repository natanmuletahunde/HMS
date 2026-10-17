import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        {
          "border-transparent bg-primary text-bg": variant === "default",
          "border-transparent bg-success text-bg": variant === "success",
          "border-transparent bg-warning text-bg": variant === "warning",
          "border-transparent bg-danger text-text": variant === "danger",
          "border-transparent bg-info text-bg": variant === "info",
          "border-transparent bg-muted text-text-muted": variant === "muted",
          "text-text": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
