import React, { useState } from "react";
import Autosuggest from "react-autosuggest";
import { HiFilter, HiSearch } from "react-icons/hi";
import { SearchShops } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { useShops } from "@/context/shopContext";
import { IndexedDBShop } from "@/services/indexedDB";
import { FilterDropdown } from "../Filter/FilterDropdown";
import { ShopFilters } from "@/types/shopFilter";
import { useToast } from "@/context/toastContext";

interface SearchBarProps {
  navRef?: React.RefObject<HTMLElement>;
}

const SearchBar = ({ navRef }: SearchBarProps) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<IndexedDBShop[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ShopFilters>({});

  const { addToast } = useToast();
  const { setCenter, setShopId, setZoom, setUserInteracted } = useMap();
  const { applyFilters } = useShops();

  const fetchSuggestions = async (value: string, filtersOverride?: ShopFilters) => {
    const appliedFilters = filtersOverride ?? filters;
    const results = await SearchShops(value, { ...appliedFilters, search: value });
    setSuggestions(results.map(r => r.shop));
  };

  const onSuggestionsFetchRequested = ({ value }: { value: string }) =>
    fetchSuggestions(value);

  const onSuggestionsClearRequested = () => setSuggestions([]);

  const getSuggestionValue = (suggestion: IndexedDBShop) => suggestion.name;

  const renderSuggestion = (suggestion: IndexedDBShop) => {
    const location = suggestion.locations?.[0];
    const address = location
      ? `${location.street_address || ""}, ${location.city || ""}`
      : "Address not available";

    return (
      <div className="flex flex-col md:flex-row justify-between md:items-center p-2 rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-white/10">
        <span className="font-medium">{suggestion.name}</span>
        <span className="text-sm truncate md:ml-2">{address}</span>
      </div>
    );
  };

  const handleSuggestionSelected = (
    _: React.FormEvent,
    { suggestion }: { suggestion: IndexedDBShop }
  ) => {
    const location = suggestion.locations?.[0];
    if (location) {
      setCenter([location.longitude, location.latitude]);
      setZoom(16);
      setShopId(suggestion.id.toString());
      setUserInteracted(false);
    }
    setSearch(suggestion.name);
  };

  const inputProps = {
    placeholder: "Search shops",
    value: search,
    onChange: (
      _: React.FormEvent<HTMLElement>,
      { newValue }: { newValue: string }
    ) => setSearch(newValue),
  };

  const handleFilterChange = async (updatedFilters: ShopFilters) => {
    setFilters(updatedFilters);
    const results = await SearchShops(search, { ...updatedFilters, search });
    const shops = results.map(r => r.shop);
    await applyFilters(shops);
    setSuggestions(shops);

    if (shops.length === 0) {
      addToast("No shops found matching your filters.", "error");
    } else {
      addToast(`Showing ${shops.length} filtered shop(s).`, "success");
    }

    const firstLoc = shops[0].locations?.[0];
    if (firstLoc) {
      setCenter([firstLoc.longitude, firstLoc.latitude]);
      setZoom(13);
      setShopId(shops[0].id.toString());
      setUserInteracted(false);
    }
  };

  return (
    <div className="relative w-full flex items-center gap-2">
      {/* Filter Button */}
      <div className="relative hidden" data-filter-button>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center px-3 py-2 bg-brand-secondary text-gray-800 dark:bg-white/10 dark:text-white rounded-lg shadow hover:bg-yellow-400 dark:hover:bg-white/20 transition"
        >
          <HiFilter className="w-5 h-5 mr-1" />
          <span className="text-sm font-semibold hidden sm:inline">Filter</span>
        </button>

        <FilterDropdown
          open={filterOpen}
          navRef={navRef}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Search Input with Autosuggest */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
          <HiSearch className="w-5 h-5 text-text-muted dark:text-text-inverted" aria-hidden="true" />
        </div>

        <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={onSuggestionsFetchRequested}
          onSuggestionsClearRequested={onSuggestionsClearRequested}
          getSuggestionValue={getSuggestionValue}
          renderSuggestion={renderSuggestion}
          onSuggestionSelected={handleSuggestionSelected}
          inputProps={{
            ...inputProps,
            className:
              "w-full p-2 pl-10 text-sm text-text-base dark:text-text-inverted bg-surface-light dark:bg-surface-dark border border-surface-muted dark:border-gray-700 rounded-lg shadow-card focus:ring-2 focus:ring-brand-primary focus:outline-none font-sans",
          }}
          theme={{
            container: "relative",
            suggestionsContainer:
              "absolute z-10 mt-2 w-full bg-surface-light dark:bg-surface-dark rounded-lg shadow-card",
            suggestion:
              "cursor-pointer px-3 py-2 text-text-base dark:text-text-inverted hover:bg-brand-primary dark:hover:bg-white/10 hover:text-white",
            suggestionHighlighted: "bg-brand-primary dark:bg-white/10",
          }}
        />
      </div>
    </div>
  );
};

export default SearchBar;
