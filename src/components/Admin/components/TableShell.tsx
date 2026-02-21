import React from "react";

interface TableShellProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}

export const TableShell: React.FC<TableShellProps> = ({
  isLoading,
  isEmpty,
  emptyText,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="space-y-3">
          <div className="h-4 w-2/5 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
        </div>
        <p className="mt-3 text-sm text-text-muted dark:text-white/70">
          Loading…
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center dark:border-white/15 dark:bg-white/[0.03]">
        <div>
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-black/10 dark:bg-white/10" />
          <p className="text-sm font-medium text-text-base dark:text-text-inverted">
            {emptyText}
          </p>
          <p className="mt-1 text-sm text-text-muted dark:text-white/70">
            Nothing to show here right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10">
      {children}
    </div>
  );
};
