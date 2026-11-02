import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type StatCardVariant = "default" | "success" | "warning" | "danger" | "info";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon | React.ReactNode;
  variant?: StatCardVariant;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  loading?: boolean;
}

const variantStyles: Record<
  StatCardVariant,
  {
    title: string;
    value: string;
    iconBg: string;
    iconText: string;
  }
> = {
  default: {
    title: "text-slate-700 dark:text-slate-300",
    value: "text-slate-900 dark:text-white",
    iconBg: "bg-slate-100/90 dark:bg-slate-800/80",
    iconText: "text-slate-700 dark:text-slate-300",
  },
  success: {
    title: "text-emerald-700 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
    iconBg: "bg-emerald-100/70 dark:bg-emerald-950/60",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    title: "text-amber-700 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100/70 dark:bg-amber-950/60",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    title: "text-rose-600 dark:text-rose-400",
    value: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100/70 dark:bg-rose-950/60",
    iconText: "text-rose-600 dark:text-rose-400",
  },
  info: {
    title: "text-blue-700 dark:text-blue-400",
    value: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100/70 dark:bg-blue-950/60",
    iconText: "text-blue-600 dark:text-blue-400",
  },
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      title,
      value,
      subtitle,
      icon: IconOrElement,
      variant = "default",
      trend,
      loading,
      ...props
    },
    ref
  ) => {
    const styles = variantStyles[variant] || variantStyles.default;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border/80 bg-surface p-5 shadow-xs transition-all duration-200 hover:shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs sm:text-sm font-medium tracking-tight truncate", styles.title)}>
              {title}
            </p>
            <h3 className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5", styles.value)}>
              {loading ? (
                <span className="inline-block animate-pulse text-text-muted">...</span>
              ) : (
                value
              )}
            </h3>
            {subtitle && (
              <p className="text-xs text-text-muted mt-1 truncate">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                <span
                  className={cn(
                    "font-semibold",
                    trend.isPositive ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}
                </span>
                {trend.label && (
                  <span className="text-text-muted">{trend.label}</span>
                )}
              </div>
            )}
          </div>

          {IconOrElement && (
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200",
                styles.iconBg,
                styles.iconText
              )}
            >
              {typeof IconOrElement === "function" ? (
                <IconOrElement className="h-6 w-6 stroke-[2]" />
              ) : React.isValidElement(IconOrElement) ? (
                IconOrElement
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = "StatCard";
