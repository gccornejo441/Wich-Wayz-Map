import React, { useState } from "react";
import Autosuggest from "react-autosuggest";
import { HiFilter, HiSearch } from "react-icons/hi";
import { SearchShops } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { useShops } from "@/context/shopContext";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { IndexedDBShop } from "@/services/indexedDB";
import { FilterDropdown } from "../Filter/FilterDropdown";
import { ShopFilters } from "@/types/shopFilter";
import { useToast } from "@/context/toastContext";
import { ShopGeoJsonProperties } from "@/components/Map/MapBox";
import { buildStreetAddress } from "@utils/address";

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
  const { openSidebar } = useShopSidebar();

  const fetchSuggestions = async (
    value: string,
    filtersOverride?: ShopFilters,
  ) => {
    const appliedFilters = filtersOverride ?? filters;
    const results = await SearchShops(value, {
      ...appliedFilters,
      search: value,
    });
    setSuggestions(results.map((r) => r.shop));
  };

  const onSuggestionsFetchRequested = ({ value }: { value: string }) =>
    fetchSuggestions(value);

  const onSuggestionsClearRequested = () => setSuggestions([]);

  const getSuggestionValue = (suggestion: IndexedDBShop) => suggestion.name;

  const renderSuggestion = (suggestion: IndexedDBShop) => {
    const location = suggestion.locations?.[0];
    let addressDisplay = "Address not available";

    if (location) {
      const street = buildStreetAddress(
        location.street_address,
        location.street_address_second,
      );
      const cityState = [location.city, location.state]
        .filter(Boolean)
        .join(", ");

      if (street && cityState) {
        addressDisplay = `${street}, ${cityState}`;
      } else if (street) {
        addressDisplay = street;
      } else if (cityState) {
        addressDisplay = cityState;
      }
    }

    return (
      <div className="flex flex-col md:flex-row justify-between md:items-center p-2 rounded-lg text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-white/10">
        <span className="font-medium">{suggestion.name}</span>
        <span className="text-sm truncate md:ml-2">{addressDisplay}</span>
      </div>
    );
  };

  const handleSuggestionSelected = (
    _: React.FormEvent,
    { suggestion }: { suggestion: IndexedDBShop },
  ) => {
    const location = suggestion.locations?.[0];
    if (location) {
      // Transform IndexedDBShop to ShopGeoJsonProperties
      const shopProps: ShopGeoJsonProperties = {
        shopId: suggestion.id,
        shopName: suggestion.name,
        description: suggestion.description,
        categories: suggestion.categories
          .map((cat) => cat.category_name)
          .join(","),
        categoryIds: suggestion.categories.map((cat) => cat.id),
        createdBy: suggestion.created_by_username,
        // address should be ONLY street lines
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

      // Open the sidebar with the shop data
      openSidebar(shopProps, null);

      // Keep existing mapContext calls for potential future use
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
      { newValue }: { newValue: string },
    ) => setSearch(newValue),
  };

  const handleFilterChange = async (updatedFilters: ShopFilters) => {
    setFilters(updatedFilters);
    const results = await SearchShops(search, { ...updatedFilters, search });
    const shops = results.map((r) => r.shop);
    await applyFilters(shops);
    setSuggestions(shops);

    if (shops.length === 0) {
      addToast("No shops found matching your filters.", "error");
    } else {
      addToast(`Showing ${shops.length} filtered shop(s).`, "success");
    }

    const firstShop = shops[0];
    const firstLoc = firstShop?.locations?.[0];
    if (firstShop && firstLoc) {
      // Transform IndexedDBShop to ShopGeoJsonProperties
      const shopProps: ShopGeoJsonProperties = {
        shopId: firstShop.id,
        shopName: firstShop.name,
        description: firstShop.description,
        categories: firstShop.categories
          .map((cat) => cat.category_name)
          .join(","),
        categoryIds: firstShop.categories.map((cat) => cat.id),
        createdBy: firstShop.created_by_username,
        // address should be ONLY street lines
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

      // Open the sidebar with the shop data
      openSidebar(shopProps, null);

      // Keep existing mapContext calls for potential future use
      setCenter([firstLoc.longitude, firstLoc.latitude]);
      setZoom(13);
      setShopId(firstShop.id.toString());
      setUserInteracted(false);
    }
  };

  return (
    <div className="relative w-full flex items-center gap-2">
      {/* Filter Button */}
      <div className="relative hidden" data-filter-button>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center px-3 py-2 bg-brand-secondary text-gray-800   rounded-lg shadow hover:bg-yellow-400 dark:hover:bg-white/20 transition"
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
