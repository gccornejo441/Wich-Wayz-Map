import React, { useEffect, useMemo, useRef, useState } from "react";
import Autosuggest from "react-autosuggest";
import { HiFilter, HiSearch } from "react-icons/hi";
import { FilterShops, SearchShops, ShopSearchHit } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { FilterDropdown } from "../Filter/FilterDropdown";
import { ShopFilters } from "@/types/shopFilter";
import { useToast } from "@/context/toastContext";
import { ShopGeoJsonProperties } from "@utils/shopGeoJson";
import { buildStreetAddress } from "@utils/address";
import { useSaved } from "@context/savedContext";
import { useAuth } from "@context/authContext";

interface SearchBarProps {
  navRef?: React.RefObject<HTMLElement>;
}

const MIN_QUERY_LEN = 2;
const SUGGESTION_LIMIT = 10;
const DEBOUNCE_MS = 200;

const statusLabels: Record<
  NonNullable<ShopFilters["locationStatus"]>,
  string
> = {
  any: "Any status",
  open: "Open",
  temporarily_closed: "Temporarily closed",
  permanently_closed: "Permanently closed",
};

const recentlyAddedLabels: Record<
  NonNullable<ShopFilters["recentlyAdded"]>,
  string
> = {
  any: "Any time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const coordsChanged = (
  a: [number, number] | null | undefined,
  b: [number, number] | null | undefined,
) => {
  if (!a || !b) return Boolean(a || b);
  return Math.abs(a[0] - b[0]) > 0.0001 || Math.abs(a[1] - b[1]) > 0.0001;
};

const getActiveFilterCount = (filters: ShopFilters) => {
  let count = 0;
  if (filters.locationStatus && filters.locationStatus !== "any") count += 1;
  if (filters.categoryIds?.length) count += 1;
  if (filters.distanceMiles) count += 1;
  if (filters.savedOnly) count += 1;
  if (filters.recentlyAdded && filters.recentlyAdded !== "any") count += 1;
  return count;
};

const SearchBar = ({ navRef }: SearchBarProps) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ShopSearchHit[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ShopFilters>({});

  const { addToast } = useToast();
  const {
    center,
    pendingCenterCoords,
    setShopId,
    setUserInteracted,
    flyToLocation,
  } = useMap();
  const { applyFilters } = useShops();
  const { openSidebar } = useShopSidebar();
  const { isAuthenticated } = useAuth();
  const { savedShopIds } = useSaved();

  const debounceTimer = useRef<number | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  const effectiveMapCenter = pendingCenterCoords ?? center ?? null;
  const savedShopIdList = useMemo(
    () => Array.from(savedShopIds),
    [savedShopIds],
  );

  const buildRuntimeFilters = (baseFilters: ShopFilters): ShopFilters => ({
    ...baseFilters,
    savedOnly: isAuthenticated ? baseFilters.savedOnly : false,
    savedShopIds: savedShopIdList,
  });

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(filters),
    [filters],
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof ShopFilters; label: string }> = [];

    if (filters.locationStatus && filters.locationStatus !== "any") {
      chips.push({
        key: "locationStatus",
        label: `Status: ${statusLabels[filters.locationStatus]}`,
      });
    }

    if (filters.categoryIds?.length) {
      chips.push({
        key: "categoryIds",
        label: `Categories: ${filters.categoryIds.length}`,
      });
    }

    if (filters.distanceMiles) {
      chips.push({
        key: "distanceMiles",
        label: `Within ${filters.distanceMiles} mi`,
      });
    }

    if (filters.savedOnly) {
      chips.push({ key: "savedOnly", label: "Saved only" });
    }

    if (filters.recentlyAdded && filters.recentlyAdded !== "any") {
      chips.push({
        key: "recentlyAdded",
        label: recentlyAddedLabels[filters.recentlyAdded],
      });
    }

    return chips;
  }, [filters]);

  const distanceNeedsRefresh =
    Boolean(filters.distanceMiles) &&
    coordsChanged(effectiveMapCenter, filters.distanceAnchor);

  const fetchSuggestions = (value: string, filtersOverride?: ShopFilters) => {
    const seq = ++requestSeq.current;
    const appliedFilters = buildRuntimeFilters(filtersOverride ?? filters);
    const trimmed = value.trim();

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = window.setTimeout(async () => {
      // Build search options with geo-bias if map center available
      const searchOptions: {
        limit: number;
        minQueryLength: number;
        geo?: { center: [number, number]; radiusKm: number; weight: number };
      } = {
        limit: SUGGESTION_LIMIT,
        minQueryLength: MIN_QUERY_LEN,
      };

      // Add geo-bias using map center for relevance ranking
      if (center && Array.isArray(center) && center.length === 2) {
        searchOptions.geo = {
          center: center as [number, number],
          radiusKm: 25,
          weight: 0.15,
        };
      }

      const results = await SearchShops(
        trimmed,
        { ...appliedFilters, search: trimmed },
        false,
        searchOptions,
      );

      if (seq === requestSeq.current) {
        setSuggestions(results);
      }
    }, DEBOUNCE_MS);
  };

  const onSuggestionsFetchRequested = ({ value }: { value: string }) =>
    fetchSuggestions(value);

  const onSuggestionsClearRequested = () => setSuggestions([]);

  const getSuggestionValue = (suggestion: ShopSearchHit) =>
    suggestion.shop.name;

  const renderSuggestion = (suggestion: ShopSearchHit) => {
    const location = suggestion.location;

    const street = buildStreetAddress(
      location.street_address,
      location.street_address_second,
    );
    const cityState = [location.city, location.state]
      .filter(Boolean)
      .join(", ");

    const addressDisplay =
      street && cityState
        ? `${street}, ${cityState}`
        : street || cityState || "Address not available";

    return (
      <div
        data-testid="search-suggestion"
        className="flex flex-col md:flex-row justify-between md:items-center p-2 rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-white/10"
      >
        <span className="font-medium">{suggestion.shop.name}</span>
        <span className="text-sm truncate md:ml-2">{addressDisplay}</span>
      </div>
    );
  };

  const handleSuggestionSelected = (
    _: React.FormEvent,
    { suggestion }: { suggestion: ShopSearchHit },
  ) => {
    const shop = suggestion.shop;
    const location = suggestion.location;

    const shopProps: ShopGeoJsonProperties = {
      shopId: shop.id,
      shopName: shop.name,
      description: shop.description,
      categories: (shop.categories ?? [])
        .map((cat) => cat.category_name)
        .join(","),
      categoryIds: (shop.categories ?? []).map((cat) => cat.id),
      createdBy: shop.created_by_username,
      address: buildStreetAddress(
        location.street_address,
        location.street_address_second,
      ),
      city: location.city,
      state: location.state,
      postalCode: location.postal_code,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    openSidebar(shopProps, null);

    flyToLocation(location.longitude, location.latitude, 16);
    setShopId(shop.id.toString());
    setUserInteracted(false);

    setSearch(shop.name);
  };

  const inputProps = {
    placeholder: "Search shops, city, category...",
    value: search,
    "data-testid": "search-input",
    onChange: (
      _: React.FormEvent<HTMLElement>,
      { newValue }: { newValue: string },
    ) => setSearch(newValue),
  };

  const handleFilterChange = async (updatedFilters: ShopFilters) => {
    const nextFilters: ShopFilters = { ...updatedFilters };

    if (nextFilters.distanceMiles) {
      nextFilters.distanceAnchor =
        nextFilters.distanceAnchor ?? effectiveMapCenter;
    } else {
      nextFilters.distanceAnchor = null;
    }

    if (!isAuthenticated) {
      nextFilters.savedOnly = false;
    }

    setFilters(nextFilters);

    const runtimeFilters = buildRuntimeFilters(nextFilters);

    const shops = await FilterShops(runtimeFilters, true);
    await applyFilters(shops);

    if (search.trim().length >= MIN_QUERY_LEN) {
      const searchOptions: {
        limit: number;
        minQueryLength: number;
        geo?: { center: [number, number]; radiusKm: number; weight: number };
      } = {
        limit: SUGGESTION_LIMIT,
        minQueryLength: MIN_QUERY_LEN,
      };

      if (center && Array.isArray(center) && center.length === 2) {
        searchOptions.geo = {
          center: center as [number, number],
          radiusKm: 25,
          weight: 0.15,
        };
      }

      const hits = await SearchShops(
        search,
        { ...runtimeFilters, search },
        false,
        searchOptions,
      );
      setSuggestions(hits);
    } else {
      setSuggestions([]);
    }

    if (shops.length === 0) {
      addToast("No shops found matching your filters.", "error");
      return;
    }

    addToast(`Showing ${shops.length} filtered shop(s).`, "success");
  };

  const handleRemoveFilter = (key: keyof ShopFilters) => {
    const next = { ...filters };

    if (key === "categoryIds") next.categoryIds = [];
    else if (key === "distanceMiles") {
      next.distanceMiles = null;
      next.distanceAnchor = null;
    } else if (key === "savedOnly") next.savedOnly = false;
    else if (key === "locationStatus") next.locationStatus = "any";
    else if (key === "recentlyAdded") next.recentlyAdded = "any";

    void handleFilterChange(next);
  };

  const handleClearFilters = () => {
    void handleFilterChange({});
  };

  const handleSearchThisArea = () => {
    if (!filters.distanceMiles || !effectiveMapCenter) return;
    void handleFilterChange({
      ...filters,
      distanceAnchor: effectiveMapCenter,
    });
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="relative shrink-0" data-filter-button>
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-controls="shop-filter-panel"
            aria-label="Toggle shop filters"
            onClick={() => setFilterOpen((o) => !o)}
            className="flex h-10 items-center gap-1 rounded-lg bg-brand-secondary px-3 py-2 text-gray-800 shadow transition hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary dark:hover:bg-white/20"
          >
            <HiFilter className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-semibold hidden sm:inline">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <FilterDropdown
            id="shop-filter-panel"
            open={filterOpen}
            navRef={navRef}
            filters={filters}
            savedOnlyDisabled={!isAuthenticated}
            distanceDisabled={!effectiveMapCenter}
            onFilterChange={handleFilterChange}
            onClose={() => setFilterOpen(false)}
          />
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
            <HiSearch
              className="w-5 h-5 text-text-muted dark:text-text-inverted"
              aria-hidden="true"
            />
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
                "w-full p-2 pl-10 text-sm text-text-base dark:text-text-inverted bg-surface-light dark:bg-surface-dark border border-surface-muted dark:border-gray-700 rounded-lg shadow-card focus: focus:border-0 focus:ring-brand-primary font-sans",
            }}
            theme={{
              container: "relative",
              suggestionsContainer:
                "absolute z-10 mt-2 w-full bg-surface-light dark:bg-surface-dark rounded-lg shadow-card max-h-72 overflow-auto",
              suggestion:
                "cursor-pointer px-3 py-2 text-text-base dark:text-text-inverted hover:bg-brand-primary dark:hover:bg-white/10 hover:text-white",
              suggestionHighlighted: "bg-brand-primary dark:bg-white/10",
            }}
          />
        </div>
      </div>

      {(activeFilterChips.length > 0 || distanceNeedsRefresh) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleRemoveFilter(chip.key)}
              className="rounded-full border border-brand-primary/40 bg-surface-light px-3 py-1 text-xs font-semibold text-text-base shadow-sm hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary dark:bg-surface-dark dark:text-text-inverted dark:hover:bg-surface-darker"
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}
              <span aria-hidden="true"> x</span>
            </button>
          ))}

          {distanceNeedsRefresh && (
            <button
              type="button"
              onClick={handleSearchThisArea}
              className="rounded-full bg-brand-secondary px-3 py-1 text-xs font-bold text-gray-900 shadow-sm hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              Search this area
            </button>
          )}

          {activeFilterChips.length > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-white underline underline-offset-2 hover:text-brand-secondary dark:text-text-inverted"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
