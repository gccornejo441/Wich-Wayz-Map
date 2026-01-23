import React, { useEffect, useRef, useState } from "react";
import Autosuggest from "react-autosuggest";
import { HiFilter, HiSearch } from "react-icons/hi";
import { FilterShops, SearchShops, ShopSearchHit } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { FilterDropdown } from "../Filter/FilterDropdown";
import { ShopFilters } from "@/types/shopFilter";
import { useToast } from "@/context/toastContext";
import { ShopGeoJsonProperties } from "@/components/Map/MapBox";
import { buildStreetAddress } from "@utils/address";

interface SearchBarProps {
  navRef?: React.RefObject<HTMLElement>;
}

const MIN_QUERY_LEN = 2;
const SUGGESTION_LIMIT = 10;
const DEBOUNCE_MS = 200;

const SearchBar = ({ navRef }: SearchBarProps) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ShopSearchHit[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ShopFilters>({});

  const { addToast } = useToast();
  const { setCenter, setShopId, setZoom, setUserInteracted } = useMap();
  const { applyFilters } = useShops();
  const { openSidebar } = useShopSidebar();

  const debounceTimer = useRef<number | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchSuggestions = (value: string, filtersOverride?: ShopFilters) => {
    const seq = ++requestSeq.current;
    const appliedFilters = filtersOverride ?? filters;
    const trimmed = value.trim();

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = window.setTimeout(async () => {
      const results = await SearchShops(
        trimmed,
        { ...appliedFilters, search: trimmed },
        false,
        { limit: SUGGESTION_LIMIT, minQueryLength: MIN_QUERY_LEN },
      );

      if (seq === requestSeq.current) {
        setSuggestions(results);
      }
    }, DEBOUNCE_MS);
  };

  const onSuggestionsFetchRequested = ({ value }: { value: string }) =>
    fetchSuggestions(value);

  const onSuggestionsClearRequested = () => setSuggestions([]);

  const getSuggestionValue = (suggestion: ShopSearchHit) => suggestion.shop.name;

  const renderSuggestion = (suggestion: ShopSearchHit) => {
    const location = suggestion.location;

    const street = buildStreetAddress(
      location.street_address,
      location.street_address_second,
    );
    const cityState = [location.city, location.state].filter(Boolean).join(", ");

    const addressDisplay =
      street && cityState
        ? `${street}, ${cityState}`
        : street || cityState || "Address not available";

    return (
      <div className="flex flex-col md:flex-row justify-between md:items-center p-2 rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-white/10">
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

    setCenter([location.longitude, location.latitude]);
    setZoom(16);
    setShopId(shop.id.toString());
    setUserInteracted(false);

    setSearch(shop.name);
  };

  const inputProps = {
    placeholder: "Search shops, city, category...",
    value: search,
    onChange: (
      _: React.FormEvent<HTMLElement>,
      { newValue }: { newValue: string },
    ) => setSearch(newValue),
  };

  const handleFilterChange = async (updatedFilters: ShopFilters) => {
    setFilters(updatedFilters);

    const shops = await FilterShops(updatedFilters, true);
    await applyFilters(shops);

    if (search.trim().length >= MIN_QUERY_LEN) {
      const hits = await SearchShops(
        search,
        { ...updatedFilters, search },
        false,
        { limit: SUGGESTION_LIMIT, minQueryLength: MIN_QUERY_LEN },
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

    const firstShop = shops[0];
    const firstLoc = firstShop?.locations?.[0];

    if (firstShop && firstLoc) {
      const shopProps: ShopGeoJsonProperties = {
        shopId: firstShop.id,
        shopName: firstShop.name,
        description: firstShop.description,
        categories: (firstShop.categories ?? [])
          .map((cat) => cat.category_name)
          .join(","),
        categoryIds: (firstShop.categories ?? []).map((cat) => cat.id),
        createdBy: firstShop.created_by_username,
        address: buildStreetAddress(
          firstLoc.street_address,
          firstLoc.street_address_second,
        ),
        city: firstLoc.city,
        state: firstLoc.state,
        postalCode: firstLoc.postal_code,
        country: firstLoc.country,
        latitude: firstLoc.latitude,
        longitude: firstLoc.longitude,
      };

      openSidebar(shopProps, null);

      setCenter([firstLoc.longitude, firstLoc.latitude]);
      setZoom(13);
      setShopId(firstShop.id.toString());
      setUserInteracted(false);
    }
  };

  return (
    <div className="relative w-full flex items-center gap-2">
      <div className="relative hidden" data-filter-button>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center px-3 py-2 bg-brand-secondary text-gray-800 rounded-lg shadow hover:bg-yellow-400 dark:hover:bg-white/20 transition"
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
  );
};

export default SearchBar;
