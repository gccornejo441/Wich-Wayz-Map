import React from "react";

interface CategoryActionsProps {
  categoryName: string;
  setCategoryName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  handleAddCategory: (categoryName: string, description: string) => void;
  handleDownloadCategories: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-black/5 bg-white shadow-card",
        "dark:border-white/10 dark:bg-surface-darker",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 p-4 dark:border-white/10">
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

      <div className="p-4">{children}</div>
    </section>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string },
) {
  const { label, className, ...rest } = props;
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-text-base dark:text-text-inverted">
          {label}
        </span>
      ) : null}
      <input
        {...rest}
        className={cx(
          "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-text-base shadow-sm outline-none",
          "placeholder:text-black/40 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
          "dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:placeholder:text-white/40",
          "dark:focus:ring-brand-primary/25",
          className,
        )}
      />
    </label>
  );
}

function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-brand-primary text-white hover:bg-brand-primaryHover"
          : "border border-black/10 bg-white text-text-base hover:bg-black/5 dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-white/10",
        className,
      )}
    />
  );
}

const CategoryActions = ({
  categoryName,
  setCategoryName,
  description,
  setDescription,
  handleAddCategory,
  handleDownloadCategories,
}: CategoryActionsProps) => {
  const canSubmit = categoryName.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    handleAddCategory(categoryName.trim(), description.trim());
    setCategoryName("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      <Card
        title="Add Category"
        subtitle="Create a new category with an optional description."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Add
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Category name"
            type="text"
            placeholder="e.g., Cheesesteaks"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <Input
            label="Description"
            type="text"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {!canSubmit ? (
          <p className="mt-3 text-sm text-text-muted dark:text-white/70">
            Enter a category name to enable adding.
          </p>
        ) : null}
      </Card>

      <Card
        title="Export Categories"
        subtitle="Download the current categories as a JSON file."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadCategories}
          >
            Download JSON
          </Button>
        }
      >
        <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4 text-sm text-text-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
          Tip: Use this export to version your categories list or seed
          environments.
        </div>
      </Card>
    </div>
  );
};

export default CategoryActions;
