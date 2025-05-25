import React, { useState } from "react";
import Autosuggest from "react-autosuggest";
import {HiSearch } from "react-icons/hi";
import { SearchShops } from "../../services/search";
import { useMap } from "../../context/mapContext";
import { IndexedDBShop } from "@/services/indexedDB";

const LIMIT = 5;

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<IndexedDBShop[]>([]);
  const { setCenter, setShopId, setZoom, setUserInteracted } = useMap();

  const fetchSuggestions = async (value: string) => {
    if (value.trim() !== "") {
      try {
        const results = await SearchShops(value);
        setSuggestions(results.map((result) => result.shop).slice(0, LIMIT));
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const onSuggestionsFetchRequested = ({ value }: { value: string }) => {
    fetchSuggestions(value);
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion: IndexedDBShop) => suggestion.name;

  const renderSuggestion = (suggestion: IndexedDBShop) => {
    const location = suggestion.locations?.[0];
    const address = location
      ? `${location.street_address || ""}, ${location.city || ""}`
      : "Address not available";

    return (
      <div className="flex flex-col md:flex-row justify-between md:items-center p-2 hover:bg-primary  text-dark hover:text-white rounded-lg">
        <span className="font-medium  ">{suggestion.name}</span>
        <span className="text-sm   truncate md:ml-2">{address}</span>
      </div>
    );
  };

  const handleSuggestionSelected = (
    _: React.FormEvent,
    { suggestion }: { suggestion: IndexedDBShop },
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
      { newValue }: { newValue: string },
    ) => {
      setSearch(newValue);
    },
  };

  return (
    <div className="relative w-full flex items-center gap-2">
      {/* Filter Button */}
      {/* <button
        onClick={() => console.log("Open filter modal")}
        className="flex items-center px-3 py-2 bg-secondary text-accent rounded-lg shadow hover:bg-yellow-400 transition"
      >
        <HiFilter className="w-5 h-5 mr-1" />
        <span className="text-sm font-semibold hidden sm:inline">Filter</span>
      </button> */}

      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
          <HiSearch className="w-5 h-5 text-secondary" aria-hidden="true" />
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
              "w-full p-2 pl-10 text-sm text-accent bg-background border border-lightGray rounded-lg shadow-card focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none font-sans",
          }}
          theme={{
            container: "relative",
            suggestionsContainer:
              "absolute z-10 mt-2 w-full bg-background rounded-lg shadow-card",
            suggestion: "cursor-pointer px-3 py-2 bg-white text-background",
            suggestionHighlighted: "bg-white ",
          }}
        />
      </div>
    </div>
  );
};

export default SearchBar;
