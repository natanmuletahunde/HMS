"use client";

import React, { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isSaving?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export function SideDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  isSaving = false,
  onSave,
  saveLabel = "Save Changes",
  cancelLabel = "Cancel",
  className,
}: SideDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => !isSaving && onClose()}
      />

      {/* Drawer Panel (480px width) */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[480px] h-full flex flex-col",
          "bg-[var(--surface)] text-[var(--text-primary)]",
          "border-l border-[var(--border)] shadow-2xl",
          "animate-in slide-in-from-right duration-200 ease-out",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Sticky Footer */}
        <div className="p-5 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
          {footer ? (
            footer
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--blue-700)] text-white hover:bg-[var(--navy-800)] transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saveLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
