import React, { useMemo, useState } from "react";
import { useToast } from "@context/toastContext";
import { getAllCategories } from "@services/apiClient";
import { Category } from "@models/Category";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function Button({
  variant = "primary",
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
        props.className,
      )}
    />
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-text-base shadow-sm outline-none",
        "placeholder:text-black/40 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
        "dark:border-white/10 dark:bg-surface-dark dark:text-text-inverted dark:placeholder:text-white/40",
        "dark:focus:ring-brand-primary/25",
        props.className,
      )}
    />
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-black/10 dark:bg-white/10" />
        <p className="text-sm font-semibold text-text-base dark:text-text-inverted">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-sm text-text-muted dark:text-white/70">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-4 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();

  const handleShowCategories = async () => {
    setIsLoading(true);
    try {
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      addToast("Failed to fetch categories.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) =>
      cat.category_name.toLowerCase().includes(q),
    );
  }, [categories, searchTerm]);

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={handleShowCategories}
          disabled={isLoading}
        >
          {isLoading ? "Loading…" : "Load Categories"}
        </Button>
      </div>

      <div>
        {isLoading ? (
          <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="space-y-3">
              <div className="h-4 w-2/5 rounded bg-black/10 dark:bg-white/10" />
              <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
              <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
              <div className="h-9 w-full rounded bg-black/10 dark:bg-white/10" />
            </div>
            <p className="mt-3 text-sm text-text-muted dark:text-white/70">
              Fetching categories…
            </p>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories loaded"
            description="Click “Load Categories” to fetch the latest list."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={handleShowCategories}
              >
                Load now
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="block w-full sm:max-w-md">
                <label
                  htmlFor="category-search"
                  className="mb-1 block text-sm font-medium text-text-base dark:text-text-inverted"
                >
                  Search
                </label>
                <Input
                  id="category-search"
                  type="text"
                  placeholder="Search categories…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="text-sm text-text-muted dark:text-white/70">
                Showing{" "}
                <span className="font-semibold">
                  {filteredCategories.length}
                </span>{" "}
                of <span className="font-semibold">{categories.length}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-surface-darker">
                    <tr className="border-b border-black/5 dark:border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
                        Category Name
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="border-b border-black/5 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 text-text-muted dark:text-white/70">
                          {cat.id}
                        </td>
                        <td className="px-4 py-3 text-text-base dark:text-text-inverted">
                          {cat.category_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredCategories.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="No matches"
                      description="Try a different search term."
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CategoriesList;
