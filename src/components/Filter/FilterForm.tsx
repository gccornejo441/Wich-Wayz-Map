import { useEffect, useState } from "react";
import { ShopFilters } from "@/types/shopFilter";
import CustomCheckbox from "../Form/CustomCheckbox";
import { HiSortDescending } from "react-icons/hi";
import { FaSpinner } from "react-icons/fa";
import "./Filter.css";
import {
  CategoryWithShopCount,
  getCategoriesWithShopCount,
} from "@/services/getCategoriesWithShopCount";
import InputField from "../Utilites/InputField";

interface Props {
  value: ShopFilters;
  onChange: (filters: ShopFilters) => void;
  section?: "general" | "categories";
}

export default function FilterForm({
  value,
  onChange,
  section = "general",
}: Props) {
  const [filters, setFilters] = useState<ShopFilters>(value);
  const [categories, setCategories] = useState<CategoryWithShopCount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFilters(value);
  }, [value]);

  useEffect(() => {
    setLoading(true);
    getCategoriesWithShopCount()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof ShopFilters>(k: K, v: ShopFilters[K]) => {
    const updated = { ...filters, [k]: v };
    setFilters(updated);
    onChange(updated);
  };

  const toggleCategory = (id: number, checked: boolean) => {
    const next = checked
      ? [...(filters.categoryIds ?? []), id]
      : (filters.categoryIds ?? []).filter((c) => c !== id);

    const updatedFilters = { ...filters, categoryIds: next };
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };

  return (
    <div className="mx-auto p-2 rounded-xl space-y-2 text-text-base dark:text-text-inverted animate-fade-in-up duration-500 ease-out">
      {section === "categories" && (
        <>
          <h2 className="font-bold text-text-base dark:text-text-inverted uppercase tracking-wide text-sm">
            Categories
          </h2>
          <p className="text-xs text-text-muted dark:text-text-inverted mb-2">
            Pick all sandwich styles that apply.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <FaSpinner className="animate-spin text-text-inverted w-6 h-6" />
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto p-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => (
                <CustomCheckbox
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  label={`${cat.name} (${cat.shopCount})`}
                  checked={filters.categoryIds?.includes(cat.id) ?? false}
                  onChange={(ck) => toggleCategory(cat.id, ck)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {section === "general" && (
        <>
          <div>
            <h2 className="font-bold text-text-base dark:text-text-inverted uppercase tracking-wide text-sm">
              Filter by Location
            </h2>
            <p className="text-xs text-text-muted dark:text-text-inverted mb-3">
              Enter a city, state, or country to narrow your search.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <InputField
                  name="city"
                  label=""
                  placeholder="City"
                  value={filters.city ?? ""}
                  onChange={(e) => update("city", e.target.value)}
                  errors={{}}
                />
              </div>
              <InputField
                name="state"
                label=""
                placeholder="State"
                value={filters.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
                errors={{}}
              />

              <InputField
                name="country"
                label=""
                placeholder="Country"
                value={filters.country ?? ""}
                onChange={(e) => update("country", e.target.value)}
                errors={{}}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-surface-muted dark:border-gray-700 space-y-4">
            <h2 className="font-bold text-text-base dark:text-text-inverted uppercase tracking-wide text-sm">
              Additional Options
            </h2>

            <div className="flex items-center">
              <CustomCheckbox
                id="open-only"
                label="Open Only"
                checked={!!filters.locationOpen}
                onChange={(ck) => update("locationOpen", ck)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-base dark:text-text-inverted mb-1 uppercase">
                Sort Results
              </label>
              <div className="relative">
                <HiSortDescending className="absolute left-3 top-3 text-text-muted w-5 h-5 z-10" />
                <select
                  className="h-10 pl-10 pr-4 w-full text-dark dark:text-white text-md border-brand-primary dark:border-text-muted border-2 px-4 py-2 rounded-md bg-white focus:border-1 focus:border-brand-primary dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out"
                  value={filters.sort ?? ""}
                  onChange={(e) =>
                    update("sort", e.target.value as ShopFilters["sort"])
                  }
                >
                  <option value="">Default</option>
                  <option value="recent">Newest</option>
                  <option value="votes">Most Upvoted</option>
                </select>
              </div>
              <p className="text-xs text-text-muted dark:text-text-inverted mt-1">
                Choose how you'd like the results ordered.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
