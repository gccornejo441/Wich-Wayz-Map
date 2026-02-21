import React from "react";
import { cx } from "../utils/brandStatus.utils";

interface AdminCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className,
}) => {
  return (
    <section
      className={cx(
        "rounded-2xl border border-black/5 bg-white shadow-sm",
        "dark:border-white/10 dark:bg-surface-dark",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 p-4 sm:p-5 dark:border-white/10">
        <div className="min-w-[220px]">
          <h3 className="text-base font-semibold text-text-base dark:text-text-inverted">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-text-muted dark:text-white/70">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
};
