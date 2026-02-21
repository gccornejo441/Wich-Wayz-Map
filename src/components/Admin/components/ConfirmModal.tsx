import React, { useEffect, useId } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmText?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  requireText?: boolean;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  placeholder,
  confirmText = "Confirm",
  confirmVariant = "primary",
  requireText = false,
  value,
  onChange,
  onCancel,
  onConfirm,
  isBusy,
}) => {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = requireText ? value.trim().length > 0 : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onCancel();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      <div className="relative w-full max-w-lg animate-modalEnter rounded-2xl border border-black/10 bg-white shadow-card dark:border-white/10 dark:bg-surface-darker">
        <div className="border-b border-black/5 p-4 dark:border-white/10">
          <h3
            id={titleId}
            className="text-base font-semibold text-text-base dark:text-text-inverted"
          >
            {title}
          </h3>
          {description ? (
            <p
              id={descId}
              className="mt-1 text-sm text-text-muted dark:text-white/70"
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="p-4">
          <label
            htmlFor="modal-note"
            className="block text-sm font-medium text-text-base dark:text-text-inverted"
          >
            Note
          </label>
          <textarea
            id="modal-note"
            className="mt-2 min-h-[96px] w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-text-base shadow-sm outline-none placeholder:text-black/40 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:placeholder:text-white/40 dark:focus:ring-brand-primary/25"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {requireText && !canConfirm ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
              A note is required.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/5 p-4 dark:border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-text-base transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-white/10"
            disabled={isBusy}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isBusy}
            className={[
              "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              confirmVariant === "danger"
                ? "bg-red-600 text-white hover:bg-red-700"
                : confirmVariant === "secondary"
                  ? "border border-black/10 bg-white text-text-base hover:bg-black/5 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-white/10"
                  : "bg-brand-primary text-white hover:bg-brand-primaryHover",
            ].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
