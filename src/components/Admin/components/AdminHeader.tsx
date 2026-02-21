import React from "react";
import { Button } from "@components/ui";

interface HeaderBadge {
  label: string;
  value: string;
}

interface AdminHeaderProps {
  badges: HeaderBadge[];
  onRefreshAll: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  badges,
  onRefreshAll,
}) => {
  return (
    <div className="sticky top-12 z-10 border-b border-black/5 bg-surface-light/85 backdrop-blur supports-[backdrop-filter]:bg-surface-light/70 dark:border-white/10 dark:bg-surface-dark/80">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
            <p className="mt-1 text-sm text-text-muted dark:text-white/70">
              Moderation, brand controls, submissions, users, and categories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-text-base shadow-sm dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted"
              >
                {badge.label}: <span className="ml-1">{badge.value}</span>
              </div>
            ))}
            <Button variant="primary" type="button" onClick={onRefreshAll}>
              Refresh All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
