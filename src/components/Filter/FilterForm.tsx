import { useEffect, useState } from "react";
import { GetCategories as getAllCategories, Category } from "@/services/categoryService";
import { ShopFilters } from "@/types/shopFilter";
import CustomCheckbox from "../Form/CustomCheckbox";
import { HiRefresh, HiSortDescending, HiLocationMarker } from "react-icons/hi";
import { FaSpinner } from "react-icons/fa";
import { useToast } from "@/context/toastContext";
import { TextInput } from "flowbite-react";
import "./Filter.css";

interface Props {
    value: ShopFilters;
    onChange: (filters: ShopFilters) => void;
    section?: "general" | "categories";
}

const textInputTheme = {
    field: {
        input: {
            colors: {
                gray:
                    "border-lightGray bg-gray-50 text-gray-900 placeholder-gray-500 " +
                    "focus:border-primary focus:ring-primary " +
                    "dark:border-gray-600 dark:bg-gray-700 dark:text-white " +
                    "dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary",
            },
        },
    },
};

export default function FilterForm({ value, onChange, section = "general" }: Props) {
    const [filters, setFilters] = useState<ShopFilters>(value);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setFilters(value);
    }, [value]);

    useEffect(() => {
        setLoading(true);
        getAllCategories()
            .then(setCategories)
            .finally(() => setLoading(false));
    }, []);

    const update = <K extends keyof ShopFilters>(k: K, v: ShopFilters[K]) => {
        setFilters((prev) => ({ ...prev, [k]: v }));
    };

    const toggleCategory = (id: number, checked: boolean) => {
        const next = checked
            ? [...(filters.categoryIds ?? []), id]
            : (filters.categoryIds ?? []).filter((c) => c !== id);
        update("categoryIds", next);
    };

    const handleReset = () => {
        const cleared: ShopFilters = {};
        setFilters(cleared);
        onChange(cleared);
        addToast("Filters reset.", "success");
    };

    return (
        <div className="mx-auto p-2 rounded-xl space-y-6 text-accent animate-fade-in-up duration-500 ease-out">
            {section === "categories" && (
                <>
                    <h2 className="font-bold text-primary uppercase tracking-wide text-sm">Categories</h2>
                    <p className="text-xs text-gray-500 mb-2">Pick all sandwich styles that apply.</p>

                    {loading ? (
                        <div className="flex justify-center py-6">
                            <FaSpinner className="animate-spin text-primary w-6 h-6" />
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {categories.map(
                                (cat) =>
                                    typeof cat.id === "number" && (
                                        <CustomCheckbox
                                            key={cat.id}
                                            id={`cat-${cat.id}`}
                                            label={cat.category_name}
                                            checked={filters.categoryIds?.includes(cat.id) ?? false}
                                            onChange={(ck) => toggleCategory(cat.id!, ck)}
                                        />
                                    )
                            )}
                        </div>
                    )}
                </>
            )}

            {section === "general" && (
                <>
                    <div>
                        <h2 className="font-bold text-primary uppercase tracking-wide text-sm">Filter by Location</h2>
                        <p className="text-xs text-gray-500 mb-3">Enter a city, state, or country to narrow your search.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="relative">
                                <HiLocationMarker className="absolute left-3 top-2.5 text-gray-400 w-4 h-4 z-10" />
                                <TextInput
                                    theme={textInputTheme}
                                    className="pl-10 text-sm rounded-lg shadow-sm"
                                    placeholder="City"
                                    value={filters.city ?? ""}
                                    onChange={(e) => update("city", e.target.value)}
                                />
                            </div>
                            <TextInput
                                theme={textInputTheme}
                                className="text-sm rounded-lg shadow-sm"
                                placeholder="State"
                                value={filters.state ?? ""}
                                onChange={(e) => update("state", e.target.value)}
                            />
                            <TextInput
                                theme={textInputTheme}
                                className="sm:col-span-2 text-sm rounded-lg shadow-sm"
                                placeholder="Country"
                                value={filters.country ?? ""}
                                onChange={(e) => update("country", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-0 border-t border-lightGray space-y-4">
                        <h2 className="font-bold text-primary uppercase tracking-wide text-sm">Additional Options</h2>

                        <div className="flex items-center">
                            <CustomCheckbox
                                id="open-only"
                                label="Open Only"
                                checked={!!filters.locationOpen}
                                onChange={(ck) => update("locationOpen", ck)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-primary mb-1 uppercase">Sort Results</label>
                            <div className="relative">
                                <HiSortDescending className="absolute left-3 top-2.5 text-gray-400 w-4 h-4 z-10" />
                                <select
                                    className="h-10 pl-10 pr-4 w-full text-sm rounded-lg border border-lightGray bg-gray-50 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                                    value={filters.sort ?? ""}
                                    onChange={(e) => update("sort", e.target.value as ShopFilters["sort"])}
                                >
                                    <option value="">Default</option>
                                    <option value="recent">Newest</option>
                                    <option value="votes">Most Upvoted</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Choose how you'd like the results ordered.</p>
                        </div>
                    </div>
                </>
            )}

            <div className="flex filter-btn-cont justify-end gap-3 pt-0 border-t border-lightGray">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-sm px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all duration-200"
                >
                    <HiRefresh className="w-4 h-4" />
                    Reset
                </button>
            </div>
        </div>
    );
}
