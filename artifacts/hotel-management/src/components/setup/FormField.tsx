"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  name?: string;
  id?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FormField({
  label,
  id,
  required,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold text-[var(--text-primary)] select-none"
        >
          {label}
          {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
        </label>
      </div>

      {children}

      {helperText && !error && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{helperText}</p>
      )}

      {error && (
        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-current" />
          {error}
        </p>
      )}
    </div>
  );
}

export interface LuxuryInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const LuxuryInput = React.forwardRef<HTMLInputElement, LuxuryInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-10 px-3.5 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)]",
          "rounded-lg border border-[var(--border)] transition-all outline-none",
          "placeholder:text-[var(--text-muted)]",
          "focus:border-[var(--blue-700)] focus:ring-2 focus:ring-[var(--blue-700)]/15",
          "disabled:opacity-50 disabled:bg-[var(--bg-page)] disabled:cursor-not-allowed",
          error && "border-rose-500 focus:ring-rose-500/20",
          className
        )}
        {...props}
      />
    );
  }
);
LuxuryInput.displayName = "LuxuryInput";

export interface LuxurySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const LuxurySelect = React.forwardRef<HTMLSelectElement, LuxurySelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full h-10 px-3.5 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)]",
          "rounded-lg border border-[var(--border)] transition-all outline-none cursor-pointer",
          "focus:border-[var(--blue-700)] focus:ring-2 focus:ring-[var(--blue-700)]/15",
          "disabled:opacity-50 disabled:bg-[var(--bg-page)] disabled:cursor-not-allowed",
          error && "border-rose-500 focus:ring-rose-500/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
LuxurySelect.displayName = "LuxurySelect";
