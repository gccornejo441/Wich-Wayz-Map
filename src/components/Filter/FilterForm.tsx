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

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

interface Props {
  value: ShopFilters;
  onChange: (filters: ShopFilters) => void;
  section?: "general" | "categories";
  savedOnlyDisabled?: boolean;
  distanceDisabled?: boolean;
}

export default function FilterForm({
  value,
  onChange,
  section = "general",
  savedOnlyDisabled = false,
  distanceDisabled = false,
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
              <select
                id="state-filter"
                className="h-10 w-full text-dark dark:text-white text-md border-brand-primary dark:border-text-muted border-2 px-4 py-2 rounded-md bg-white focus:border-1 focus:border-brand-primary dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out"
                value={filters.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
              >
                <option value="">Any state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <InputField
                name="country"
                label=""
                placeholder="Country"
                value={filters.country ?? "United States"}
                onChange={(e) => update("country", e.target.value)}
                errors={{}}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-surface-muted dark:border-gray-700 space-y-4">
            <h2 className="font-bold text-text-base dark:text-text-inverted uppercase tracking-wide text-sm">
              Additional Options
            </h2>

            <div>
              <label
                htmlFor="status-filter"
                className="block text-xs font-semibold text-text-base dark:text-text-inverted mb-1 uppercase"
              >
                Status
              </label>
              <select
                id="status-filter"
                className="h-10 w-full text-dark dark:text-white text-md border-brand-primary dark:border-text-muted border-2 px-4 py-2 rounded-md bg-white focus:border-1 focus:border-brand-primary dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out"
                value={filters.locationStatus ?? "any"}
                onChange={(e) =>
                  update(
                    "locationStatus",
                    e.target.value as ShopFilters["locationStatus"],
                  )
                }
              >
                <option value="any">Any status</option>
                <option value="open">Open</option>
                <option value="temporarily_closed">Temporarily closed</option>
                <option value="permanently_closed">Permanently closed</option>
              </select>
              <p className="text-xs text-text-muted dark:text-text-inverted mt-1">
                Uses current shop status, not live business hours.
              </p>
            </div>

            <div>
              <label
                htmlFor="distance-filter"
                className="block text-xs font-semibold text-text-base dark:text-text-inverted mb-1 uppercase"
              >
                Distance From Map Area
              </label>
              <select
                id="distance-filter"
                disabled={distanceDisabled}
                className="h-10 w-full text-dark dark:text-white text-md border-brand-primary dark:border-text-muted border-2 px-4 py-2 rounded-md bg-white focus:border-1 focus:border-brand-primary dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60"
                value={filters.distanceMiles ?? ""}
                onChange={(e) =>
                  update(
                    "distanceMiles",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Any distance</option>
                <option value="1">Within 1 mi</option>
                <option value="3">Within 3 mi</option>
                <option value="5">Within 5 mi</option>
                <option value="10">Within 10 mi</option>
                <option value="25">Within 25 mi</option>
              </select>
              <p className="text-xs text-text-muted dark:text-text-inverted mt-1">
                {distanceDisabled
                  ? "Move the map to set an area."
                  : "Anchors to the current map center when applied."}
              </p>
            </div>

            <div className="flex items-center">
              <CustomCheckbox
                id="saved-only"
                label={
                  savedOnlyDisabled
                    ? "Saved Only (sign in required)"
                    : "Saved Only"
                }
                checked={!!filters.savedOnly}
                onChange={(ck) => update("savedOnly", ck)}
                disabled={savedOnlyDisabled}
              />
            </div>

            <div>
              <label
                htmlFor="recently-added-filter"
                className="block text-xs font-semibold text-text-base dark:text-text-inverted mb-1 uppercase"
              >
                Recently Added
              </label>
              <select
                id="recently-added-filter"
                className="h-10 w-full text-dark dark:text-white text-md border-brand-primary dark:border-text-muted border-2 px-4 py-2 rounded-md bg-white focus:border-1 focus:border-brand-primary dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors duration-200 ease-in-out"
                value={filters.recentlyAdded ?? "any"}
                onChange={(e) =>
                  update(
                    "recentlyAdded",
                    e.target.value as ShopFilters["recentlyAdded"],
                  )
                }
              >
                <option value="any">Any time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sort-results"
                className="block text-xs font-semibold text-text-base dark:text-text-inverted mb-1 uppercase"
              >
                Sort Results
              </label>
              <div className="relative">
                <HiSortDescending className="absolute left-3 top-3 text-text-muted w-5 h-5 z-10" />
                <select
                  id="sort-results"
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
